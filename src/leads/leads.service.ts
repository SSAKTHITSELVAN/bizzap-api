// src/modules/leads/leads.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Lead } from './entities/lead.entity';
import { ConsumedLead } from './entities/consumed-lead.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { CompanyService } from '../company/company.service';
import { S3Service } from '../chat/s3.service';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    @InjectRepository(ConsumedLead)
    private readonly consumedLeadRepository: Repository<ConsumedLead>,
    private readonly companyService: CompanyService,
    private readonly s3Service: S3Service,
  ) {}

  async create(
    companyId: string, 
    createLeadDto: CreateLeadDto, 
    imageFile?: Express.Multer.File
  ): Promise<Lead> {
    const leadData: Partial<Lead> = {
      ...createLeadDto,
      companyId,
    };

    // Handle image upload to S3
    if (imageFile) {
      try {
        const uploadResult = await this.s3Service.uploadFile(imageFile, 'lead-images');
        leadData.imageKey = uploadResult.key;
        leadData.imageName = imageFile.originalname;
        leadData.imageSize = uploadResult.size;
        leadData.imageMimeType = uploadResult.mimeType;
      } catch (error) {
        console.error('Failed to upload lead image:', error);
        throw new Error(`Failed to upload image: ${error.message}`);
      }
    }

    const lead = this.leadRepository.create(leadData);
    const savedLead = await this.leadRepository.save(lead);
    
    // Generate signed URL for response
    if (savedLead.imageKey) {
      try {
        savedLead.imageUrl = await this.s3Service.generateSignedUrl(savedLead.imageKey);
      } catch (error) {
        console.error('Failed to generate signed URL:', error);
      }
    }
    
    return savedLead;
  }

  async findAll(): Promise<Lead[]> {
    const leads = await this.leadRepository.find({
      where: { isDeleted: false, isActive: true },
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });

    return await this.attachImageUrls(leads);
  }

  async findByCompany(companyId: string): Promise<Lead[]> {
    const leads = await this.leadRepository.find({
      where: { companyId, isDeleted: false },
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });

    return await this.attachImageUrls(leads);
  }

  async findActiveByCompany(companyId: string): Promise<Lead[]> {
    const leads = await this.leadRepository.find({
      where: { companyId, isDeleted: false, isActive: true },
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });
    return await this.attachImageUrls(leads);
  }

  async findInactiveByCompany(companyId: string): Promise<Lead[]> {
    const leads = await this.leadRepository.find({
      where: { companyId, isDeleted: false, isActive: false },
      relations: ['company'],
      order: { updatedAt: 'DESC' },
    });
    return await this.attachImageUrls(leads);
  }

  async findOne(id: string): Promise<Lead> {
    const lead = await this.leadRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['company'],
    });
    
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }
    
    // Increment view count
    lead.viewCount += 1;
    const updatedLead = await this.leadRepository.save(lead);

    // Generate signed URL for image
    if (updatedLead.imageKey) {
      try {
        updatedLead.imageUrl = await this.s3Service.generateSignedUrl(updatedLead.imageKey);
      } catch (error) {
        console.error(`Failed to generate signed URL for lead ${updatedLead.id}:`, error);
      }
    }

    return updatedLead;
  }

  async update(
    id: string, 
    companyId: string, 
    updateLeadDto: UpdateLeadDto,
    imageFile?: Express.Multer.File
  ): Promise<Lead> {
    const lead = await this.leadRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['company'],
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (lead.companyId !== companyId) {
      throw new ForbiddenException('You can only update your own leads');
    }

    // Handle new image upload
    if (imageFile) {
      // Delete old image from S3 if exists
      if (lead.imageKey) {
        try {
          await this.s3Service.deleteFile(lead.imageKey);
        } catch (error) {
          console.error('Failed to delete old lead image:', error);
        }
      }

      // Upload new image
      try {
        const uploadResult = await this.s3Service.uploadFile(imageFile, 'lead-images');
        lead.imageKey = uploadResult.key;
        lead.imageName = imageFile.originalname;
        lead.imageSize = uploadResult.size;
        lead.imageMimeType = uploadResult.mimeType;
      } catch (error) {
        throw new Error(`Failed to upload new image: ${error.message}`);
      }
    }

    // Update other fields
    Object.assign(lead, updateLeadDto);
    
    const updatedLead = await this.leadRepository.save(lead);

    // Generate signed URL for image
    if (updatedLead.imageKey) {
      try {
        updatedLead.imageUrl = await this.s3Service.generateSignedUrl(updatedLead.imageKey);
      } catch (error) {
        console.error('Failed to generate signed URL:', error);
      }
    }

    return updatedLead;
  }

  async toggleActiveStatus(id: string, companyId: string, isActive: boolean): Promise<Lead> {
    const lead = await this.leadRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['company'],
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (lead.companyId !== companyId) {
      throw new ForbiddenException('You can only update your own leads');
    }

    lead.isActive = isActive;
    
    // Clear reason when reactivating
    if (isActive) {
      lead.reasonForDeactivation = undefined;
    }
    
    const savedLead = await this.leadRepository.save(lead);
    
    // Generate signed URL for image
    if (savedLead.imageKey) {
      try {
        savedLead.imageUrl = await this.s3Service.generateSignedUrl(savedLead.imageKey);
      } catch (error) {
        console.error('Failed to generate signed URL:', error);
      }
    }
    
    return savedLead;
  }

  async deactivateLeadWithReason(id: string, companyId: string, reason?: string): Promise<Lead> {
    const lead = await this.leadRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['company'],
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (lead.companyId !== companyId) {
      throw new ForbiddenException('You can only update your own leads');
    }
    
    lead.isActive = false;
    lead.reasonForDeactivation = reason;
    
    const savedLead = await this.leadRepository.save(lead);
    
    // Generate signed URL for image
    if (savedLead.imageKey) {
      try {
        savedLead.imageUrl = await this.s3Service.generateSignedUrl(savedLead.imageKey);
      } catch (error) {
        console.error('Failed to generate signed URL:', error);
      }
    }
    
    return savedLead;
  }

  async remove(id: string, companyId: string): Promise<void> {
    const lead = await this.leadRepository.findOne({
      where: { id, isDeleted: false },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    // Admin bypass: empty companyId means admin delete
    if (companyId && lead.companyId !== companyId) {
      throw new ForbiddenException('You can only delete your own leads');
    }

    // Delete image from S3
    if (lead.imageKey) {
      try {
        await this.s3Service.deleteFile(lead.imageKey);
      } catch (error) {
        console.error('Failed to delete lead image from S3:', error);
        // Continue with soft delete even if S3 deletion fails
      }
    }

    // Soft delete
    await this.leadRepository.update(id, { isDeleted: true });
  }

  async getLeadImageUrl(leadId: string): Promise<string> {
    const lead = await this.leadRepository.findOne({
      where: { id: leadId, isDeleted: false },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (!lead.imageKey) {
      throw new NotFoundException('No image associated with this lead');
    }

    return this.s3Service.generateSignedUrl(lead.imageKey, 3600);
  }

  async consumeLead(leadId: string, consumerCompanyId: string): Promise<{ success: boolean; contact?: string }> {
    const lead = await this.findOne(leadId);

    if (lead.companyId === consumerCompanyId) {
      throw new ForbiddenException('Cannot consume your own lead');
    }

    // Check if already consumed
    const hasConsumed = await this.consumedLeadRepository.findOne({
      where: { companyId: consumerCompanyId, leadId },
    });
    
    if (hasConsumed) {
      return {
        success: true,
        contact: lead.company.phoneNumber,
      };
    }

    const canConsume = await this.companyService.consumeLead(consumerCompanyId);
    if (!canConsume) {
      return { success: false };
    }

    // Update consumed count
    lead.consumedCount = lead.consumedCount + 1;
    await this.leadRepository.save(lead);
    
    const consumedRecord = this.consumedLeadRepository.create({
      companyId: consumerCompanyId,
      leadId: leadId
    });
    await this.consumedLeadRepository.save(consumedRecord);

    return {
      success: true,
      contact: lead.company.phoneNumber,
    };
  }

  // Helper method to attach signed URLs to leads
  private async attachImageUrls(leads: Lead[]): Promise<Lead[]> {
    const leadsWithUrls = await Promise.all(
      leads.map(async (lead) => {
        if (lead.imageKey) {
          try {
            lead.imageUrl = await this.s3Service.generateSignedUrl(lead.imageKey);
          } catch (error) {
            console.error(`Failed to generate signed URL for lead ${lead.id}:`, error);
          }
        }
        return lead;
      })
    );
    return leadsWithUrls;
  }
  
  // ============================================================
  // ADMIN METRICS METHODS
  // ============================================================

  async getAllDeactivatedLeads(): Promise<{inactive: Lead[], deleted: Lead[]}> {
    const inactiveLeads = await this.getInactiveLeads();
    const deletedLeads = await this.getDeletedLeads();
    
    return {
      inactive: inactiveLeads,
      deleted: deletedLeads,
    };
  }

  async getInactiveLeads(): Promise<Lead[]> {
    const leads = await this.leadRepository.find({
      where: { isDeleted: false, isActive: false },
      relations: ['company'],
      order: { updatedAt: 'DESC' },
    });
    return await this.attachImageUrls(leads);
  }

  async getDeletedLeads(): Promise<Lead[]> {
    const leads = await this.leadRepository.find({
      where: { isDeleted: true },
      relations: ['company'],
      order: { updatedAt: 'DESC' },
    });
    return leads;
  }

  async getInactiveLeadsByReason(): Promise<any[]> {
    const results = await this.leadRepository
      .createQueryBuilder('lead')
      .select([
        'COALESCE(lead.reasonForDeactivation, \'No reason provided\') as reason',
        'COUNT(*) as count',
        'ARRAY_AGG(lead.id) as leadIds'
      ])
      .where('lead.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('lead.isActive = :isActive', { isActive: false })
      .groupBy('lead.reasonForDeactivation')
      .orderBy('count', 'DESC')
      .getRawMany();
    return results;
  }

  async getDeactivatedLeads(): Promise<Lead[]> {
    return this.getInactiveLeads();
  }

  async getDeactivatedLeadsByReason(): Promise<any[]> {
    return this.getInactiveLeadsByReason();
  }
  
  async getLeadCountByDate(): Promise<any[]> {
    const results = await this.leadRepository
      .createQueryBuilder('lead')
      .select("DATE(lead.createdAt) as date")
      .addSelect("COUNT(*) as count")
      .where("lead.isDeleted = :isDeleted", { isDeleted: false })
      .groupBy("date")
      .orderBy("date", "DESC")
      .getRawMany();
    return results;
  }

  async getLeadCountByMonth(): Promise<any[]> {
    const results = await this.leadRepository
      .createQueryBuilder('lead')
      .select("TO_CHAR(lead.createdAt, 'YYYY-MM') as month")
      .addSelect("COUNT(*) as count")
      .where("lead.isDeleted = :isDeleted", { isDeleted: false })
      .groupBy("month")
      .orderBy("month", "DESC")
      .getRawMany();
    return results;
  }
  
  async getTotalLeadCount(): Promise<number> {
    const count = await this.leadRepository.count({ where: { isDeleted: false } });
    return count;
  }

  async getTotalActiveLeads(): Promise<number> {
    const count = await this.leadRepository.count({ where: { isDeleted: false, isActive: true } });
    return count;
  }
  
  async getTotalConsumedLeads(): Promise<number> {
    const result = await this.leadRepository
      .createQueryBuilder('lead')
      .select("SUM(lead.consumedCount)", "totalConsumed")
      .where("lead.isDeleted = :isDeleted", { isDeleted: false })
      .getRawOne();
    return parseInt(result?.totalConsumed || '0', 10);
  }

  async getMostConsumedLeads(limit: number = 10): Promise<Lead[]> {
    const leads = await this.leadRepository.find({
      where: { isDeleted: false },
      order: { consumedCount: 'DESC' },
      take: limit,
      relations: ['company'],
    });
    return await this.attachImageUrls(leads);
  }
  
  async getMostViewedLeads(limit: number = 10): Promise<Lead[]> {
    const leads = await this.leadRepository.find({
      where: { isDeleted: false },
      order: { viewCount: 'DESC' },
      take: limit,
      relations: ['company'],
    });
    return await this.attachImageUrls(leads);
  }
  
  async getLeadsByLocation(): Promise<any[]> {
    const results = await this.leadRepository
      .createQueryBuilder('lead')
      .select("lead.location as location")
      .addSelect("COUNT(*) as count")
      .where("lead.isDeleted = :isDeleted", { isDeleted: false })
      .andWhere("lead.location IS NOT NULL")
      .groupBy("location")
      .orderBy("count", "DESC")
      .getRawMany();
    return results;
  }

  async getAverageLeadLifespan(): Promise<number> {
    const result = await this.leadRepository
      .createQueryBuilder('lead')
      .select("AVG(EXTRACT(EPOCH FROM lead.updatedAt - lead.createdAt))", "averageLifespan")
      .where("lead.isActive = :isActive", { isActive: false })
      .andWhere("lead.isDeleted = :isDeleted", { isDeleted: false })
      .getRawOne();
    
    return result?.averageLifespan ? Math.round(result.averageLifespan / 86400) : 0;
  }

  async getLeadConversionRate(): Promise<any> {
    const totalLeads = await this.leadRepository.count({ where: { isDeleted: false } });
    const consumedLeads = await this.leadRepository.count({ 
      where: { 
        isDeleted: false, 
        consumedCount: In(Array.from({length: 100}, (_, i) => i + 1)) 
      } 
    });
    const rate = totalLeads > 0 ? (consumedLeads / totalLeads) * 100 : 0;
    return {
      totalLeads,
      consumedLeads,
      conversionRate: rate.toFixed(2) + '%',
    };
  }

  async getAverageConsumptionsPerCompany(): Promise<string> {
    const result = await this.leadRepository
      .createQueryBuilder('lead')
      .select("AVG(lead.consumedCount)", "avgConsumptions")
      .where("lead.isDeleted = :isDeleted", { isDeleted: false })
      .getRawOne();
    return result?.avgConsumptions ? parseFloat(result.avgConsumptions).toFixed(2) : '0';
  }

  async getLeadSupplyDemandRatio(): Promise<any> {
    const leadsCreated = await this.getTotalLeadCount();
    const leadsConsumed = await this.getTotalConsumedLeads();
    return {
      leadsCreated,
      leadsConsumed,
      ratio: leadsConsumed > 0 ? (leadsCreated / leadsConsumed).toFixed(2) : leadsCreated.toFixed(2),
    };
  }

  async getTopLeadLocations(limit: number = 5): Promise<any[]> {
    const results = await this.leadRepository.query(`
      SELECT location, COUNT(*) as count
      FROM leads
      WHERE "isDeleted" = false AND location IS NOT NULL
      GROUP BY location
      ORDER BY count DESC
      LIMIT $1
    `, [limit]);
    return results;
  }

  async getLeadChurnRate(): Promise<any> {
    const totalLeads = await this.getTotalLeadCount();
    const churnedLeads = await this.leadRepository.count({
      where: {
        isDeleted: false,
        viewCount: 0,
        consumedCount: 0
      }
    });
    const rate = totalLeads > 0 ? (churnedLeads / totalLeads) * 100 : 0;
    return {
      totalLeads,
      churnedLeads,
      churnRate: rate.toFixed(2) + '%',
    };
  }
  
  async getCompanyTotalLeadsPosted(companyId: string): Promise<number> {
    const count = await this.leadRepository.count({
      where: { companyId, isDeleted: false }
    });
    return count;
  }

  async getCompanyActiveLeads(companyId: string): Promise<number> {
    const count = await this.leadRepository.count({
      where: { companyId, isDeleted: false, isActive: true }
    });
    return count;
  }

  async getCompanyConsumedLeads(companyId: string): Promise<number> {
    const result = await this.consumedLeadRepository
      .createQueryBuilder('consumedLead')
      .select("COUNT(*)", "totalConsumed")
      .where("consumedLead.companyId = :companyId", { companyId })
      .getRawOne();
    return parseInt(result?.totalConsumed || '0', 10);
  }

  async getCompanyLeadAvailabilityRatio(companyId: string): Promise<string> {
    const totalLeads = await this.getCompanyTotalLeadsPosted(companyId);
    const activeLeads = await this.getCompanyActiveLeads(companyId);
    return totalLeads > 0 ? ((activeLeads / totalLeads) * 100).toFixed(2) + '%' : '0.00%';
  }
}
