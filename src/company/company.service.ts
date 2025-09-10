
// // src/modules/company/company.service.ts
// import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository, Between } from 'typeorm';
// import { Company } from './entities/company.entity';
// import { CreateCompanyDto } from './dto/create-company.dto';
// import { UpdateCompanyDto } from './dto/update-company.dto';
// import { v4 as uuidv4 } from 'uuid';

// @Injectable()
// export class CompanyService {
//   constructor(
//     @InjectRepository(Company)
//     private companyRepository: Repository<Company>,
//   ) {}

//   async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
//     // Check if GST already exists
//     const existingGst = await this.companyRepository.findOne({
//       where: { gstNumber: createCompanyDto.gstNumber, isDeleted: false },
//     });
//     if (existingGst) {
//       throw new BadRequestException('GST number already registered');
//     }

//     // Check if phone number already exists
//     const existingPhone = await this.companyRepository.findOne({
//       where: { phoneNumber: createCompanyDto.phoneNumber, isDeleted: false },
//     });
//     if (existingPhone) {
//       throw new BadRequestException('Phone number already registered');
//     }

//     const referralCode = this.generateReferralCode();
//     let leadQuota = 10;

//     // Handle referral bonus
//     if (createCompanyDto.referralCode) {
//       const referrer = await this.companyRepository.findOne({ where: { referralCode: createCompanyDto.referralCode } });
//       if (referrer) {
//         leadQuota += 5;
//       }
//     }

//     const company = this.companyRepository.create({
//       ...createCompanyDto,
//       referralCode,
//       leadQuota,
//     });
//     return this.companyRepository.save(company);
//   }

//   async findAll(): Promise<Company[]> {
//     return this.companyRepository.find({
//       where: { isDeleted: false },
//       relations: ['leads', 'products', 'followers'],
//     });
//   }

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

//   async findByPhone(phoneNumber: string): Promise<Company | null> {
//     return this.companyRepository.findOne({
//       where: { phoneNumber, isDeleted: false },
//     });
//   }

//   async update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<Company> {
//     const company = await this.findOne(id);
//     Object.assign(company, updateCompanyDto);
//     return this.companyRepository.save(company);
//   }
  
//   async updateLastLoginDate(companyId: string): Promise<void> {
//     await this.companyRepository.update(companyId, { lastLoginDate: new Date() });
//   }

//   async remove(id: string): Promise<void> {
//     const company = await this.findOne(id);
//     await this.companyRepository.update(id, { isDeleted: true });
//   }

//   async consumeLead(companyId: string): Promise<boolean> {
//     const company = await this.findOne(companyId);
//     if (company.consumedLeads >= company.leadQuota) {
//       return false;
//     }
    
//     await this.companyRepository.update(companyId, {
//       consumedLeads: company.consumedLeads + 1,
//     });
//     return true;
//   }

//   private generateReferralCode(): string {
//     return uuidv4().substring(0, 8).toUpperCase();
//   }

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
//       // Assuming a profile is "complete" if more than 50% of the key fields are filled.
//       // This threshold can be adjusted based on business logic.
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

// src/modules/company/company.service.ts - Updated with getConsumedLeads method
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Company } from './entities/company.entity';
import { ConsumedLead } from '../leads/entities/consumed-lead.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(ConsumedLead)
    private consumedLeadRepository: Repository<ConsumedLead>,
  ) {}

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    // Check if GST already exists
    const existingGst = await this.companyRepository.findOne({
      where: { gstNumber: createCompanyDto.gstNumber, isDeleted: false },
    });
    if (existingGst) {
      throw new BadRequestException('GST number already registered');
    }

    // Check if phone number already exists
    const existingPhone = await this.companyRepository.findOne({
      where: { phoneNumber: createCompanyDto.phoneNumber, isDeleted: false },
    });
    if (existingPhone) {
      throw new BadRequestException('Phone number already registered');
    }

    const referralCode = this.generateReferralCode();
    let leadQuota = 10;

    // Handle referral bonus
    if (createCompanyDto.referralCode) {
      const referrer = await this.companyRepository.findOne({ where: { referralCode: createCompanyDto.referralCode } });
      if (referrer) {
        leadQuota += 5;
      }
    }

    const company = this.companyRepository.create({
      ...createCompanyDto,
      referralCode,
      leadQuota,
    });
    return this.companyRepository.save(company);
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

  async consumeLead(companyId: string): Promise<boolean> {
    const company = await this.findOne(companyId);
    if (company.consumedLeads >= company.leadQuota) {
      return false;
    }
    
    await this.companyRepository.update(companyId, {
      consumedLeads: company.consumedLeads + 1,
    });
    return true;
  }

  /**
   * Get all leads consumed by a specific company
   * Returns the consumed leads with their details and consumption date
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
      // Assuming a profile is "complete" if more than 50% of the key fields are filled.
      // This threshold can be adjusted based on business logic.
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