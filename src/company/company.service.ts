// src/modules/company/company.service.ts - FIXED BUSINESS LOGIC
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan } from 'typeorm';
import { Company } from './entities/company.entity';
import { Subscription, SubscriptionTier, SubscriptionStatus } from './entities/subscription.entity';
import { PaymentHistory, PaymentType, PaymentStatus } from './entities/payment-history.entity';
import { ConsumedLead } from '../leads/entities/consumed-lead.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { RazorpayService } from './razorpay.service';
import { S3Service } from '../chat/s3.service';
import { v4 as uuidv4 } from 'uuid';
import { Cron, CronExpression } from '@nestjs/schedule';

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
    private s3Service: S3Service,
  ) {}

  /**
   * 🆕 CRON JOB: Check and expire subscriptions daily at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleSubscriptionExpiry() {
    console.log('Running subscription expiry check...');
    
    const now = new Date();
    const expiredSubscriptions = await this.subscriptionRepository.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: LessThan(now),
      },
    });

    for (const subscription of expiredSubscriptions) {
      await this.expireSubscription(subscription);
    }

    console.log(`Expired ${expiredSubscriptions.length} subscriptions`);
  }

  /**
   * 🆕 CRON JOB: Credit monthly free leads on the 1st of every month
   */
  @Cron('0 0 1 * *') // Run at midnight on the 1st of every month
  async creditMonthlyFreeLeads() {
    console.log('Crediting monthly free leads...');
    
    const allCompanies = await this.companyRepository.find({
      where: { isDeleted: false },
    });

    const freeLeadsPerMonth = 10;

    for (const company of allCompanies) {
      const currentPermanentQuota = company.permanentLeadQuota || company.leadQuota;
      
      // Add 10 free leads to permanent quota
      company.permanentLeadQuota = currentPermanentQuota + freeLeadsPerMonth;
      company.leadQuota = company.leadQuota + freeLeadsPerMonth;
      await this.companyRepository.save(company);

      // Update active subscription
      try {
        const subscription = await this.getActiveSubscription(company.id);
        const subPermanentQuota = subscription.permanentLeadQuota || subscription.leadQuota;
        subscription.permanentLeadQuota = subPermanentQuota + freeLeadsPerMonth;
        subscription.leadQuota = subscription.leadQuota + freeLeadsPerMonth;
        await this.subscriptionRepository.save(subscription);
      } catch (error) {
        console.error(`Failed to update subscription for company ${company.id}:`, error);
      }

      console.log(`Credited ${freeLeadsPerMonth} free leads to company ${company.id}`);
    }

    console.log(`Credited free leads to ${allCompanies.length} companies`);
  }

  /**
   * 🔧 FIXED: Expire a subscription and reset quotas
   */
  private async expireSubscription(subscription: Subscription): Promise<void> {
    // Mark subscription as expired
    subscription.status = SubscriptionStatus.EXPIRED;
    await this.subscriptionRepository.save(subscription);

    // Get company
    const company = await this.findOne(subscription.companyId);
    const currentPermanentQuota = company.permanentLeadQuota || company.leadQuota;

    // Calculate new quotas after expiry
    // Keep permanent quota (referral + pay-as-you-go + monthly free)
    // Remove subscription-specific quota
    const planDetails = this.razorpayService.getPlanDetails(subscription.tier);
    const subscriptionLeadQuota = subscription.subscriptionLeadQuota || planDetails.leadQuota;

    // New quota = permanent quota (what remains after removing subscription quota)
    company.leadQuota = currentPermanentQuota;
    company.currentTier = 'FREEMIUM';
    company.postingQuota = 30; // Reset to freemium posting quota
    company.hasVerifiedBadge = false;

    await this.companyRepository.save(company);

    // Create new FREEMIUM subscription
    await this.createFreemiumSubscription(company.id);

    console.log(`Subscription ${subscription.id} expired for company ${company.id}`);
  }

  async getCompanyWithSignedUrls(company: Company): Promise<any> {
    const companyObj: any = { ...company };
    
    if (company.logo) {
      companyObj.logo = await this.s3Service.getAccessibleUrl(company.logo) || company.logo;
    }
    
    if (company.userPhoto) {
      companyObj.userPhoto = await this.s3Service.getAccessibleUrl(company.userPhoto) || company.userPhoto;
    }
    
    if (company.coverImage) {
      companyObj.coverImage = await this.s3Service.getAccessibleUrl(company.coverImage) || company.coverImage;
    }
    
    return companyObj;
  }

  // async updateWithFiles(
  //   id: string,
  //   updateCompanyDto: UpdateCompanyDto,
  //   files?: {
  //     userPhoto?: Express.Multer.File[],
  //     logo?: Express.Multer.File[],
  //     coverImage?: Express.Multer.File[]
  //   }
  // ): Promise<Company> {
  //   const company = await this.findOne(id);
  //   const oldKeys: string[] = [];

  //   try {
  //     if (files?.userPhoto?.[0]) {
  //       if (company.userPhoto && this.s3Service.isS3Key(company.userPhoto)) {
  //         oldKeys.push(company.userPhoto);
  //       }
  //       updateCompanyDto.userPhoto = await this.s3Service.uploadUserPhoto(files.userPhoto[0]);
  //     }

  //     if (files?.logo?.[0]) {
  //       if (company.logo && this.s3Service.isS3Key(company.logo)) {
  //         oldKeys.push(company.logo);
  //       }
  //       updateCompanyDto.logo = await this.s3Service.uploadCompanyLogo(files.logo[0]);
  //     }

  //     if (files?.coverImage?.[0]) {
  //       if (company.coverImage && this.s3Service.isS3Key(company.coverImage)) {
  //         oldKeys.push(company.coverImage);
  //       }
  //       updateCompanyDto.coverImage = await this.s3Service.uploadCoverImage(files.coverImage[0]);
  //     }

  //     Object.assign(company, updateCompanyDto);
  //     const savedCompany = await this.companyRepository.save(company);

  //     for (const key of oldKeys) {
  //       try {
  //         await this.s3Service.deleteFile(key);
  //       } catch (error) {
  //         console.error(`Failed to delete old file ${key}:`, error);
  //       }
  //     }

  //     return savedCompany;
  //   } catch (error) {
  //     throw new BadRequestException(`Failed to update profile: ${error.message}`);
  //   }
  // }

  async updateWithFiles(
    id: string,
    updateCompanyDto: UpdateCompanyDto,
    files?: {
      userPhoto?: Express.Multer.File[],
      logo?: Express.Multer.File[],
      coverImage?: Express.Multer.File[]
    }
  ): Promise<Company> {
    const company = await this.findOne(id);
    const oldKeys: string[] = [];

    try {
      // Only update userPhoto if a new file is uploaded
      if (files?.userPhoto?.[0]) {
        if (company.userPhoto && this.s3Service.isS3Key(company.userPhoto)) {
          oldKeys.push(company.userPhoto);
        }
        updateCompanyDto.userPhoto = await this.s3Service.uploadUserPhoto(files.userPhoto[0]);
      } else {
        // Remove userPhoto from DTO to preserve existing value
        delete updateCompanyDto.userPhoto;
      }

      // Only update logo if a new file is uploaded
      if (files?.logo?.[0]) {
        if (company.logo && this.s3Service.isS3Key(company.logo)) {
          oldKeys.push(company.logo);
        }
        updateCompanyDto.logo = await this.s3Service.uploadCompanyLogo(files.logo[0]);
      } else {
        // Remove logo from DTO to preserve existing value
        delete updateCompanyDto.logo;
      }

      // Only update coverImage if a new file is uploaded
      if (files?.coverImage?.[0]) {
        if (company.coverImage && this.s3Service.isS3Key(company.coverImage)) {
          oldKeys.push(company.coverImage);
        }
        updateCompanyDto.coverImage = await this.s3Service.uploadCoverImage(files.coverImage[0]);
      } else {
        // Remove coverImage from DTO to preserve existing value
        delete updateCompanyDto.coverImage;
      }

      // Apply only the fields that were explicitly provided
      Object.assign(company, updateCompanyDto);
      const savedCompany = await this.companyRepository.save(company);

      // Delete old files from S3 after successful update
      for (const key of oldKeys) {
        try {
          await this.s3Service.deleteFile(key);
        } catch (error) {
          console.error(`Failed to delete old file ${key}:`, error);
        }
      }

      return savedCompany;
    } catch (error) {
      throw new BadRequestException(`Failed to update profile: ${error.message}`);
    }
  }

  /**
   * 🔧 FIXED: Create company with referral bonus
   */
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
    let permanentLeadQuota = 10; // Initial 10 free leads

    // 🆕 FIXED: Add referral bonus permanently
    if (createCompanyDto.referredBy) {
      const referrer = await this.companyRepository.findOne({ 
        where: { referralCode: createCompanyDto.referredBy } 
      });
      if (referrer) {
        permanentLeadQuota += 5; // Add 5 bonus leads permanently
        
        // 🆕 Credit referrer with 5 bonus leads permanently
        referrer.permanentLeadQuota = (referrer.permanentLeadQuota || referrer.leadQuota) + 5;
        referrer.leadQuota += 5;
        await this.companyRepository.save(referrer);

        // Update referrer's active subscription
        const referrerSubscription = await this.getActiveSubscription(referrer.id);
        referrerSubscription.permanentLeadQuota = (referrerSubscription.permanentLeadQuota || referrerSubscription.leadQuota) + 5;
        referrerSubscription.leadQuota += 5;
        await this.subscriptionRepository.save(referrerSubscription);
      }
    }

    const company = this.companyRepository.create({
      ...createCompanyDto,
      referralCode,
      leadQuota: permanentLeadQuota,
      permanentLeadQuota, // 🆕 Track permanent quota separately
      postingQuota: 30,
      currentTier: 'FREEMIUM',
      consumedLeads: 0,
      postedLeads: 0,
    });
    
    const savedCompany = await this.companyRepository.save(company);
    await this.createFreemiumSubscription(savedCompany.id);

    return savedCompany;
  }

  /**
   * 🔧 FIXED: Create freemium subscription with proper quota tracking
   */
  private async createFreemiumSubscription(companyId: string): Promise<Subscription> {
    const company = await this.findOne(companyId);
    const planDetails = this.razorpayService.getPlanDetails('FREEMIUM');
    
    const subscriptionData = {
      companyId,
      tier: SubscriptionTier.FREEMIUM,
      status: SubscriptionStatus.ACTIVE,
      leadQuota: company.leadQuota, // Use company's total quota
      permanentLeadQuota: company.permanentLeadQuota || company.leadQuota, // Track permanent quota
      subscriptionLeadQuota: 0, // Freemium has no subscription-specific quota
      postingQuota: planDetails.postingQuota,
      consumedLeads: company.consumedLeads || 0,
      postedLeads: company.postedLeads || 0,
      hasVerifiedBadge: false,
      hasVerifiedLeadAccess: false,
      startDate: new Date(),
    };
    
    // Don't set endDate for freemium (it will be undefined/null)
    const subscription = this.subscriptionRepository.create(subscriptionData);

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
    
    const timestamp = Date.now().toString().substring(5);
    const companyShort = companyId.substring(0, 8);
    const receipt = `sub_${companyShort}_${timestamp}`;
    
    const order = await this.razorpayService.createOrder(
      planDetails.price,
      'INR',
      receipt
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

  /**
   * 🔧 FIXED: Verify and activate subscription (ADD quota, don't replace)
   */
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

    // Get current company state
    const company = await this.findOne(companyId);
    const currentPermanentQuota = company.permanentLeadQuota || company.leadQuota;

    // Expire current subscription if not freemium
    const currentSubscription = await this.getActiveSubscription(companyId);
    if (currentSubscription.tier !== SubscriptionTier.FREEMIUM) {
      currentSubscription.status = SubscriptionStatus.EXPIRED;
      await this.subscriptionRepository.save(currentSubscription);
    } else {
      // Just mark freemium as expired
      await this.subscriptionRepository.update(
        { companyId, status: SubscriptionStatus.ACTIVE },
        { status: SubscriptionStatus.EXPIRED }
      );
    }

    // Get new plan details
    const planDetails = this.razorpayService.getPlanDetails(payment.subscriptionTier);
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    // 🆕 FIXED: ADD subscription quota to permanent quota
    const newLeadQuota = currentPermanentQuota + planDetails.leadQuota;

    // Create new subscription
    const subscriptionData = {
      companyId,
      tier: payment.subscriptionTier as SubscriptionTier,
      status: SubscriptionStatus.ACTIVE,
      razorpayPaymentId: paymentId,
      razorpayOrderId: orderId,
      startDate,
      endDate,
      leadQuota: newLeadQuota, // Total quota
      permanentLeadQuota: currentPermanentQuota, // Track permanent separately
      subscriptionLeadQuota: planDetails.leadQuota, // Track subscription quota
      postingQuota: planDetails.postingQuota,
      consumedLeads: company.consumedLeads || 0, // Preserve consumed count
      postedLeads: company.postedLeads || 0, // Preserve posted count
      hasVerifiedBadge: planDetails.hasVerifiedBadge,
      hasVerifiedLeadAccess: planDetails.hasVerifiedLeadAccess,
    };

    const subscription = this.subscriptionRepository.create(subscriptionData);
    const savedSubscription = await this.subscriptionRepository.save(subscription);

    // 🆕 FIXED: Update company with ADDED quota
    await this.companyRepository.update(companyId, {
      currentTier: payment.subscriptionTier,
      leadQuota: newLeadQuota, // ADD to existing, don't replace
      postingQuota: planDetails.postingQuota,
      hasVerifiedBadge: planDetails.hasVerifiedBadge,
    });

    return savedSubscription;
  }

  /**
   * 🔧 FIXED: Pay-as-you-go adds to permanent quota
   */
  async createPayAsYouGoOrder(companyId: string, leadsCount: number): Promise<any> {
    const amount = this.razorpayService.calculatePayAsYouGoAmount(leadsCount);
    
    const timestamp = Date.now().toString().substring(5);
    const companyShort = companyId.substring(0, 8);
    const receipt = `payg_${companyShort}_${timestamp}`;
    
    const order = await this.razorpayService.createOrder(
      amount,
      'INR',
      receipt
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

  /**
   * 🔧 FIXED: Pay-as-you-go adds to PERMANENT quota
   */
  async verifyAndAddPayAsYouGoLeads(
    companyId: string,
    orderId: string,
    paymentId: string,
    signature: string,
  ): Promise<{ leadQuota: number; consumedLeads: number; permanentLeadQuota: number }> {
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
    const currentPermanentQuota = company.permanentLeadQuota || company.leadQuota;
    
    // 🆕 FIXED: Add to permanent quota
    const newPermanentQuota = currentPermanentQuota + payment.leadsCredits;
    const newTotalQuota = company.leadQuota + payment.leadsCredits;

    await this.companyRepository.update(companyId, { 
      leadQuota: newTotalQuota,
      permanentLeadQuota: newPermanentQuota,
    });

    const subscription = await this.getActiveSubscription(companyId);
    const subPermanentQuota = subscription.permanentLeadQuota || subscription.leadQuota;
    subscription.leadQuota = subscription.leadQuota + payment.leadsCredits;
    subscription.permanentLeadQuota = subPermanentQuota + payment.leadsCredits;
    await this.subscriptionRepository.save(subscription);

    return {
      leadQuota: newTotalQuota,
      permanentLeadQuota: newPermanentQuota,
      consumedLeads: company.consumedLeads || 0,
    };
  }

  /**
   * 🔧 FIXED: Admin add leads - adds to permanent quota
   */
  async adminAddLeads(companyId: string, leadsCount: number, notes?: string): Promise<any> {
    const company = await this.findOne(companyId);
    const currentPermanentQuota = company.permanentLeadQuota || company.leadQuota;
    
    const newPermanentQuota = currentPermanentQuota + leadsCount;
    const newTotalQuota = company.leadQuota + leadsCount;

    await this.companyRepository.update(companyId, { 
      leadQuota: newTotalQuota,
      permanentLeadQuota: newPermanentQuota,
    });

    const subscription = await this.getActiveSubscription(companyId);
    const subPermanentQuota = subscription.permanentLeadQuota || subscription.leadQuota;
    subscription.leadQuota = subscription.leadQuota + leadsCount;
    subscription.permanentLeadQuota = subPermanentQuota + leadsCount;
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
      newQuota: newTotalQuota,
      permanentQuota: newPermanentQuota,
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

  /**
   * 🔧 FIXED: Consume lead synchronizes Company and Subscription
   */
  async consumeLead(companyId: string): Promise<boolean> {
    const company = await this.findOne(companyId);
    if (company.consumedLeads >= company.leadQuota) {
      return false;
    }
    
    const newConsumedCount = company.consumedLeads + 1;
    
    await this.companyRepository.update(companyId, {
      consumedLeads: newConsumedCount,
    });

    const subscription = await this.getActiveSubscription(companyId);
    subscription.consumedLeads = newConsumedCount;
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
    
    try {
      if (company.logo && this.s3Service.isS3Key(company.logo)) {
        await this.s3Service.deleteFile(company.logo);
      }
      if (company.userPhoto && this.s3Service.isS3Key(company.userPhoto)) {
        await this.s3Service.deleteFile(company.userPhoto);
      }
      if (company.coverImage && this.s3Service.isS3Key(company.coverImage)) {
        await this.s3Service.deleteFile(company.coverImage);
      }
    } catch (error) {
      console.error('Error deleting S3 assets:', error);
    }
    
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