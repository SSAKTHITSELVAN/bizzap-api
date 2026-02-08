"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const lead_entity_1 = require("./entities/lead.entity");
const consumed_lead_entity_1 = require("./entities/consumed-lead.entity");
const company_service_1 = require("../company/company.service");
const notifications_service_1 = require("../notifications/notifications.service");
const s3_service_1 = require("../chat/s3.service");
let LeadsService = class LeadsService {
    leadRepository;
    consumedLeadRepository;
    companyService;
    notificationsService;
    s3Service;
    constructor(leadRepository, consumedLeadRepository, companyService, notificationsService, s3Service) {
        this.leadRepository = leadRepository;
        this.consumedLeadRepository = consumedLeadRepository;
        this.companyService = companyService;
        this.notificationsService = notificationsService;
        this.s3Service = s3Service;
    }
    async create(companyId, createLeadDto, imageFile) {
        const canPost = await this.companyService.canPostLead(companyId);
        if (!canPost) {
            throw new common_1.BadRequestException('Lead posting quota exceeded. Please upgrade your subscription or wait for next month.');
        }
        const leadData = {
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
            }
            catch (error) {
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
            }
            catch (error) {
                console.error('Failed to generate signed URL:', error);
            }
        }
        try {
            await this.notificationsService.sendNewLeadNotification(savedLead.id, savedLead.title, companyId);
        }
        catch (error) {
            console.error('Failed to send new lead notification:', error);
        }
        return savedLead;
    }
    async findAll() {
        const leads = await this.leadRepository.find({
            where: { isDeleted: false, isActive: true },
            relations: ['company'],
            order: { createdAt: 'DESC' },
        });
        return await this.attachSignedUrls(leads);
    }
    async findByCompany(companyId) {
        const leads = await this.leadRepository.find({
            where: { companyId, isDeleted: false },
            relations: ['company'],
            order: { createdAt: 'DESC' },
        });
        return await this.attachSignedUrls(leads);
    }
    async findActiveByCompany(companyId) {
        const leads = await this.leadRepository.find({
            where: { companyId, isDeleted: false, isActive: true },
            relations: ['company'],
            order: { createdAt: 'DESC' },
        });
        return await this.attachSignedUrls(leads);
    }
    async findInactiveByCompany(companyId) {
        const leads = await this.leadRepository.find({
            where: { companyId, isDeleted: false, isActive: false },
            relations: ['company'],
            order: { updatedAt: 'DESC' },
        });
        return await this.attachSignedUrls(leads);
    }
    async findOne(id) {
        const lead = await this.leadRepository.findOne({
            where: { id, isDeleted: false },
            relations: ['company'],
        });
        if (!lead) {
            throw new common_1.NotFoundException('Lead not found');
        }
        lead.viewCount += 1;
        const updatedLead = await this.leadRepository.save(lead);
        const [leadWithUrls] = await this.attachSignedUrls([updatedLead]);
        return leadWithUrls;
    }
    async update(id, companyId, updateLeadDto, imageFile) {
        const lead = await this.leadRepository.findOne({
            where: { id, isDeleted: false },
            relations: ['company'],
        });
        if (!lead) {
            throw new common_1.NotFoundException('Lead not found');
        }
        if (lead.companyId !== companyId) {
            throw new common_1.ForbiddenException('You can only update your own leads');
        }
        if (imageFile) {
            if (lead.imageKey) {
                try {
                    await this.s3Service.deleteFile(lead.imageKey);
                }
                catch (error) {
                    console.error('Failed to delete old lead image:', error);
                }
            }
            try {
                const uploadResult = await this.s3Service.uploadFile(imageFile, 'lead-images');
                lead.imageKey = uploadResult.key;
                lead.imageName = imageFile.originalname;
                lead.imageSize = uploadResult.size;
                lead.imageMimeType = uploadResult.mimeType;
            }
            catch (error) {
                throw new Error(`Failed to upload new image: ${error.message}`);
            }
        }
        Object.assign(lead, updateLeadDto);
        const updatedLead = await this.leadRepository.save(lead);
        const [leadWithUrls] = await this.attachSignedUrls([updatedLead]);
        return leadWithUrls;
    }
    async toggleActiveStatus(id, companyId, isActive) {
        const lead = await this.leadRepository.findOne({
            where: { id, isDeleted: false },
            relations: ['company'],
        });
        if (!lead) {
            throw new common_1.NotFoundException('Lead not found');
        }
        if (lead.companyId !== companyId) {
            throw new common_1.ForbiddenException('You can only update your own leads');
        }
        lead.isActive = isActive;
        if (isActive) {
            lead.reasonForDeactivation = undefined;
        }
        const savedLead = await this.leadRepository.save(lead);
        const [leadWithUrls] = await this.attachSignedUrls([savedLead]);
        return leadWithUrls;
    }
    async deactivateLeadWithReason(id, companyId, reason) {
        const lead = await this.leadRepository.findOne({
            where: { id, isDeleted: false },
            relations: ['company'],
        });
        if (!lead) {
            throw new common_1.NotFoundException('Lead not found');
        }
        if (lead.companyId !== companyId) {
            throw new common_1.ForbiddenException('You can only update your own leads');
        }
        lead.isActive = false;
        lead.reasonForDeactivation = reason;
        const savedLead = await this.leadRepository.save(lead);
        const [leadWithUrls] = await this.attachSignedUrls([savedLead]);
        return leadWithUrls;
    }
    async remove(id, companyId) {
        const lead = await this.leadRepository.findOne({
            where: { id, isDeleted: false },
        });
        if (!lead) {
            throw new common_1.NotFoundException('Lead not found');
        }
        if (companyId && lead.companyId !== companyId) {
            throw new common_1.ForbiddenException('You can only delete your own leads');
        }
        if (lead.imageKey) {
            try {
                await this.s3Service.deleteFile(lead.imageKey);
            }
            catch (error) {
                console.error('Failed to delete lead image from S3:', error);
            }
        }
        await this.leadRepository.update(id, { isDeleted: true });
    }
    async getLeadImageUrl(leadId) {
        const lead = await this.leadRepository.findOne({
            where: { id: leadId, isDeleted: false },
        });
        if (!lead) {
            throw new common_1.NotFoundException('Lead not found');
        }
        if (!lead.imageKey) {
            throw new common_1.NotFoundException('No image associated with this lead');
        }
        return this.s3Service.generateSignedUrl(lead.imageKey, 3600);
    }
    async consumeLead(leadId, consumerCompanyId) {
        const lead = await this.findOne(leadId);
        if (lead.companyId === consumerCompanyId) {
            throw new common_1.ForbiddenException('Cannot consume your own lead');
        }
        const hasConsumed = await this.consumedLeadRepository.findOne({
            where: { companyId: consumerCompanyId, leadId },
        });
        if (hasConsumed) {
            return {
                success: true,
                contact: lead.company.phoneNumber,
                message: 'You have already consumed this lead previously',
            };
        }
        const canConsume = await this.companyService.consumeLead(consumerCompanyId);
        if (!canConsume) {
            const company = await this.companyService.findOne(consumerCompanyId);
            return {
                success: false,
                message: `Monthly lead quota exhausted (${company.consumedLeads}/${company.leadQuota}). Share your referral code to earn 2 more leads per referral!`
            };
        }
        lead.consumedCount = lead.consumedCount + 1;
        await this.leadRepository.save(lead);
        const consumedRecord = this.consumedLeadRepository.create({
            companyId: consumerCompanyId,
            leadId: leadId
        });
        await this.consumedLeadRepository.save(consumedRecord);
        try {
            const consumerCompany = await this.companyService.findOne(consumerCompanyId);
            await this.notificationsService.sendLeadConsumedNotification(lead.companyId, lead.title, consumerCompany.companyName);
        }
        catch (error) {
            console.error('Failed to send lead consumed notification:', error);
        }
        const company = await this.companyService.findOne(consumerCompanyId);
        const remainingLeads = company.leadQuota - company.consumedLeads;
        return {
            success: true,
            contact: lead.company.phoneNumber,
            message: `Lead consumed successfully! You have ${remainingLeads} leads remaining this month.`,
        };
    }
    async generateSignedUrlsForCompany(company) {
        if (!company)
            return;
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
        }
        catch (error) {
            console.error(`Failed to generate signed URLs for company ${company.id}:`, error);
        }
    }
    async attachSignedUrls(leads) {
        const leadsWithUrls = await Promise.all(leads.map(async (lead) => {
            if (lead.imageKey) {
                try {
                    lead.imageUrl = await this.s3Service.generateSignedUrl(lead.imageKey, 3600);
                }
                catch (error) {
                    console.error(`Failed to generate signed URL for lead ${lead.id}:`, error);
                }
            }
            if (lead.company) {
                await this.generateSignedUrlsForCompany(lead.company);
            }
            return lead;
        }));
        return leadsWithUrls;
    }
    async getAllDeactivatedLeads() {
        const inactiveLeads = await this.getInactiveLeads();
        const deletedLeads = await this.getDeletedLeads();
        return { inactive: inactiveLeads, deleted: deletedLeads };
    }
    async getInactiveLeads() {
        const leads = await this.leadRepository.find({
            where: { isDeleted: false, isActive: false },
            relations: ['company'],
            order: { updatedAt: 'DESC' },
        });
        return await this.attachSignedUrls(leads);
    }
    async getDeletedLeads() {
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
    async getInactiveLeadsByReason() {
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
    async getDeactivatedLeads() {
        return this.getInactiveLeads();
    }
    async getDeactivatedLeadsByReason() {
        return this.getInactiveLeadsByReason();
    }
    async getLeadCountByDate() {
        return await this.leadRepository
            .createQueryBuilder('lead')
            .select("DATE(lead.createdAt) as date")
            .addSelect("COUNT(*) as count")
            .where("lead.isDeleted = :isDeleted", { isDeleted: false })
            .groupBy("date")
            .orderBy("date", "DESC")
            .getRawMany();
    }
    async getLeadCountByMonth() {
        return await this.leadRepository
            .createQueryBuilder('lead')
            .select("TO_CHAR(lead.createdAt, 'YYYY-MM') as month")
            .addSelect("COUNT(*) as count")
            .where("lead.isDeleted = :isDeleted", { isDeleted: false })
            .groupBy("month")
            .orderBy("month", "DESC")
            .getRawMany();
    }
    async getTotalLeadCount() {
        return await this.leadRepository.count({ where: { isDeleted: false } });
    }
    async getTotalActiveLeads() {
        return await this.leadRepository.count({ where: { isDeleted: false, isActive: true } });
    }
    async getTotalConsumedLeads() {
        const result = await this.leadRepository
            .createQueryBuilder('lead')
            .select("SUM(lead.consumedCount)", "totalConsumed")
            .where("lead.isDeleted = :isDeleted", { isDeleted: false })
            .getRawOne();
        return parseInt(result?.totalConsumed || '0', 10);
    }
    async getMostConsumedLeads(limit = 10) {
        const leads = await this.leadRepository.find({
            where: { isDeleted: false },
            order: { consumedCount: 'DESC' },
            take: limit,
            relations: ['company'],
        });
        return await this.attachSignedUrls(leads);
    }
    async getMostViewedLeads(limit = 10) {
        const leads = await this.leadRepository.find({
            where: { isDeleted: false },
            order: { viewCount: 'DESC' },
            take: limit,
            relations: ['company'],
        });
        return await this.attachSignedUrls(leads);
    }
    async getLeadsByLocation() {
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
    async getAverageLeadLifespan() {
        const result = await this.leadRepository
            .createQueryBuilder('lead')
            .select("AVG(EXTRACT(EPOCH FROM lead.updatedAt - lead.createdAt))", "averageLifespan")
            .where("lead.isActive = :isActive", { isActive: false })
            .andWhere("lead.isDeleted = :isDeleted", { isDeleted: false })
            .getRawOne();
        return result?.averageLifespan ? Math.round(result.averageLifespan / 86400) : 0;
    }
    async getLeadConversionRate() {
        const totalLeads = await this.leadRepository.count({ where: { isDeleted: false } });
        const consumedLeads = await this.leadRepository.count({
            where: {
                isDeleted: false,
                consumedCount: (0, typeorm_2.In)(Array.from({ length: 100 }, (_, i) => i + 1))
            }
        });
        const rate = totalLeads > 0 ? (consumedLeads / totalLeads) * 100 : 0;
        return {
            totalLeads,
            consumedLeads,
            conversionRate: rate.toFixed(2) + '%',
        };
    }
    async getAverageConsumptionsPerCompany() {
        const result = await this.leadRepository
            .createQueryBuilder('lead')
            .select("AVG(lead.consumedCount)", "avgConsumptions")
            .where("lead.isDeleted = :isDeleted", { isDeleted: false })
            .getRawOne();
        return result?.avgConsumptions ? parseFloat(result.avgConsumptions).toFixed(2) : '0';
    }
    async getLeadSupplyDemandRatio() {
        const leadsCreated = await this.getTotalLeadCount();
        const leadsConsumed = await this.getTotalConsumedLeads();
        return {
            leadsCreated,
            leadsConsumed,
            ratio: leadsConsumed > 0 ? (leadsCreated / leadsConsumed).toFixed(2) : leadsCreated.toFixed(2),
        };
    }
    async getTopLeadLocations(limit = 5) {
        return await this.leadRepository.query(`
      SELECT location, COUNT(*) as count
      FROM leads
      WHERE "isDeleted" = false AND location IS NOT NULL
      GROUP BY location
      ORDER BY count DESC
      LIMIT $1
    `, [limit]);
    }
    async getLeadChurnRate() {
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
    async getCompanyTotalLeadsPosted(companyId) {
        return await this.leadRepository.count({
            where: { companyId, isDeleted: false }
        });
    }
    async getCompanyActiveLeads(companyId) {
        return await this.leadRepository.count({
            where: { companyId, isDeleted: false, isActive: true }
        });
    }
    async getCompanyConsumedLeads(companyId) {
        const result = await this.consumedLeadRepository
            .createQueryBuilder('consumedLead')
            .select("COUNT(*)", "totalConsumed")
            .where("consumedLead.companyId = :companyId", { companyId })
            .getRawOne();
        return parseInt(result?.totalConsumed || '0', 10);
    }
    async getCompanyLeadAvailabilityRatio(companyId) {
        const totalLeads = await this.getCompanyTotalLeadsPosted(companyId);
        const activeLeads = await this.getCompanyActiveLeads(companyId);
        return totalLeads > 0 ? ((activeLeads / totalLeads) * 100).toFixed(2) + '%' : '0.00%';
    }
    async updateConsumedLeadStatus(consumedLeadId, companyId, updateStatusDto) {
        const consumedLead = await this.consumedLeadRepository.findOne({
            where: { id: consumedLeadId },
            relations: ['lead', 'lead.company', 'company'],
        });
        if (!consumedLead) {
            throw new common_1.NotFoundException('Consumed lead not found');
        }
        if (consumedLead.companyId !== companyId) {
            throw new common_1.ForbiddenException('You can only update status of leads you consumed');
        }
        if (updateStatusDto.dealStatus === consumed_lead_entity_1.DealStatus.COMPLETED && !updateStatusDto.dealValue) {
            throw new common_1.BadRequestException('Deal value is required for COMPLETED status');
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
                updatedConsumedLead.lead.imageUrl = await this.s3Service.generateSignedUrl(updatedConsumedLead.lead.imageKey, 3600);
            }
            catch (error) {
                console.error('Failed to generate signed URL for lead image:', error);
            }
        }
        return updatedConsumedLead;
    }
    async getMyConsumedLeadsWithStatus(companyId) {
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
                    consumedLead.lead.imageUrl = await this.s3Service.generateSignedUrl(consumedLead.lead.imageKey, 3600);
                }
                catch (error) {
                    console.error('Failed to generate signed URL:', error);
                }
            }
        }
        return consumedLeads;
    }
    async getConsumedLeadDetails(consumedLeadId, companyId) {
        const consumedLead = await this.consumedLeadRepository.findOne({
            where: { id: consumedLeadId, companyId },
            relations: ['lead', 'lead.company', 'company'],
        });
        if (!consumedLead) {
            throw new common_1.NotFoundException('Consumed lead not found');
        }
        await this.generateSignedUrlsForCompany(consumedLead.lead.company);
        await this.generateSignedUrlsForCompany(consumedLead.company);
        if (consumedLead.lead.imageKey) {
            try {
                consumedLead.lead.imageUrl = await this.s3Service.generateSignedUrl(consumedLead.lead.imageKey, 3600);
            }
            catch (error) {
                console.error('Failed to generate signed URL:', error);
            }
        }
        return consumedLead;
    }
    async getAllConsumedLeadsWithStatus() {
        const consumedLeads = await this.consumedLeadRepository.find({
            relations: ['lead', 'lead.company', 'company'],
            order: { consumedAt: 'DESC' },
        });
        for (const consumedLead of consumedLeads) {
            await this.generateSignedUrlsForCompany(consumedLead.lead.company);
            await this.generateSignedUrlsForCompany(consumedLead.company);
            if (consumedLead.lead.imageKey) {
                try {
                    consumedLead.lead.imageUrl = await this.s3Service.generateSignedUrl(consumedLead.lead.imageKey, 3600);
                }
                catch (error) {
                    console.error('Failed to generate signed URL:', error);
                }
            }
        }
        return consumedLeads;
    }
    async getCompanyConsumedLeadsWithStatus(companyId) {
        return this.getMyConsumedLeadsWithStatus(companyId);
    }
    async getConsumedLeadMetrics() {
        const allConsumedLeads = await this.consumedLeadRepository.find({
            relations: ['lead', 'lead.company', 'company'],
        });
        const totalConsumed = allConsumedLeads.length;
        const pendingDeals = allConsumedLeads.filter(cl => cl.dealStatus === consumed_lead_entity_1.DealStatus.PENDING).length;
        const completedDeals = allConsumedLeads.filter(cl => cl.dealStatus === consumed_lead_entity_1.DealStatus.COMPLETED).length;
        const failedDeals = allConsumedLeads.filter(cl => cl.dealStatus === consumed_lead_entity_1.DealStatus.FAILED).length;
        const noResponseDeals = allConsumedLeads.filter(cl => cl.dealStatus === consumed_lead_entity_1.DealStatus.NO_RESPONSE).length;
        const totalDealValue = allConsumedLeads
            .filter(cl => cl.dealStatus === consumed_lead_entity_1.DealStatus.COMPLETED && cl.dealValue)
            .reduce((sum, cl) => sum + Number(cl.dealValue), 0);
        const averageDealValue = completedDeals > 0 ? totalDealValue / completedDeals : 0;
        const conversionRate = totalConsumed > 0 ? ((completedDeals / totalConsumed) * 100).toFixed(2) : '0.00';
        const companyStats = new Map();
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
                if (cl.dealStatus === consumed_lead_entity_1.DealStatus.COMPLETED) {
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
        const leadQualityStats = new Map();
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
                if (cl.dealStatus === consumed_lead_entity_1.DealStatus.COMPLETED) {
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
    async getCompanyConversionMetrics(companyId) {
        const consumedLeads = await this.consumedLeadRepository.find({
            where: { companyId },
            relations: ['lead', 'lead.company'],
        });
        const totalConsumed = consumedLeads.length;
        const pending = consumedLeads.filter(cl => cl.dealStatus === consumed_lead_entity_1.DealStatus.PENDING).length;
        const completed = consumedLeads.filter(cl => cl.dealStatus === consumed_lead_entity_1.DealStatus.COMPLETED).length;
        const failed = consumedLeads.filter(cl => cl.dealStatus === consumed_lead_entity_1.DealStatus.FAILED).length;
        const noResponse = consumedLeads.filter(cl => cl.dealStatus === consumed_lead_entity_1.DealStatus.NO_RESPONSE).length;
        const totalDealValue = consumedLeads
            .filter(cl => cl.dealStatus === consumed_lead_entity_1.DealStatus.COMPLETED && cl.dealValue)
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
    async getAvailableLeadsForUser(companyId) {
        const consumedLeadRecords = await this.consumedLeadRepository.find({
            where: { companyId },
            select: ['leadId'],
        });
        const consumedLeadIds = consumedLeadRecords.map(record => record.leadId);
        const queryBuilder = this.leadRepository
            .createQueryBuilder('lead')
            .leftJoinAndSelect('lead.company', 'company')
            .where('lead.isDeleted = :isDeleted', { isDeleted: false })
            .andWhere('lead.isActive = :isActive', { isActive: true })
            .andWhere('lead.companyId != :companyId', { companyId });
        if (consumedLeadIds.length > 0) {
            queryBuilder.andWhere('lead.id NOT IN (:...consumedLeadIds)', { consumedLeadIds });
        }
        const leads = await queryBuilder
            .orderBy('lead.createdAt', 'DESC')
            .getMany();
        const leadsWithUrls = await this.attachSignedUrls(leads);
        return {
            leads: leadsWithUrls,
            count: leadsWithUrls.length,
        };
    }
};
exports.LeadsService = LeadsService;
exports.LeadsService = LeadsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(lead_entity_1.Lead)),
    __param(1, (0, typeorm_1.InjectRepository)(consumed_lead_entity_1.ConsumedLead)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        company_service_1.CompanyService,
        notifications_service_1.NotificationsService,
        s3_service_1.S3Service])
], LeadsService);
//# sourceMappingURL=leads.service.js.map