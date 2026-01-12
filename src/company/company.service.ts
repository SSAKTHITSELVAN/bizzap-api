// // src/modules/company/company.service.ts - Updated with monthly lead consumption reset
// import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository, Between } from 'typeorm';
// import { Company } from './entities/company.entity';
// import { ConsumedLead } from '../leads/entities/consumed-lead.entity';
// import { CreateCompanyDto } from './dto/create-company.dto';
// import { UpdateCompanyDto } from './dto/update-company.dto';
// import { S3Service } from '../chat/s3.service';
// import { v4 as uuidv4 } from 'uuid';
// import { Cron, CronExpression } from '@nestjs/schedule';
// import { LeadQuotaDetailsDto } from './dto/lead-quota-details.dto';

// @Injectable()
// export class CompanyService {
//   constructor(
//     @InjectRepository(Company)
//     private companyRepository: Repository<Company>,
//     @InjectRepository(ConsumedLead)
//     private consumedLeadRepository: Repository<ConsumedLead>,
//     private s3Service: S3Service,
//   ) {}

//   /**
//    * 🔄 CRON JOB: Reset monthly lead consumption on the 1st of every month
//    * - Reset leadQuota to 5 (base monthly allowance)
//    * - Reset consumedLeads to 0
//    * - Keep postedLeads reset as before
//    */
//   @Cron('0 0 1 * *') // Run at midnight on the 1st of every month
//   async resetMonthlyQuotas() {
//     console.log('🔄 Starting monthly quota reset...');
    
//     const allCompanies = await this.companyRepository.find({
//       where: { isDeleted: false },
//     });

//     for (const company of allCompanies) {
//       // ✅ Reset lead consumption to base 5 leads per month
//       company.leadQuota = 5;
//       company.consumedLeads = 0;
      
//       // Reset posted leads counter
//       company.postedLeads = 0;
      
//       await this.companyRepository.save(company);
//       console.log(`✅ Reset quotas for company ${company.companyName} (${company.id})`);
//     }

//     console.log(`✅ Monthly reset complete for ${allCompanies.length} companies`);
//   }

//   /**
//    * Generate signed URLs for S3 assets
//    */
//   async getCompanyWithSignedUrls(company: Company): Promise<any> {
//     const companyObj: any = { ...company };
    
//     if (company.logo) {
//       companyObj.logo = await this.s3Service.getAccessibleUrl(company.logo) || company.logo;
//     }
    
//     if (company.userPhoto) {
//       companyObj.userPhoto = await this.s3Service.getAccessibleUrl(company.userPhoto) || company.userPhoto;
//     }
    
//     if (company.coverImage) {
//       companyObj.coverImage = await this.s3Service.getAccessibleUrl(company.coverImage) || company.coverImage;
//     }
    
//     return companyObj;
//   }

//   /**
//    * 📊 Get detailed lead quota information for a company
//    */
//   async getLeadQuotaDetails(companyId: string): Promise<LeadQuotaDetailsDto> {
//     const company = await this.findOne(companyId);

//     // Calculate next reset date (1st of next month at 00:00)
//     const now = new Date();
//     const nextResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
    
//     // Calculate days until reset
//     const msPerDay = 24 * 60 * 60 * 1000;
//     const daysUntilReset = Math.ceil((nextResetDate.getTime() - now.getTime()) / msPerDay);

//     return {
//       totalLeadQuota: company.leadQuota,
//       consumedLeads: company.consumedLeads,
//       remainingLeads: Math.max(0, company.leadQuota - company.consumedLeads),
//       postingQuota: company.postingQuota,
//       postedLeads: company.postedLeads,
//       remainingPosts: Math.max(0, company.postingQuota - company.postedLeads),
//       nextResetDate,
//       daysUntilReset,
//       referralCode: company.referralCode,
//       referralInfo: 'Share your referral code to earn 2 bonus leads per successful referral! You start with 5 leads each month.',
//     };
//   }

//   /**
//    * Update company profile with file uploads
//    */
//   async updateWithFiles(
//     id: string,
//     updateCompanyDto: UpdateCompanyDto,
//     files?: {
//       userPhoto?: Express.Multer.File[],
//       logo?: Express.Multer.File[],
//       coverImage?: Express.Multer.File[]
//     }
//   ): Promise<Company> {
//     const company = await this.findOne(id);
//     const oldKeys: string[] = [];

//     try {
//       if (files?.userPhoto?.[0]) {
//         if (company.userPhoto && this.s3Service.isS3Key(company.userPhoto)) {
//           oldKeys.push(company.userPhoto);
//         }
//         updateCompanyDto.userPhoto = await this.s3Service.uploadUserPhoto(files.userPhoto[0]);
//       } else {
//         delete updateCompanyDto.userPhoto;
//       }

//       if (files?.logo?.[0]) {
//         if (company.logo && this.s3Service.isS3Key(company.logo)) {
//           oldKeys.push(company.logo);
//         }
//         updateCompanyDto.logo = await this.s3Service.uploadCompanyLogo(files.logo[0]);
//       } else {
//         delete updateCompanyDto.logo;
//       }

//       if (files?.coverImage?.[0]) {
//         if (company.coverImage && this.s3Service.isS3Key(company.coverImage)) {
//           oldKeys.push(company.coverImage);
//         }
//         updateCompanyDto.coverImage = await this.s3Service.uploadCoverImage(files.coverImage[0]);
//       } else {
//         delete updateCompanyDto.coverImage;
//       }

//       Object.assign(company, updateCompanyDto);
//       const savedCompany = await this.companyRepository.save(company);

//       for (const key of oldKeys) {
//         try {
//           await this.s3Service.deleteFile(key);
//         } catch (error) {
//           console.error(`Failed to delete old file ${key}:`, error);
//         }
//       }

//       return savedCompany;
//     } catch (error) {
//       throw new BadRequestException(`Failed to update profile: ${error.message}`);
//     }
//   }

//   /**
//    * 🎁 Create a new company with referral bonus
//    * - New user gets 5 base leads + 2 bonus leads if referred = 7 leads
//    * - Referrer gets +2 leads added to their current month quota
//    */
//   async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
//     // Check if GST or phone number already exists
//     const existingGst = await this.companyRepository.findOne({
//       where: { gstNumber: createCompanyDto.gstNumber, isDeleted: false },
//     });
//     if (existingGst) {
//       throw new BadRequestException('GST number already registered');
//     }

//     const existingPhone = await this.companyRepository.findOne({
//       where: { phoneNumber: createCompanyDto.phoneNumber, isDeleted: false },
//     });
//     if (existingPhone) {
//       throw new BadRequestException('Phone number already registered');
//     }

//     const referralCode = this.generateReferralCode();
//     let leadQuota = 5; // Base 5 leads per month

//     // Handle referral bonus
//     if (createCompanyDto.referredBy) {
//       const referrer = await this.companyRepository.findOne({ 
//         where: { referralCode: createCompanyDto.referredBy, isDeleted: false } 
//       });
      
//       if (referrer) {
//         // ✅ Add 2 bonus leads to new user (5 base + 2 bonus = 7 total)
//         leadQuota = 7;
        
//         // ✅ Add 2 bonus leads to referrer's current month quota
//         referrer.leadQuota += 2;
//         await this.companyRepository.save(referrer);
        
//         console.log(`🎁 Referral bonus applied: New user gets 7 leads (5+2), Referrer ${referrer.companyName} gets +2 leads`);
//       } else {
//         console.log(`⚠️ Invalid referral code: ${createCompanyDto.referredBy}`);
//       }
//     }

//     const company = this.companyRepository.create({
//       ...createCompanyDto,
//       referralCode,
//       leadQuota,
//       postingQuota: 30,
//       consumedLeads: 0,
//       postedLeads: 0,
//     });
    
//     return this.companyRepository.save(company);
//   }

//   /**
//    * Check if company can post more leads
//    */
//   async canPostLead(companyId: string): Promise<boolean> {
//     const company = await this.findOne(companyId);
//     return company.postedLeads < company.postingQuota;
//   }

//   /**
//    * Increment posted leads counter
//    */
//   async incrementPostedLeads(companyId: string): Promise<void> {
//     const company = await this.findOne(companyId);
//     await this.companyRepository.update(companyId, {
//       postedLeads: company.postedLeads + 1,
//     });
//   }

//   /**
//    * 🔑 Consume a lead (deduct from monthly quota)
//    * Returns false if no leads available
//    */
//   async consumeLead(companyId: string): Promise<boolean> {
//     const company = await this.findOne(companyId);
    
//     // ✅ Check if company has leads remaining this month
//     if (company.consumedLeads >= company.leadQuota) {
//       console.log(`❌ Company ${company.companyName} has exhausted monthly lead quota (${company.consumedLeads}/${company.leadQuota})`);
//       return false; // No leads available
//     }
    
//     // ✅ Deduct 1 lead from available quota
//     await this.companyRepository.update(companyId, {
//       consumedLeads: company.consumedLeads + 1,
//     });
    
//     console.log(`✅ Lead consumed by ${company.companyName}. Remaining: ${company.leadQuota - company.consumedLeads - 1}/${company.leadQuota}`);
//     return true;
//   }

//   /**
//    * Get all consumed leads for a company
//    */
//   async getConsumedLeads(companyId: string): Promise<any[]> {
//     return this.consumedLeadRepository
//       .createQueryBuilder('consumedLead')
//       .leftJoinAndSelect('consumedLead.lead', 'lead')
//       .leftJoinAndSelect('lead.company', 'leadOwnerCompany')
//       .where('consumedLead.companyId = :companyId', { companyId })
//       .andWhere('lead.isDeleted = :isDeleted', { isDeleted: false })
//       .orderBy('consumedLead.consumedAt', 'DESC')
//       .getMany();
//   }

//   /**
//    * Find all companies
//    */
//   async findAll(): Promise<Company[]> {
//     return this.companyRepository.find({
//       where: { isDeleted: false },
//       relations: ['leads', 'products', 'followers'],
//     });
//   }

//   /**
//    * Find one company by ID
//    */
//   async findOne(id: string): Promise<Company> {
//     const company = await this.companyRepository.findOne({
//       where: { id, isDeleted: false },
//       relations: ['leads', 'products', 'followers', 'following'],
//     });
//     if (!company) {
//       throw new NotFoundException('Company not found');
//     }
//     return company;
//   }

//   /**
//    * Find company by phone number
//    */
//   async findByPhone(phoneNumber: string): Promise<Company | null> {
//     return this.companyRepository.findOne({
//       where: { phoneNumber, isDeleted: false },
//     });
//   }

//   /**
//    * Update company profile
//    */
//   async update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<Company> {
//     const company = await this.findOne(id);
//     Object.assign(company, updateCompanyDto);
//     return this.companyRepository.save(company);
//   }
  
//   /**
//    * Update last login date
//    */
//   async updateLastLoginDate(companyId: string): Promise<void> {
//     await this.companyRepository.update(companyId, { lastLoginDate: new Date() });
//   }

//   /**
//    * Soft delete a company
//    */
//   async remove(id: string): Promise<void> {
//     const company = await this.findOne(id);
    
//     try {
//       if (company.logo && this.s3Service.isS3Key(company.logo)) {
//         await this.s3Service.deleteFile(company.logo);
//       }
//       if (company.userPhoto && this.s3Service.isS3Key(company.userPhoto)) {
//         await this.s3Service.deleteFile(company.userPhoto);
//       }
//       if (company.coverImage && this.s3Service.isS3Key(company.coverImage)) {
//         await this.s3Service.deleteFile(company.coverImage);
//       }
//     } catch (error) {
//       console.error('Error deleting S3 assets:', error);
//     }
    
//     await this.companyRepository.update(id, { isDeleted: true });
//   }

//   /**
//    * Generate unique referral code
//    */
//   private generateReferralCode(): string {
//     return `BIZ${uuidv4().substring(0, 6).toUpperCase()}`;
//   }

//   // ============================================
//   // ADMIN METRICS METHODS
//   // ============================================

//   async getDailyActiveUsers(): Promise<number> {
//     const today = new Date();
//     const yesterday = new Date(today);
//     yesterday.setDate(today.getDate() - 1);
//     return this.companyRepository.count({
//       where: {
//         lastLoginDate: Between(yesterday, today),
//       },
//     });
//   }

//   async getWeeklyActiveUsers(): Promise<number> {
//     const today = new Date();
//     const lastWeek = new Date(today);
//     lastWeek.setDate(today.getDate() - 7);
//     return this.companyRepository.count({
//       where: {
//         lastLoginDate: Between(lastWeek, today),
//       },
//     });
//   }

//   async getMonthlyActiveUsers(): Promise<number> {
//     const today = new Date();
//     const lastMonth = new Date(today);
//     lastMonth.setMonth(today.getMonth() - 1);
//     return this.companyRepository.count({
//       where: {
//         lastLoginDate: Between(lastMonth, today),
//       },
//     });
//   }
  
//   async getCompaniesByCategory(): Promise<any[]> {
//     return this.companyRepository
//       .createQueryBuilder('company')
//       .select('company.category as category')
//       .addSelect('COUNT(*) as count')
//       .where('company.isDeleted = :isDeleted', { isDeleted: false })
//       .andWhere('company.category IS NOT NULL')
//       .groupBy('category')
//       .orderBy('count', 'DESC')
//       .getRawMany();
//   }
  
//   async getTotalRegisteredCompanies(): Promise<number> {
//     return this.companyRepository.count({ where: { isDeleted: false } });
//   }

//   async getNewSignupsPerMonth(): Promise<any[]> {
//     return this.companyRepository
//       .createQueryBuilder('company')
//       .select("TO_CHAR(company.createdAt, 'YYYY-MM') as month")
//       .addSelect('COUNT(*)', 'count')
//       .where('company.isDeleted = :isDeleted', { isDeleted: false })
//       .groupBy('month')
//       .orderBy('month', 'ASC')
//       .getRawMany();
//   }

//   async getProfileCompletionPercentage(): Promise<number> {
//     const totalCompanies = await this.companyRepository.count({ where: { isDeleted: false } });
//     if (totalCompanies === 0) {
//       return 0;
//     }

//     const companies = await this.companyRepository.find({
//       where: { isDeleted: false },
//       select: [
//         'companyName',
//         'logo',
//         'address',
//         'description',
//         'category',
//         'userName',
//         'userPhoto',
//         'coverImage',
//         'registeredAddress',
//         'about',
//         'operationalAddress',
//       ],
//     });

//     let completedProfiles = 0;
//     const profileFields = [
//       'companyName',
//       'logo',
//       'address',
//       'description',
//       'category',
//       'userName',
//       'userPhoto',
//       'coverImage',
//       'registeredAddress',
//       'about',
//       'operationalAddress',
//     ];

//     companies.forEach((company) => {
//       let filledFields = 0;
//       profileFields.forEach((field) => {
//         if (company[field]) {
//           filledFields++;
//         }
//       });
//       if (filledFields / profileFields.length >= 0.5) { 
//         completedProfiles++;
//       }
//     });

//     return (completedProfiles / totalCompanies) * 100;
//   }
  
//   async getCompanyProfileCompletion(id: string): Promise<number> {
//     const company = await this.companyRepository.findOne({
//       where: { id, isDeleted: false },
//       select: [
//         'companyName',
//         'logo',
//         'address',
//         'description',
//         'category',
//         'userName',
//         'userPhoto',
//         'coverImage',
//         'registeredAddress',
//         'about',
//         'operationalAddress',
//       ],
//     });

//     if (!company) {
//       throw new NotFoundException('Company not found');
//     }

//     const profileFields = [
//       'companyName',
//       'logo',
//       'address',
//       'description',
//       'category',
//       'userName',
//       'userPhoto',
//       'coverImage',
//       'registeredAddress',
//       'about',
//       'operationalAddress',
//     ];

//     let filledFields = 0;
//     profileFields.forEach((field) => {
//       if (company[field]) {
//         filledFields++;
//       }
//     });

//     return (filledFields / profileFields.length) * 100;
//   }
// }


// src/modules/company/company.service.ts - Updated referral logic
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
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
   * - Reset leadQuota to 5 (base monthly allowance)
   * - Reset consumedLeads to 0
   * - Keep postedLeads reset as before
   */
  @Cron('0 0 1 * *') // Run at midnight on the 1st of every month
  async resetMonthlyQuotas() {
    console.log('🔄 Starting monthly quota reset...');
    
    const allCompanies = await this.companyRepository.find({
      where: { isDeleted: false },
    });

    for (const company of allCompanies) {
      // ✅ Reset lead consumption to base 5 leads per month
      company.leadQuota = 5;
      company.consumedLeads = 0;
      
      // Reset posted leads counter
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

    // Calculate next reset date (1st of next month at 00:00)
    const now = new Date();
    const nextResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
    
    // Calculate days until reset
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
   * - New user always gets 5 base leads (no bonus)
   * - Referrer gets +2 leads added to their current month quota
   */
  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    // Check if GST or phone number already exists
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
    const leadQuota = 5; // ✅ All new users start with 5 leads (no bonus for new user)

    // Handle referral bonus - ONLY for the referrer
    if (createCompanyDto.referredBy) {
      const referrer = await this.companyRepository.findOne({ 
        where: { referralCode: createCompanyDto.referredBy, isDeleted: false } 
      });
      
      if (referrer) {
        // ✅ Add 2 bonus leads ONLY to referrer's current month quota
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
      leadQuota, // Always 5 for new users
      postingQuota: 30,
      consumedLeads: 0,
      postedLeads: 0,
    });
    
    return this.companyRepository.save(company);
  }

  /**
   * Check if company can post more leads
   */
  async canPostLead(companyId: string): Promise<boolean> {
    const company = await this.findOne(companyId);
    return company.postedLeads < company.postingQuota;
  }

  /**
   * Increment posted leads counter
   */
  async incrementPostedLeads(companyId: string): Promise<void> {
    const company = await this.findOne(companyId);
    await this.companyRepository.update(companyId, {
      postedLeads: company.postedLeads + 1,
    });
  }

  /**
   * 🔒 Consume a lead (deduct from monthly quota)
   * Returns false if no leads available
   */
  async consumeLead(companyId: string): Promise<boolean> {
    const company = await this.findOne(companyId);
    
    // ✅ Check if company has leads remaining this month
    if (company.consumedLeads >= company.leadQuota) {
      console.log(`❌ Company ${company.companyName} has exhausted monthly lead quota (${company.consumedLeads}/${company.leadQuota})`);
      return false; // No leads available
    }
    
    // ✅ Deduct 1 lead from available quota
    await this.companyRepository.update(companyId, {
      consumedLeads: company.consumedLeads + 1,
    });
    
    console.log(`✅ Lead consumed by ${company.companyName}. Remaining: ${company.leadQuota - company.consumedLeads - 1}/${company.leadQuota}`);
    return true;
  }

  /**
   * Get all consumed leads for a company
   */
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

  /**
   * Find all companies
   */
  async findAll(): Promise<Company[]> {
    return this.companyRepository.find({
      where: { isDeleted: false },
      relations: ['leads', 'products', 'followers'],
    });
  }

  /**
   * Find one company by ID
   */
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

  /**
   * Find company by phone number
   */
  async findByPhone(phoneNumber: string): Promise<Company | null> {
    return this.companyRepository.findOne({
      where: { phoneNumber, isDeleted: false },
    });
  }

  /**
   * Update company profile
   */
  async update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<Company> {
    const company = await this.findOne(id);
    Object.assign(company, updateCompanyDto);
    return this.companyRepository.save(company);
  }
  
  /**
   * Update last login date
   */
  async updateLastLoginDate(companyId: string): Promise<void> {
    await this.companyRepository.update(companyId, { lastLoginDate: new Date() });
  }

  /**
   * Soft delete a company
   */
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

  /**
   * Generate unique referral code
   */
  private generateReferralCode(): string {
    return `BIZ${uuidv4().substring(0, 6).toUpperCase()}`;
  }

  // ============================================
  // ADMIN METRICS METHODS
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
}