// // src/modules/company/company.service.ts - WITH COMPREHENSIVE SIGNUP ANALYTICS
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Company } from './entities/company.entity';
import { ConsumedLead } from '../leads/entities/consumed-lead.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { S3Service } from '../chat/s3.service';
import { v4 as uuidv4 } from 'uuid';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LeadQuotaDetailsDto } from './dto/lead-quota-details.dto';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(ConsumedLead)
    private consumedLeadRepository: Repository<ConsumedLead>,
    private s3Service: S3Service,
  ) {}

  /**
   * 🔄 CRON JOB: Reset monthly lead consumption on the 1st of every month
   */
  @Cron('0 0 1 * *')
  async resetMonthlyQuotas() {
    console.log('🔄 Starting monthly quota reset...');
    
    const allCompanies = await this.companyRepository.find({
      where: { isDeleted: false },
    });

    for (const company of allCompanies) {
      company.leadQuota = 5;
      company.consumedLeads = 0;
      company.postedLeads = 0;
      
      await this.companyRepository.save(company);
      console.log(`✅ Reset quotas for company ${company.companyName} (${company.id})`);
    }

    console.log(`✅ Monthly reset complete for ${allCompanies.length} companies`);
  }

  /**
   * Generate signed URLs for S3 assets
   */
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

  /**
   * 📊 Get detailed lead quota information for a company
   */
  async getLeadQuotaDetails(companyId: string): Promise<LeadQuotaDetailsDto> {
    const company = await this.findOne(companyId);

    const now = new Date();
    const nextResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
    
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysUntilReset = Math.ceil((nextResetDate.getTime() - now.getTime()) / msPerDay);

    return {
      totalLeadQuota: company.leadQuota,
      consumedLeads: company.consumedLeads,
      remainingLeads: Math.max(0, company.leadQuota - company.consumedLeads),
      postingQuota: company.postingQuota,
      postedLeads: company.postedLeads,
      remainingPosts: Math.max(0, company.postingQuota - company.postedLeads),
      nextResetDate,
      daysUntilReset,
      referralCode: company.referralCode,
      referralInfo: 'Share your referral code to earn 2 bonus leads per successful referral! You start with 5 leads each month.',
    };
  }

  /**
   * Update company profile with file uploads
   */
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
      if (files?.userPhoto?.[0]) {
        if (company.userPhoto && this.s3Service.isS3Key(company.userPhoto)) {
          oldKeys.push(company.userPhoto);
        }
        updateCompanyDto.userPhoto = await this.s3Service.uploadUserPhoto(files.userPhoto[0]);
      } else {
        delete updateCompanyDto.userPhoto;
      }

      if (files?.logo?.[0]) {
        if (company.logo && this.s3Service.isS3Key(company.logo)) {
          oldKeys.push(company.logo);
        }
        updateCompanyDto.logo = await this.s3Service.uploadCompanyLogo(files.logo[0]);
      } else {
        delete updateCompanyDto.logo;
      }

      if (files?.coverImage?.[0]) {
        if (company.coverImage && this.s3Service.isS3Key(company.coverImage)) {
          oldKeys.push(company.coverImage);
        }
        updateCompanyDto.coverImage = await this.s3Service.uploadCoverImage(files.coverImage[0]);
      } else {
        delete updateCompanyDto.coverImage;
      }

      Object.assign(company, updateCompanyDto);
      const savedCompany = await this.companyRepository.save(company);

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
   * 🎁 Create a new company with referral bonus
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
    const leadQuota = 5;

    if (createCompanyDto.referredBy) {
      const referrer = await this.companyRepository.findOne({ 
        where: { referralCode: createCompanyDto.referredBy, isDeleted: false } 
      });
      
      if (referrer) {
        referrer.leadQuota += 2;
        await this.companyRepository.save(referrer);
        
        console.log(`🎁 Referral bonus applied: New user gets 5 leads, Referrer ${referrer.companyName} gets +2 leads (total: ${referrer.leadQuota})`);
      } else {
        console.log(`⚠️ Invalid referral code: ${createCompanyDto.referredBy}`);
      }
    }

    const company = this.companyRepository.create({
      ...createCompanyDto,
      referralCode,
      leadQuota,
      postingQuota: 30,
      consumedLeads: 0,
      postedLeads: 0,
    });
    
    return this.companyRepository.save(company);
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
  }

  async consumeLead(companyId: string): Promise<boolean> {
    const company = await this.findOne(companyId);
    
    if (company.consumedLeads >= company.leadQuota) {
      console.log(`❌ Company ${company.companyName} has exhausted monthly lead quota (${company.consumedLeads}/${company.leadQuota})`);
      return false;
    }
    
    await this.companyRepository.update(companyId, {
      consumedLeads: company.consumedLeads + 1,
    });
    
    console.log(`✅ Lead consumed by ${company.companyName}. Remaining: ${company.leadQuota - company.consumedLeads - 1}/${company.leadQuota}`);
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
    return `BIZ${uuidv4().substring(0, 6).toUpperCase()}`;
  }

  // ============================================
  // EXISTING ADMIN METRICS METHODS (UNCHANGED)
  // ============================================

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

  // ============================================
  // 📊 NEW COMPREHENSIVE SIGNUP ANALYTICS
  // ============================================

  /**
   * Helper: Parse date range with defaults
   */
  private getDateRange(startDate?: string, endDate?: string): { start: Date; end: Date } {
    const end = endDate ? new Date(endDate + 'T23:59:59.999Z') : new Date();
    const start = startDate ? new Date(startDate + 'T00:00:00.000Z') : new Date('2020-01-01');
    
    return { start, end };
  }

  /**
   * Helper: Get company summary for analytics
   */
  private getCompanySummary(company: Company) {
    return {
      id: company.id,
      companyName: company.companyName,
      phoneNumber: company.phoneNumber,
      category: company.category || 'Uncategorized',
      gstNumber: company.gstNumber,
      referralCode: company.referralCode,
      createdAt: company.createdAt,
    };
  }

  /**
   * 📅 Daily Signup Analytics
   */
  async getDailySignupAnalytics(startDate?: string, endDate?: string) {
    const { start, end } = this.getDateRange(startDate, endDate);

    const companies = await this.companyRepository.find({
      where: {
        isDeleted: false,
        createdAt: Between(start, end),
      },
      order: {
        createdAt: 'ASC',
      },
    });

    // Group by date
    const dailyMap = new Map<string, Company[]>();
    
    companies.forEach((company) => {
      const dateKey = company.createdAt.toISOString().split('T')[0];
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, []);
      }
      dailyMap.get(dateKey)!.push(company);
    });

    const dailyBreakdown = Array.from(dailyMap.entries())
      .map(([date, companiesList]) => ({
        date,
        count: companiesList.length,
        companies: companiesList.map((c) => this.getCompanySummary(c)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalSignups: companies.length,
      dateRange: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      },
      dailyBreakdown,
    };
  }

  /**
   * 📅 Weekly Signup Analytics
   */
  async getWeeklySignupAnalytics(startDate?: string, endDate?: string) {
    const { start, end } = this.getDateRange(startDate, endDate);

    const companies = await this.companyRepository.find({
      where: {
        isDeleted: false,
        createdAt: Between(start, end),
      },
      order: {
        createdAt: 'ASC',
      },
    });

    // Helper to get ISO week number
    const getWeekNumber = (date: Date): { year: number; week: number } => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      return { year: d.getUTCFullYear(), week: weekNo };
    };

    const getWeekDates = (year: number, week: number): { start: Date; end: Date } => {
      const jan4 = new Date(Date.UTC(year, 0, 4));
      const dayOfWeek = jan4.getUTCDay() || 7;
      const weekStart = new Date(jan4);
      weekStart.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
      return { start: weekStart, end: weekEnd };
    };

    // Group by week
    const weeklyMap = new Map<string, Company[]>();
    
    companies.forEach((company) => {
      const { year, week } = getWeekNumber(company.createdAt);
      const weekKey = `${year}-W${week.toString().padStart(2, '0')}`;
      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, []);
      }
      weeklyMap.get(weekKey)!.push(company);
    });

    const weeklyBreakdown = Array.from(weeklyMap.entries())
      .map(([weekKey, companiesList]) => {
        const [yearStr, weekStr] = weekKey.split('-W');
        const year = parseInt(yearStr);
        const weekNumber = parseInt(weekStr);
        const { start: weekStart, end: weekEnd } = getWeekDates(year, weekNumber);
        
        return {
          weekNumber,
          year,
          weekStart: weekStart.toISOString().split('T')[0],
          weekEnd: weekEnd.toISOString().split('T')[0],
          count: companiesList.length,
          companies: companiesList.map((c) => this.getCompanySummary(c)),
        };
      })
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.weekNumber - b.weekNumber;
      });

    return {
      totalSignups: companies.length,
      dateRange: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      },
      weeklyBreakdown,
    };
  }

  /**
   * 📅 Monthly Signup Analytics
   */
  async getMonthlySignupAnalytics(startDate?: string, endDate?: string) {
    const { start, end } = this.getDateRange(startDate, endDate);

    const companies = await this.companyRepository.find({
      where: {
        isDeleted: false,
        createdAt: Between(start, end),
      },
      order: {
        createdAt: 'ASC',
      },
    });

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Group by month
    const monthlyMap = new Map<string, Company[]>();
    
    companies.forEach((company) => {
      const year = company.createdAt.getFullYear();
      const month = company.createdAt.getMonth();
      const monthKey = `${year}-${(month + 1).toString().padStart(2, '0')}`;
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, []);
      }
      monthlyMap.get(monthKey)!.push(company);
    });

    const monthlyBreakdown = Array.from(monthlyMap.entries())
      .map(([monthKey, companiesList]) => {
        const [yearStr, monthStr] = monthKey.split('-');
        const year = parseInt(yearStr);
        const monthIndex = parseInt(monthStr) - 1;
        
        return {
          month: monthNames[monthIndex],
          year,
          monthYear: monthKey,
          count: companiesList.length,
          companies: companiesList.map((c) => this.getCompanySummary(c)),
        };
      })
      .sort((a, b) => a.monthYear.localeCompare(b.monthYear));

    return {
      totalSignups: companies.length,
      dateRange: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      },
      monthlyBreakdown,
    };
  }

  /**
   * 📅 Yearly Signup Analytics
   */
  async getYearlySignupAnalytics(startDate?: string, endDate?: string) {
    const { start, end } = this.getDateRange(startDate, endDate);

    const companies = await this.companyRepository.find({
      where: {
        isDeleted: false,
        createdAt: Between(start, end),
      },
      order: {
        createdAt: 'ASC',
      },
    });

    // Group by year
    const yearlyMap = new Map<number, Company[]>();
    
    companies.forEach((company) => {
      const year = company.createdAt.getFullYear();
      if (!yearlyMap.has(year)) {
        yearlyMap.set(year, []);
      }
      yearlyMap.get(year)!.push(company);
    });

    const yearlyBreakdown = Array.from(yearlyMap.entries())
      .map(([year, companiesList]) => ({
        year,
        count: companiesList.length,
        companies: companiesList.map((c) => this.getCompanySummary(c)),
      }))
      .sort((a, b) => a.year - b.year);

    return {
      totalSignups: companies.length,
      dateRange: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      },
      yearlyBreakdown,
    };
  }

  /**
   * 📊 Comprehensive Signup Summary
   */
  async getSignupSummary() {
    const now = new Date();
    
    // Today
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayCount = await this.companyRepository.count({
      where: {
        isDeleted: false,
        createdAt: MoreThanOrEqual(todayStart),
      },
    });
    
    // Yesterday
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayCount = await this.companyRepository.count({
      where: {
        isDeleted: false,
        createdAt: Between(yesterdayStart, todayStart),
      },
    });
    
    // This week
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const thisWeekCount = await this.companyRepository.count({
      where: {
        isDeleted: false,
        createdAt: MoreThanOrEqual(weekStart),
      },
    });
    
    // Last week
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekCount = await this.companyRepository.count({
      where: {
        isDeleted: false,
        createdAt: Between(lastWeekStart, weekStart),
      },
    });
    
    // This month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthCount = await this.companyRepository.count({
      where: {
        isDeleted: false,
        createdAt: MoreThanOrEqual(monthStart),
      },
    });
    
    // Last month
    const lastMonthStart = new Date(monthStart);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    const lastMonthCount = await this.companyRepository.count({
      where: {
        isDeleted: false,
        createdAt: Between(lastMonthStart, monthStart),
      },
    });
    
    // This year
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const thisYearCount = await this.companyRepository.count({
      where: {
        isDeleted: false,
        createdAt: MoreThanOrEqual(yearStart),
      },
    });
    
    // Last year
    const lastYearStart = new Date(yearStart);
    lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
    const lastYearCount = await this.companyRepository.count({
      where: {
        isDeleted: false,
        createdAt: Between(lastYearStart, yearStart),
      },
    });
    
    // All time
    const allTimeCount = await this.companyRepository.count({
      where: { isDeleted: false },
    });
    
    // Calculate growth percentages
    const calculateGrowth = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return parseFloat((((current - previous) / previous) * 100).toFixed(2));
    };
    
    return {
      today: {
        count: todayCount,
        growthPercent: calculateGrowth(todayCount, yesterdayCount),
      },
      thisWeek: {
        count: thisWeekCount,
        growthPercent: calculateGrowth(thisWeekCount, lastWeekCount),
      },
      thisMonth: {
        count: thisMonthCount,
        growthPercent: calculateGrowth(thisMonthCount, lastMonthCount),
      },
      thisYear: {
        count: thisYearCount,
        growthPercent: calculateGrowth(thisYearCount, lastYearCount),
      },
      allTime: {
        count: allTimeCount,
      },
    };
  }
}