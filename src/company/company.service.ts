// src/modules/company/company.service.ts (Updated with Subscription)
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Company } from './entities/company.entity';
import { Subscription, SubscriptionTier, SubscriptionStatus } from './entities/subscription.entity';
import { PaymentHistory, PaymentType, PaymentStatus } from './entities/payment-history.entity';
import { ConsumedLead } from '../leads/entities/consumed-lead.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { RazorpayService } from './razorpay.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(ConsumedLead)
    private consumedLeadRepository: Repository<ConsumedLead>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(PaymentHistory)
    private paymentHistoryRepository: Repository<PaymentHistory>,
    private razorpayService: RazorpayService,
  ) {}

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    const existingGst = await this.companyRepository.findOne({
      where: { gstNumber: createCompanyDto.gstNumber, isDeleted: false },
    });
    if (existingGst) {
      throw new BadRequestException('GST number already registered');
    }

    const existingPhone = await this.companyRepository.findOne({
      where: { phoneNumber: createCompanyDto.phoneNumber, isDeleted: false },
    });
    if (existingPhone) {
      throw new BadRequestException('Phone number already registered');
    }

    const referralCode = this.generateReferralCode();
    let leadQuota = 10;

    if (createCompanyDto.referralCode) {
      const referrer = await this.companyRepository.findOne({ 
        where: { referralCode: createCompanyDto.referralCode } 
      });
      if (referrer) {
        leadQuota += 5;
      }
    }

    const company = this.companyRepository.create({
      ...createCompanyDto,
      referralCode,
      leadQuota,
      postingQuota: 30,
      currentTier: 'FREEMIUM',
    });
    
    const savedCompany = await this.companyRepository.save(company);

    // Create initial freemium subscription
    await this.createFreemiumSubscription(savedCompany.id);

    return savedCompany;
  }

  private async createFreemiumSubscription(companyId: string): Promise<Subscription> {
    const planDetails = this.razorpayService.getPlanDetails('FREEMIUM');
    
    const subscription = this.subscriptionRepository.create({
      companyId,
      tier: SubscriptionTier.FREEMIUM,
      status: SubscriptionStatus.ACTIVE,
      leadQuota: planDetails.leadQuota,
      postingQuota: planDetails.postingQuota,
      consumedLeads: 0,
      postedLeads: 0,
      hasVerifiedBadge: false,
      hasVerifiedLeadAccess: false,
      startDate: new Date(),
    });

    return this.subscriptionRepository.save(subscription);
  }

  async getActiveSubscription(companyId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { companyId, status: SubscriptionStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });

    if (!subscription) {
      return await this.createFreemiumSubscription(companyId);
    }

    return subscription;
  }

  async createSubscriptionOrder(companyId: string, tier: SubscriptionTier): Promise<any> {
    if (tier === SubscriptionTier.FREEMIUM) {
      throw new BadRequestException('Cannot purchase freemium tier');
    }

    const planDetails = this.razorpayService.getPlanDetails(tier);
    const order = await this.razorpayService.createOrder(
      planDetails.price,
      'INR',
      `sub_${companyId}_${Date.now()}`
    );

    const payment = this.paymentHistoryRepository.create({
      companyId,
      paymentType: PaymentType.SUBSCRIPTION,
      status: PaymentStatus.PENDING,
      amount: planDetails.price / 100,
      razorpayOrderId: order.id,
      subscriptionTier: tier,
      leadsCredits: planDetails.leadQuota,
      description: `${tier} subscription purchase`,
    });

    await this.paymentHistoryRepository.save(payment);

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      planDetails,
    };
  }

  async verifyAndActivateSubscription(
    companyId: string,
    orderId: string,
    paymentId: string,
    signature: string,
  ): Promise<Subscription> {
    const isValid = this.razorpayService.verifyPaymentSignature(orderId, paymentId, signature);
    
    if (!isValid) {
      throw new BadRequestException('Invalid payment signature');
    }

    const payment = await this.paymentHistoryRepository.findOne({
      where: { razorpayOrderId: orderId, companyId },
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    payment.status = PaymentStatus.SUCCESS;
    payment.razorpayPaymentId = paymentId;
    payment.razorpaySignature = signature;
    await this.paymentHistoryRepository.save(payment);

    // Deactivate current subscription
    await this.subscriptionRepository.update(
      { companyId, status: SubscriptionStatus.ACTIVE },
      { status: SubscriptionStatus.EXPIRED }
    );

    // Create new subscription
    const planDetails = this.razorpayService.getPlanDetails(payment.subscriptionTier);
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const subscription = this.subscriptionRepository.create({
      companyId,
      tier: payment.subscriptionTier as SubscriptionTier,
      status: SubscriptionStatus.ACTIVE,
      razorpayPaymentId: paymentId,
      razorpayOrderId: orderId,
      startDate,
      endDate,
      leadQuota: planDetails.leadQuota,
      postingQuota: planDetails.postingQuota,
      consumedLeads: 0,
      postedLeads: 0,
      hasVerifiedBadge: planDetails.hasVerifiedBadge,
      hasVerifiedLeadAccess: planDetails.hasVerifiedLeadAccess,
    });

    const savedSubscription = await this.subscriptionRepository.save(subscription);

    // Update company
    await this.companyRepository.update(companyId, {
      currentTier: payment.subscriptionTier,
      leadQuota: planDetails.leadQuota,
      consumedLeads: 0,
      postingQuota: planDetails.postingQuota,
      postedLeads: 0,
      hasVerifiedBadge: planDetails.hasVerifiedBadge,
    });

    return savedSubscription;
  }

  async createPayAsYouGoOrder(companyId: string, leadsCount: number): Promise<any> {
    const amount = this.razorpayService.calculatePayAsYouGoAmount(leadsCount);
    const order = await this.razorpayService.createOrder(
      amount,
      'INR',
      `payg_${companyId}_${Date.now()}`
    );

    const payment = this.paymentHistoryRepository.create({
      companyId,
      paymentType: PaymentType.PAY_AS_YOU_GO,
      status: PaymentStatus.PENDING,
      amount: amount / 100,
      razorpayOrderId: order.id,
      leadsCredits: leadsCount,
      description: `Pay-as-you-go: ${leadsCount} leads`,
    });

    await this.paymentHistoryRepository.save(payment);

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      leadsCount,
      pricePerLead: 49,
    };
  }

  async verifyAndAddPayAsYouGoLeads(
    companyId: string,
    orderId: string,
    paymentId: string,
    signature: string,
  ): Promise<{ leadQuota: number; consumedLeads: number }> {
    const isValid = this.razorpayService.verifyPaymentSignature(orderId, paymentId, signature);
    
    if (!isValid) {
      throw new BadRequestException('Invalid payment signature');
    }

    const payment = await this.paymentHistoryRepository.findOne({
      where: { razorpayOrderId: orderId, companyId },
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    payment.status = PaymentStatus.SUCCESS;
    payment.razorpayPaymentId = paymentId;
    payment.razorpaySignature = signature;
    await this.paymentHistoryRepository.save(payment);

    const company = await this.findOne(companyId);
    const newQuota = company.leadQuota + payment.leadsCredits;

    await this.companyRepository.update(companyId, { leadQuota: newQuota });

    const subscription = await this.getActiveSubscription(companyId);
    subscription.leadQuota = newQuota;
    await this.subscriptionRepository.save(subscription);

    return {
      leadQuota: newQuota,
      consumedLeads: company.consumedLeads,
    };
  }

  async adminAddLeads(companyId: string, leadsCount: number, notes?: string): Promise<any> {
    const company = await this.findOne(companyId);
    const newQuota = company.leadQuota + leadsCount;

    await this.companyRepository.update(companyId, { leadQuota: newQuota });

    const subscription = await this.getActiveSubscription(companyId);
    subscription.leadQuota = newQuota;
    await this.subscriptionRepository.save(subscription);

    const payment = this.paymentHistoryRepository.create({
      companyId,
      paymentType: PaymentType.ADMIN_CREDIT,
      status: PaymentStatus.SUCCESS,
      amount: 0,
      leadsCredits: leadsCount,
      description: `Admin credited ${leadsCount} leads`,
      adminNotes: notes,
    });

    await this.paymentHistoryRepository.save(payment);

    return {
      companyId,
      previousQuota: company.leadQuota,
      addedLeads: leadsCount,
      newQuota,
      notes,
    };
  }

  async getPaymentHistory(companyId: string): Promise<PaymentHistory[]> {
    return this.paymentHistoryRepository.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
  }

  async getAllPaymentHistory(): Promise<PaymentHistory[]> {
    return this.paymentHistoryRepository.find({
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });
  }

  async getSubscriptionHistory(companyId: string): Promise<Subscription[]> {
    return this.subscriptionRepository.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
  }

  async canPostLead(companyId: string): Promise<boolean> {
    const company = await this.findOne(companyId);
    return company.postedLeads < company.postingQuota;
  }

  async incrementPostedLeads(companyId: string): Promise<void> {
    const company = await this.findOne(companyId);
    await this.companyRepository.update(companyId, {
      postedLeads: company.postedLeads + 1,
    });

    const subscription = await this.getActiveSubscription(companyId);
    subscription.postedLeads += 1;
    await this.subscriptionRepository.save(subscription);
  }

  async consumeLead(companyId: string): Promise<boolean> {
    const company = await this.findOne(companyId);
    if (company.consumedLeads >= company.leadQuota) {
      return false;
    }
    
    await this.companyRepository.update(companyId, {
      consumedLeads: company.consumedLeads + 1,
    });

    const subscription = await this.getActiveSubscription(companyId);
    subscription.consumedLeads += 1;
    await this.subscriptionRepository.save(subscription);
    
    return true;
  }

  async getConsumedLeads(companyId: string): Promise<any[]> {
    return this.consumedLeadRepository
      .createQueryBuilder('consumedLead')
      .leftJoinAndSelect('consumedLead.lead', 'lead')
      .leftJoinAndSelect('lead.company', 'leadOwnerCompany')
      .where('consumedLead.companyId = :companyId', { companyId })
      .andWhere('lead.isDeleted = :isDeleted', { isDeleted: false })
      .orderBy('consumedLead.consumedAt', 'DESC')
      .getMany();
  }

  async findAll(): Promise<Company[]> {
    return this.companyRepository.find({
      where: { isDeleted: false },
      relations: ['leads', 'products', 'followers'],
    });
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['leads', 'products', 'followers', 'following'],
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return company;
  }

  async findByPhone(phoneNumber: string): Promise<Company | null> {
    return this.companyRepository.findOne({
      where: { phoneNumber, isDeleted: false },
    });
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<Company> {
    const company = await this.findOne(id);
    Object.assign(company, updateCompanyDto);
    return this.companyRepository.save(company);
  }
  
  async updateLastLoginDate(companyId: string): Promise<void> {
    await this.companyRepository.update(companyId, { lastLoginDate: new Date() });
  }

  async remove(id: string): Promise<void> {
    const company = await this.findOne(id);
    await this.companyRepository.update(id, { isDeleted: true });
  }

  private generateReferralCode(): string {
    return uuidv4().substring(0, 8).toUpperCase();
  }

  async getDailyActiveUsers(): Promise<number> {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return this.companyRepository.count({
      where: {
        lastLoginDate: Between(yesterday, today),
      },
    });
  }

  async getWeeklyActiveUsers(): Promise<number> {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    return this.companyRepository.count({
      where: {
        lastLoginDate: Between(lastWeek, today),
      },
    });
  }

  async getMonthlyActiveUsers(): Promise<number> {
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setMonth(today.getMonth() - 1);
    return this.companyRepository.count({
      where: {
        lastLoginDate: Between(lastMonth, today),
      },
    });
  }
  
  async getCompaniesByCategory(): Promise<any[]> {
    return this.companyRepository
      .createQueryBuilder('company')
      .select('company.category as category')
      .addSelect('COUNT(*) as count')
      .where('company.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('company.category IS NOT NULL')
      .groupBy('category')
      .orderBy('count', 'DESC')
      .getRawMany();
  }
  
  async getTotalRegisteredCompanies(): Promise<number> {
    return this.companyRepository.count({ where: { isDeleted: false } });
  }

  async getNewSignupsPerMonth(): Promise<any[]> {
    return this.companyRepository
      .createQueryBuilder('company')
      .select("TO_CHAR(company.createdAt, 'YYYY-MM') as month")
      .addSelect('COUNT(*)', 'count')
      .where('company.isDeleted = :isDeleted', { isDeleted: false })
      .groupBy('month')
      .orderBy('month', 'ASC')
      .getRawMany();
  }

  async getProfileCompletionPercentage(): Promise<number> {
    const totalCompanies = await this.companyRepository.count({ where: { isDeleted: false } });
    if (totalCompanies === 0) {
      return 0;
    }

    const companies = await this.companyRepository.find({
      where: { isDeleted: false },
      select: [
        'companyName',
        'logo',
        'address',
        'description',
        'category',
        'userName',
        'userPhoto',
        'coverImage',
        'registeredAddress',
        'about',
        'operationalAddress',
      ],
    });

    let completedProfiles = 0;
    const profileFields = [
      'companyName',
      'logo',
      'address',
      'description',
      'category',
      'userName',
      'userPhoto',
      'coverImage',
      'registeredAddress',
      'about',
      'operationalAddress',
    ];

    companies.forEach((company) => {
      let filledFields = 0;
      profileFields.forEach((field) => {
        if (company[field]) {
          filledFields++;
        }
      });
      if (filledFields / profileFields.length >= 0.5) { 
        completedProfiles++;
      }
    });

    return (completedProfiles / totalCompanies) * 100;
  }
  
  async getCompanyProfileCompletion(id: string): Promise<number> {
    const company = await this.companyRepository.findOne({
      where: { id, isDeleted: false },
      select: [
        'companyName',
        'logo',
        'address',
        'description',
        'category',
        'userName',
        'userPhoto',
        'coverImage',
        'registeredAddress',
        'about',
        'operationalAddress',
      ],
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const profileFields = [
      'companyName',
      'logo',
      'address',
      'description',
      'category',
      'userName',
      'userPhoto',
      'coverImage',
      'registeredAddress',
      'about',
      'operationalAddress',
    ];

    let filledFields = 0;
    profileFields.forEach((field) => {
      if (company[field]) {
        filledFields++;
      }
    });

    return (filledFields / profileFields.length) * 100;
  }

  async getSubscriptionStats(): Promise<any> {
    const stats = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .select('subscription.tier', 'tier')
      .addSelect('COUNT(*)', 'count')
      .where('subscription.status = :status', { status: SubscriptionStatus.ACTIVE })
      .groupBy('subscription.tier')
      .getRawMany();

    return stats;
  }
}