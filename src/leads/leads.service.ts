
// src/modules/leads/leads.service.ts
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Lead } from './entities/lead.entity';
import { ConsumedLead, DealStatus } from './entities/consumed-lead.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { UpdateConsumedLeadStatusDto } from './dto/update-consumed-lead-status.dto';
import { CompanyService } from '../company/company.service';
import { NotificationsService } from '../notifications/notifications.service';
import { S3Service } from '../chat/s3.service';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    @InjectRepository(ConsumedLead)
    private readonly consumedLeadRepository: Repository<ConsumedLead>,
    private readonly companyService: CompanyService,
    private readonly notificationsService: NotificationsService, // Added
    private readonly s3Service: S3Service,
  ) {}

  async create(
    companyId: string, 
    createLeadDto: CreateLeadDto, 
    imageFile?: Express.Multer.File
  ): Promise<Lead> {
    const canPost = await this.companyService.canPostLead(companyId);
    if (!canPost) {
      throw new BadRequestException('Lead posting quota exceeded. Please upgrade your subscription or wait for next month.');
    }

    const leadData: Partial<Lead> = {
      ...createLeadDto,
      companyId,
    };

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
    
    await this.companyService.incrementPostedLeads(companyId);
    
    if (savedLead.imageKey) {
      try {
        savedLead.imageUrl = await this.s3Service.generateSignedUrl(savedLead.imageKey);
      } catch (error) {
        console.error('Failed to generate signed URL:', error);
      }
    }

    // 🆕 Send notification to all users except the creator
    try {
      await this.notificationsService.sendNewLeadNotification(
        savedLead.id,
        savedLead.title,
        companyId,
      );
    } catch (error) {
      console.error('Failed to send new lead notification:', error);
      // Don't fail the lead creation if notification fails
    }
    
    return savedLead;
  }

  async findAll(): Promise<Lead[]> {
    const leads = await this.leadRepository.find({
      where: { isDeleted: false, isActive: true },
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });
    return await this.attachSignedUrls(leads);
  }

  async findByCompany(companyId: string): Promise<Lead[]> {
    const leads = await this.leadRepository.find({
      where: { companyId, isDeleted: false },
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });
    return await this.attachSignedUrls(leads);
  }

  async findActiveByCompany(companyId: string): Promise<Lead[]> {
    const leads = await this.leadRepository.find({
      where: { companyId, isDeleted: false, isActive: true },
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });
    return await this.attachSignedUrls(leads);
  }

  async findInactiveByCompany(companyId: string): Promise<Lead[]> {
    const leads = await this.leadRepository.find({
      where: { companyId, isDeleted: false, isActive: false },
      relations: ['company'],
      order: { updatedAt: 'DESC' },
    });
    return await this.attachSignedUrls(leads);
  }

  async findOne(id: string): Promise<Lead> {
    const lead = await this.leadRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['company'],
    });
    
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }
    
    lead.viewCount += 1;
    const updatedLead = await this.leadRepository.save(lead);
    const [leadWithUrls] = await this.attachSignedUrls([updatedLead]);
    return leadWithUrls;
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

    if (imageFile) {
      if (lead.imageKey) {
        try {
          await this.s3Service.deleteFile(lead.imageKey);
        } catch (error) {
          console.error('Failed to delete old lead image:', error);
        }
      }

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

    Object.assign(lead, updateLeadDto);
    const updatedLead = await this.leadRepository.save(lead);
    const [leadWithUrls] = await this.attachSignedUrls([updatedLead]);
    return leadWithUrls;
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
    if (isActive) {
      lead.reasonForDeactivation = undefined;
    }
    
    const savedLead = await this.leadRepository.save(lead);
    const [leadWithUrls] = await this.attachSignedUrls([savedLead]);
    return leadWithUrls;
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
    const [leadWithUrls] = await this.attachSignedUrls([savedLead]);
    return leadWithUrls;
  }

  async remove(id: string, companyId: string): Promise<void> {
    const lead = await this.leadRepository.findOne({
      where: { id, isDeleted: false },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (companyId && lead.companyId !== companyId) {
      throw new ForbiddenException('You can only delete your own leads');
    }

    if (lead.imageKey) {
      try {
        await this.s3Service.deleteFile(lead.imageKey);
      } catch (error) {
        console.error('Failed to delete lead image from S3:', error);
      }
    }

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

  // Update the consumeLead method to send notifications
  async consumeLead(leadId: string, consumerCompanyId: string): Promise<{ success: boolean; contact?: string }> {
    const lead = await this.findOne(leadId);

    if (lead.companyId === consumerCompanyId) {
      throw new ForbiddenException('Cannot consume your own lead');
    }

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

    lead.consumedCount = lead.consumedCount + 1;
    await this.leadRepository.save(lead);
    
    const consumedRecord = this.consumedLeadRepository.create({
      companyId: consumerCompanyId,
      leadId: leadId
    });
    await this.consumedLeadRepository.save(consumedRecord);

    // 🆕 Send notification to lead owner
    try {
      const consumerCompany = await this.companyService.findOne(consumerCompanyId);
      await this.notificationsService.sendLeadConsumedNotification(
        lead.companyId,
        lead.title,
        consumerCompany.companyName,
      );
    } catch (error) {
      console.error('Failed to send lead consumed notification:', error);
    }

    return {
      success: true,
      contact: lead.company.phoneNumber,
    };
  }

  private async generateSignedUrlsForCompany(company: any): Promise<void> {
    if (!company) return;

    try {
      if (company.logo && this.s3Service.isS3Key(company.logo)) {
        company.logo = await this.s3Service.generateSignedUrl(company.logo, 3600);
      }

      if (company.userPhoto && this.s3Service.isS3Key(company.userPhoto)) {
        company.userPhoto = await this.s3Service.generateSignedUrl(company.userPhoto, 3600);
      }

      if (company.coverImage && this.s3Service.isS3Key(company.coverImage)) {
        company.coverImage = await this.s3Service.generateSignedUrl(company.coverImage, 3600);
      }
    } catch (error) {
      console.error(`Failed to generate signed URLs for company ${company.id}:`, error);
    }
  }

  private async attachSignedUrls(leads: Lead[]): Promise<Lead[]> {
    const leadsWithUrls = await Promise.all(
      leads.map(async (lead) => {
        if (lead.imageKey) {
          try {
            lead.imageUrl = await this.s3Service.generateSignedUrl(lead.imageKey, 3600);
          } catch (error) {
            console.error(`Failed to generate signed URL for lead ${lead.id}:`, error);
          }
        }

        if (lead.company) {
          await this.generateSignedUrlsForCompany(lead.company);
        }

        return lead;
      })
    );
    return leadsWithUrls;
  }
  
  // ADMIN METRICS METHODS
  async getAllDeactivatedLeads(): Promise<{inactive: Lead[], deleted: Lead[]}> {
    const inactiveLeads = await this.getInactiveLeads();
    const deletedLeads = await this.getDeletedLeads();
    return { inactive: inactiveLeads, deleted: deletedLeads };
  }

  async getInactiveLeads(): Promise<Lead[]> {
    const leads = await this.leadRepository.find({
      where: { isDeleted: false, isActive: false },
      relations: ['company'],
      order: { updatedAt: 'DESC' },
    });
    return await this.attachSignedUrls(leads);
  }

  async getDeletedLeads(): Promise<Lead[]> {
    const leads = await this.leadRepository.find({
      where: { isDeleted: true },
      relations: ['company'],
      order: { updatedAt: 'DESC' },
    });
    for (const lead of leads) {
      if (lead.company) {
        await this.generateSignedUrlsForCompany(lead.company);
      }
    }
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
    return await this.leadRepository
      .createQueryBuilder('lead')
      .select("DATE(lead.createdAt) as date")
      .addSelect("COUNT(*) as count")
      .where("lead.isDeleted = :isDeleted", { isDeleted: false })
      .groupBy("date")
      .orderBy("date", "DESC")
      .getRawMany();
  }

  async getLeadCountByMonth(): Promise<any[]> {
    return await this.leadRepository
      .createQueryBuilder('lead')
      .select("TO_CHAR(lead.createdAt, 'YYYY-MM') as month")
      .addSelect("COUNT(*) as count")
      .where("lead.isDeleted = :isDeleted", { isDeleted: false })
      .groupBy("month")
      .orderBy("month", "DESC")
      .getRawMany();
  }
  
  async getTotalLeadCount(): Promise<number> {
    return await this.leadRepository.count({ where: { isDeleted: false } });
  }

  async getTotalActiveLeads(): Promise<number> {
    return await this.leadRepository.count({ where: { isDeleted: false, isActive: true } });
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
    return await this.attachSignedUrls(leads);
  }
  
  async getMostViewedLeads(limit: number = 10): Promise<Lead[]> {
    const leads = await this.leadRepository.find({
      where: { isDeleted: false },
      order: { viewCount: 'DESC' },
      take: limit,
      relations: ['company'],
    });
    return await this.attachSignedUrls(leads);
  }
  
  async getLeadsByLocation(): Promise<any[]> {
    return await this.leadRepository
      .createQueryBuilder('lead')
      .select("lead.location as location")
      .addSelect("COUNT(*) as count")
      .where("lead.isDeleted = :isDeleted", { isDeleted: false })
      .andWhere("lead.location IS NOT NULL")
      .groupBy("location")
      .orderBy("count", "DESC")
      .getRawMany();
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
    return await this.leadRepository.query(`
      SELECT location, COUNT(*) as count
      FROM leads
      WHERE "isDeleted" = false AND location IS NOT NULL
      GROUP BY location
      ORDER BY count DESC
      LIMIT $1
    `, [limit]);
  }

  async getLeadChurnRate(): Promise<any> {
    const totalLeads = await this.getTotalLeadCount();
    const churnedLeads = await this.leadRepository.count({
      where: { isDeleted: false, viewCount: 0, consumedCount: 0 }
    });
    const rate = totalLeads > 0 ? (churnedLeads / totalLeads) * 100 : 0;
    return {
      totalLeads,
      churnedLeads,
      churnRate: rate.toFixed(2) + '%',
    };
  }
  
  async getCompanyTotalLeadsPosted(companyId: string): Promise<number> {
    return await this.leadRepository.count({
      where: { companyId, isDeleted: false }
    });
  }

  async getCompanyActiveLeads(companyId: string): Promise<number> {
    return await this.leadRepository.count({
      where: { companyId, isDeleted: false, isActive: true }
    });
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

  // CONSUMED LEAD STATUS TRACKING METHODS
  async updateConsumedLeadStatus(
    consumedLeadId: string,
    companyId: string,
    updateStatusDto: UpdateConsumedLeadStatusDto,
  ): Promise<ConsumedLead> {
    const consumedLead = await this.consumedLeadRepository.findOne({
      where: { id: consumedLeadId },
      relations: ['lead', 'lead.company', 'company'],
    });

    if (!consumedLead) {
      throw new NotFoundException('Consumed lead not found');
    }

    if (consumedLead.companyId !== companyId) {
      throw new ForbiddenException('You can only update status of leads you consumed');
    }

    if (updateStatusDto.dealStatus === DealStatus.COMPLETED && !updateStatusDto.dealValue) {
      throw new BadRequestException('Deal value is required for COMPLETED status');
    }

    consumedLead.dealStatus = updateStatusDto.dealStatus;
    if (updateStatusDto.dealNotes !== undefined) {
      consumedLead.dealNotes = updateStatusDto.dealNotes;
    }
    if (updateStatusDto.dealValue !== undefined) {
      consumedLead.dealValue = updateStatusDto.dealValue;
    }
    consumedLead.statusUpdatedAt = new Date();

    const updatedConsumedLead = await this.consumedLeadRepository.save(consumedLead);

    await this.generateSignedUrlsForCompany(updatedConsumedLead.lead.company);
    await this.generateSignedUrlsForCompany(updatedConsumedLead.company);

    if (updatedConsumedLead.lead.imageKey) {
      try {
        updatedConsumedLead.lead.imageUrl = await this.s3Service.generateSignedUrl(
          updatedConsumedLead.lead.imageKey,
          3600
        );
      } catch (error) {
        console.error('Failed to generate signed URL for lead image:', error);
      }
    }

    return updatedConsumedLead;
  }

  async getMyConsumedLeadsWithStatus(companyId: string): Promise<ConsumedLead[]> {
    const consumedLeads = await this.consumedLeadRepository.find({
      where: { companyId },
      relations: ['lead', 'lead.company', 'company'],
      order: { consumedAt: 'DESC' },
    });

    for (const consumedLead of consumedLeads) {
      await this.generateSignedUrlsForCompany(consumedLead.lead.company);
      await this.generateSignedUrlsForCompany(consumedLead.company);

      if (consumedLead.lead.imageKey) {
        try {
          consumedLead.lead.imageUrl = await this.s3Service.generateSignedUrl(
            consumedLead.lead.imageKey,
            3600
          );
        } catch (error) {
          console.error('Failed to generate signed URL:', error);
        }
      }
    }

    return consumedLeads;
  }

  async getConsumedLeadDetails(consumedLeadId: string, companyId: string): Promise<ConsumedLead> {
    const consumedLead = await this.consumedLeadRepository.findOne({
      where: { id: consumedLeadId, companyId },
      relations: ['lead', 'lead.company', 'company'],
    });

    if (!consumedLead) {
      throw new NotFoundException('Consumed lead not found');
    }

    await this.generateSignedUrlsForCompany(consumedLead.lead.company);
    await this.generateSignedUrlsForCompany(consumedLead.company);

    if (consumedLead.lead.imageKey) {
      try {
        consumedLead.lead.imageUrl = await this.s3Service.generateSignedUrl(
          consumedLead.lead.imageKey,
          3600
        );
      } catch (error) {
        console.error('Failed to generate signed URL:', error);
      }
    }

    return consumedLead;
  }

  // ADMIN METHODS - CONSUMED LEAD ANALYTICS
  async getAllConsumedLeadsWithStatus(): Promise<ConsumedLead[]> {
    const consumedLeads = await this.consumedLeadRepository.find({
      relations: ['lead', 'lead.company', 'company'],
      order: { consumedAt: 'DESC' },
    });

    for (const consumedLead of consumedLeads) {
      await this.generateSignedUrlsForCompany(consumedLead.lead.company);
      await this.generateSignedUrlsForCompany(consumedLead.company);

      if (consumedLead.lead.imageKey) {
        try {
          consumedLead.lead.imageUrl = await this.s3Service.generateSignedUrl(
            consumedLead.lead.imageKey,
            3600
          );
        } catch (error) {
          console.error('Failed to generate signed URL:', error);
        }
      }
    }

    return consumedLeads;
  }

  async getCompanyConsumedLeadsWithStatus(companyId: string): Promise<ConsumedLead[]> {
    return this.getMyConsumedLeadsWithStatus(companyId);
  }

  async getConsumedLeadMetrics(): Promise<any> {
    const allConsumedLeads = await this.consumedLeadRepository.find({
      relations: ['lead', 'lead.company', 'company'],
    });

    const totalConsumed = allConsumedLeads.length;
    const pendingDeals = allConsumedLeads.filter(cl => cl.dealStatus === DealStatus.PENDING).length;
    const completedDeals = allConsumedLeads.filter(cl => cl.dealStatus === DealStatus.COMPLETED).length;
    const failedDeals = allConsumedLeads.filter(cl => cl.dealStatus === DealStatus.FAILED).length;
    const noResponseDeals = allConsumedLeads.filter(cl => cl.dealStatus === DealStatus.NO_RESPONSE).length;

    const totalDealValue = allConsumedLeads
      .filter(cl => cl.dealStatus === DealStatus.COMPLETED && cl.dealValue)
      .reduce((sum, cl) => sum + Number(cl.dealValue), 0);

    const averageDealValue = completedDeals > 0 ? totalDealValue / completedDeals : 0;
    const conversionRate = totalConsumed > 0 ? ((completedDeals / totalConsumed) * 100).toFixed(2) : '0.00';

    const companyStats = new Map<string, {
      companyId: string;
      companyName: string;
      totalConsumed: number;
      completed: number;
      conversionRate: number;
      totalDealValue: number;
    }>();

    allConsumedLeads.forEach(cl => {
      const companyId = cl.companyId;
      const companyName = cl.company?.companyName || 'Unknown';

      if (!companyStats.has(companyId)) {
        companyStats.set(companyId, {
          companyId,
          companyName,
          totalConsumed: 0,
          completed: 0,
          conversionRate: 0,
          totalDealValue: 0,
        });
      }

      const stats = companyStats.get(companyId);
      if (stats) {
        stats.totalConsumed++;
        if (cl.dealStatus === DealStatus.COMPLETED) {
          stats.completed++;
          stats.totalDealValue += Number(cl.dealValue || 0);
        }
        stats.conversionRate = (stats.completed / stats.totalConsumed) * 100;
      }
    });

    const topPerformingCompanies = Array.from(companyStats.values())
      .filter(c => c.totalConsumed >= 3)
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, 10);

    const leadQualityStats = new Map<string, {
      companyId: string;
      companyName: string;
      leadsPosted: number;
      leadsConsumed: number;
      dealsCompleted: number;
      successRate: number;
      totalRevenue: number;
    }>();

    allConsumedLeads.forEach(cl => {
      const ownerId = cl.lead.companyId;
      const ownerName = cl.lead.company?.companyName || 'Unknown';

      if (!leadQualityStats.has(ownerId)) {
        leadQualityStats.set(ownerId, {
          companyId: ownerId,
          companyName: ownerName,
          leadsPosted: 0,
          leadsConsumed: 0,
          dealsCompleted: 0,
          successRate: 0,
          totalRevenue: 0,
        });
      }

      const stats = leadQualityStats.get(ownerId);
      if (stats) {
        stats.leadsConsumed++;
        if (cl.dealStatus === DealStatus.COMPLETED) {
          stats.dealsCompleted++;
          stats.totalRevenue += Number(cl.dealValue || 0);
        }
        stats.successRate = (stats.dealsCompleted / stats.leadsConsumed) * 100;
      }
    });

    const leadQualityByCompany = Array.from(leadQualityStats.values())
      .filter(c => c.leadsConsumed >= 3)
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 10);

    return {
      summary: {
        totalConsumedLeads: totalConsumed,
        pendingDeals,
        completedDeals,
        failedDeals,
        noResponseDeals,
        conversionRate: `${conversionRate}%`,
        totalDealValue: totalDealValue.toFixed(2),
        averageDealValue: averageDealValue.toFixed(2),
      },
      topPerformingCompanies,
      leadQualityByCompany,
      statusBreakdown: {
        PENDING: pendingDeals,
        COMPLETED: completedDeals,
        FAILED: failedDeals,
        NO_RESPONSE: noResponseDeals,
      },
    };
  }

  async getCompanyConversionMetrics(companyId: string): Promise<any> {
    const consumedLeads = await this.consumedLeadRepository.find({
      where: { companyId },
      relations: ['lead', 'lead.company'],
    });

    const totalConsumed = consumedLeads.length;
    const pending = consumedLeads.filter(cl => cl.dealStatus === DealStatus.PENDING).length;
    const completed = consumedLeads.filter(cl => cl.dealStatus === DealStatus.COMPLETED).length;
    const failed = consumedLeads.filter(cl => cl.dealStatus === DealStatus.FAILED).length;
    const noResponse = consumedLeads.filter(cl => cl.dealStatus === DealStatus.NO_RESPONSE).length;

    const totalDealValue = consumedLeads
      .filter(cl => cl.dealStatus === DealStatus.COMPLETED && cl.dealValue)
      .reduce((sum, cl) => sum + Number(cl.dealValue), 0);

    const conversionRate = totalConsumed > 0 ? ((completed / totalConsumed) * 100).toFixed(2) : '0.00';
    const averageDealValue = completed > 0 ? (totalDealValue / completed).toFixed(2) : '0.00';

    return {
      companyId,
      totalConsumedLeads: totalConsumed,
      statusBreakdown: {
        PENDING: pending,
        COMPLETED: completed,
        FAILED: failed,
        NO_RESPONSE: noResponse,
      },
      conversionRate: `${conversionRate}%`,
      totalDealValue: totalDealValue.toFixed(2),
      averageDealValue,
    };
  }


  /**
   * Get available leads for a user to consume
   * Returns leads that are:
   * - Active and not deleted
   * - Not posted by the user
   * - Not already consumed by the user
   */
  async getAvailableLeadsForUser(companyId: string): Promise<{ leads: Lead[]; count: number }> {
    // Get all lead IDs already consumed by this company
    const consumedLeadRecords = await this.consumedLeadRepository.find({
      where: { companyId },
      select: ['leadId'],
    });
    
    const consumedLeadIds = consumedLeadRecords.map(record => record.leadId);

    // Build query to get available leads
    const queryBuilder = this.leadRepository
      .createQueryBuilder('lead')
      .leftJoinAndSelect('lead.company', 'company')
      .where('lead.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('lead.isActive = :isActive', { isActive: true })
      .andWhere('lead.companyId != :companyId', { companyId });

    // Exclude already consumed leads
    if (consumedLeadIds.length > 0) {
      queryBuilder.andWhere('lead.id NOT IN (:...consumedLeadIds)', { consumedLeadIds });
    }

    const leads = await queryBuilder
      .orderBy('lead.createdAt', 'DESC')
      .getMany();

    // Attach signed URLs
    const leadsWithUrls = await this.attachSignedUrls(leads);

    return {
      leads: leadsWithUrls,
      count: leadsWithUrls.length,
    };
  }
}