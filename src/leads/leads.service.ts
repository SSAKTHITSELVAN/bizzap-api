

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Lead } from './entities/lead.entity';
import { ConsumedLead } from './entities/consumed-lead.entity'; // Import the new entity
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { CompanyService } from '../company/company.service';
import { DeactivateLeadDto } from './dto/deactivate-lead.dto';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,
    @InjectRepository(ConsumedLead) // Inject the new ConsumedLead repository
    private consumedLeadRepository: Repository<ConsumedLead>,
    private companyService: CompanyService,
  ) {}

  async create(companyId: string, createLeadDto: CreateLeadDto): Promise<Lead> {
    const lead = this.leadRepository.create({
      ...createLeadDto,
      companyId,
    });
    return this.leadRepository.save(lead);
  }

  async findAll(): Promise<Lead[]> {
    return this.leadRepository.find({
      where: { isDeleted: false, isActive: true },
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByCompany(companyId: string): Promise<Lead[]> {
    return this.leadRepository.find({
      where: { companyId, isDeleted: false },
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Lead> {
    const lead = await this.leadRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['company'],
    });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }
    // Increment view count when a lead is viewed
    lead.viewCount += 1;
    await this.leadRepository.save(lead);
    return lead;
  }

  async update(id: string, companyId: string, updateLeadDto: UpdateLeadDto): Promise<Lead> {
    const lead = await this.findOne(id);
    if (lead.companyId !== companyId) {
      throw new ForbiddenException('You can only update your own leads');
    }
    Object.assign(lead, updateLeadDto);
    return this.leadRepository.save(lead);
  }

  async toggleActiveStatus(id: string, companyId: string, isActive: boolean): Promise<Lead> {
    const lead = await this.findOne(id);
    if (lead.companyId !== companyId) {
      throw new ForbiddenException('You can only update your own leads');
    }
    lead.isActive = isActive;
    
    // Clear reason for deactivation when reactivating
    if (isActive) {
      lead.reasonForDeactivation = undefined;
    }
    
    return this.leadRepository.save(lead);
  }

  async deactivateLeadWithReason(id: string, companyId: string, reason?: string): Promise<Lead> {
    const lead = await this.findOne(id);
    if (lead.companyId !== companyId) {
      throw new ForbiddenException('You can only update your own leads');
    }
    
    lead.isActive = false;
    lead.reasonForDeactivation = reason;
    
    return this.leadRepository.save(lead);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const lead = await this.findOne(id);
    if (lead.companyId !== companyId) {
      throw new ForbiddenException('You can only delete your own leads');
    }
    await this.leadRepository.update(id, { isDeleted: true });
  }

  async consumeLead(leadId: string, consumerCompanyId: string): Promise<{ success: boolean; contact?: string }> {
    const lead = await this.findOne(leadId);

    if (lead.companyId === consumerCompanyId) {
      throw new ForbiddenException('Cannot consume your own lead');
    }

    // Check if the company has already consumed this lead
    const hasConsumed = await this.consumedLeadRepository.findOne({
      where: { companyId: consumerCompanyId, leadId },
    });
    
    if (hasConsumed) {
      // If already consumed, no need to deduct or increment
      return {
        success: true,
        contact: lead.company.phoneNumber,
      };
    }

    const canConsume = await this.companyService.consumeLead(consumerCompanyId);
    if (!canConsume) {
      return { success: false };
    }

    await this.leadRepository.update(leadId, {
      consumedCount: lead.consumedCount + 1,
    });
    
    // Create a new record to track the consumption
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
  
  // Enhanced methods for admin to view special leads
  async getAllDeactivatedLeads(): Promise<{inactive: Lead[], deleted: Lead[]}> {
    const inactiveLeads = await this.getInactiveLeads();
    const deletedLeads = await this.getDeletedLeads();
    
    return {
      inactive: inactiveLeads,
      deleted: deletedLeads,
    };
  }

  async getInactiveLeads(): Promise<Lead[]> {
    return this.leadRepository.find({
      where: { isDeleted: false, isActive: false },
      relations: ['company'],
      order: { updatedAt: 'DESC' },
    });
  }

  async getDeletedLeads(): Promise<Lead[]> {
    return this.leadRepository.find({
      where: { isDeleted: true },
      relations: ['company'],
      order: { updatedAt: 'DESC' },
    });
  }

  async getInactiveLeadsByReason(): Promise<any[]> {
    return this.leadRepository
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
  }

  // Legacy methods (keeping for backward compatibility)
  async getDeactivatedLeads(): Promise<Lead[]> {
    return this.getInactiveLeads();
  }

  async getDeactivatedLeadsByReason(): Promise<any[]> {
    return this.getInactiveLeadsByReason();
  }
  
  // Existing Admin Metrics Methods
  async getLeadCountByDate(): Promise<any[]> {
    return this.leadRepository
      .createQueryBuilder('lead')
      .select("DATE(lead.createdAt) as date")
      .addSelect("COUNT(*) as count")
      .where("lead.isDeleted = :isDeleted", { isDeleted: false })
      .groupBy("date")
      .orderBy("date", "DESC")
      .getRawMany();
  }

  async getLeadCountByMonth(): Promise<any[]> {
    return this.leadRepository
      .createQueryBuilder('lead')
      .select("TO_CHAR(lead.createdAt, 'YYYY-MM') as month")
      .addSelect("COUNT(*) as count")
      .where("lead.isDeleted = :isDeleted", { isDeleted: false })
      .groupBy("month")
      .orderBy("month", "DESC")
      .getRawMany();
  }
  
  async getTotalLeadCount(): Promise<number> {
    return this.leadRepository.count({ where: { isDeleted: false } });
  }

  async getTotalActiveLeads(): Promise<number> {
    return this.leadRepository.count({ where: { isDeleted: false, isActive: true } });
  }
  
  async getTotalConsumedLeads(): Promise<number> {
    const result = await this.leadRepository
      .createQueryBuilder('lead')
      .select("SUM(lead.consumedCount)", "totalConsumed")
      .where("lead.isDeleted = :isDeleted", { isDeleted: false })
      .getRawOne();
    return parseInt(result.totalConsumed, 10) || 0;
  }

  async getMostConsumedLeads(limit: number = 10): Promise<Lead[]> {
    return this.leadRepository.find({
      where: { isDeleted: false },
      order: { consumedCount: 'DESC' },
      take: limit,
      relations: ['company'],
    });
  }
  
  async getMostViewedLeads(limit: number = 10): Promise<Lead[]> {
    return this.leadRepository.find({
      where: { isDeleted: false },
      order: { viewCount: 'DESC' },
      take: limit,
      relations: ['company'],
    });
  }
  
  async getLeadsByLocation(): Promise<any[]> {
    return this.leadRepository
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
    
    // Convert seconds to days and return
    return result.averageLifespan ? Math.round(result.averageLifespan / 86400) : 0;
  }

  async getLeadConversionRate(): Promise<any> {
    const totalLeads = await this.leadRepository.count({ where: { isDeleted: false } });
    const consumedLeads = await this.leadRepository.count({ where: { isDeleted: false, consumedCount: In(Array.from({length: 100}, (_, i) => i + 1)) } });
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
    return result.avgConsumptions ? parseFloat(result.avgConsumptions).toFixed(2) : '0';
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
    return this.leadRepository.query(`
      SELECT location, COUNT(*) as count
      FROM leads
      WHERE "isDeleted" = false AND location IS NOT NULL
      GROUP BY location
      ORDER BY count DESC
      LIMIT ${limit};
    `);
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
  
  // New metrics for a specific company
  async getCompanyTotalLeadsPosted(companyId: string): Promise<number> {
    return this.leadRepository.count({
      where: { companyId, isDeleted: false }
    });
  }

  async getCompanyActiveLeads(companyId: string): Promise<number> {
    return this.leadRepository.count({
      where: { companyId, isDeleted: false, isActive: true }
    });
  }

  async getCompanyConsumedLeads(companyId: string): Promise<number> {
    const result = await this.consumedLeadRepository
      .createQueryBuilder('consumedLead')
      .select("COUNT(*)", "totalConsumed")
      .where("consumedLead.companyId = :companyId", { companyId })
      .getRawOne();
    return parseInt(result.totalConsumed, 10) || 0;
  }

  async getCompanyLeadAvailabilityRatio(companyId: string): Promise<string> {
    const totalLeads = await this.getCompanyTotalLeadsPosted(companyId);
    const activeLeads = await this.getCompanyActiveLeads(companyId);
    return totalLeads > 0 ? ((activeLeads / totalLeads) * 100).toFixed(2) + '%' : '0.00%';
  }
}