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
exports.AdminLeadsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const leads_service_1 = require("./leads.service");
const jwt_auth_guard_1 = require("../core/guards/jwt-auth.guard");
let AdminLeadsController = class AdminLeadsController {
    leadsService;
    constructor(leadsService) {
        this.leadsService = leadsService;
    }
    async getAllConsumedLeadsWithStatus() {
        const consumedLeads = await this.leadsService.getAllConsumedLeadsWithStatus();
        return {
            message: 'All consumed leads retrieved successfully',
            data: consumedLeads,
        };
    }
    async getConsumedLeadMetrics() {
        const metrics = await this.leadsService.getConsumedLeadMetrics();
        return {
            message: 'Conversion metrics retrieved successfully',
            data: metrics,
        };
    }
    async getCompanyConsumedLeads(companyId) {
        const consumedLeads = await this.leadsService.getCompanyConsumedLeadsWithStatus(companyId);
        return {
            message: 'Company consumed leads retrieved successfully',
            data: consumedLeads,
        };
    }
    async getCompanyConversionMetrics(companyId) {
        const metrics = await this.leadsService.getCompanyConversionMetrics(companyId);
        return {
            message: 'Company conversion metrics retrieved successfully',
            data: metrics,
        };
    }
    async getMostConsumedLeads() {
        const leads = await this.leadsService.getMostConsumedLeads(10);
        return {
            message: 'Most consumed leads retrieved successfully',
            data: leads,
        };
    }
    async getMostViewedLeads() {
        const leads = await this.leadsService.getMostViewedLeads(10);
        return {
            message: 'Most viewed leads retrieved successfully',
            data: leads,
        };
    }
    async getLeadsByLocation() {
        const locations = await this.leadsService.getLeadsByLocation();
        return {
            message: 'Leads by location retrieved successfully',
            data: locations,
        };
    }
    async getDeactivatedLeads() {
        const result = await this.leadsService.getAllDeactivatedLeads();
        return {
            message: 'Deactivated leads retrieved successfully',
            data: result,
        };
    }
    async getDeactivatedLeadsByReason() {
        const reasons = await this.leadsService.getDeactivatedLeadsByReason();
        return {
            message: 'Deactivated leads by reason retrieved successfully',
            data: reasons,
        };
    }
    async getLeadCountByDate() {
        const counts = await this.leadsService.getLeadCountByDate();
        return {
            message: 'Lead count by date retrieved successfully',
            data: counts,
        };
    }
    async getLeadCountByMonth() {
        const counts = await this.leadsService.getLeadCountByMonth();
        return {
            message: 'Lead count by month retrieved successfully',
            data: counts,
        };
    }
    async getLeadAnalyticsSummary() {
        const totalLeads = await this.leadsService.getTotalLeadCount();
        const totalActiveLeads = await this.leadsService.getTotalActiveLeads();
        const totalConsumedLeads = await this.leadsService.getTotalConsumedLeads();
        const conversionRate = await this.leadsService.getLeadConversionRate();
        const averageLifespan = await this.leadsService.getAverageLeadLifespan();
        const avgConsumptions = await this.leadsService.getAverageConsumptionsPerCompany();
        return {
            message: 'Lead analytics summary retrieved successfully',
            data: {
                totalLeads,
                totalActiveLeads,
                totalConsumedLeads,
                conversionRate,
                averageLeadLifespan: averageLifespan,
                averageConsumptionsPerLead: avgConsumptions,
            },
        };
    }
};
exports.AdminLeadsController = AdminLeadsController;
__decorate([
    (0, common_1.Get)('consumed-leads'),
    (0, swagger_1.ApiOperation)({
        summary: '[ADMIN] Get all consumed leads with status',
        description: 'Returns all consumed leads across all companies with deal status tracking'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'All consumed leads retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                data: {
                    type: 'array',
                    description: 'List of all consumed leads with status'
                }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminLeadsController.prototype, "getAllConsumedLeadsWithStatus", null);
__decorate([
    (0, common_1.Get)('consumed-leads/metrics'),
    (0, swagger_1.ApiOperation)({
        summary: '[ADMIN] Get comprehensive conversion metrics',
        description: 'Returns overall conversion rates, deal values, and company performance metrics'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Conversion metrics retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        summary: {
                            type: 'object',
                            properties: {
                                totalConsumedLeads: { type: 'number', example: 150 },
                                pendingDeals: { type: 'number', example: 45 },
                                completedDeals: { type: 'number', example: 80 },
                                failedDeals: { type: 'number', example: 15 },
                                noResponseDeals: { type: 'number', example: 10 },
                                conversionRate: { type: 'string', example: '53.33%' },
                                totalDealValue: { type: 'string', example: '450000.00' },
                                averageDealValue: { type: 'string', example: '5625.00' }
                            }
                        },
                        topPerformingCompanies: {
                            type: 'array',
                            description: 'Companies with highest conversion rates (min 3 leads consumed)'
                        },
                        leadQualityByCompany: {
                            type: 'array',
                            description: 'Lead owners ranked by their lead quality/success rate'
                        }
                    }
                }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminLeadsController.prototype, "getConsumedLeadMetrics", null);
__decorate([
    (0, common_1.Get)('consumed-leads/company/:companyId'),
    (0, swagger_1.ApiOperation)({
        summary: '[ADMIN] Get consumed leads for a specific company',
        description: 'Returns all leads consumed by a specific company with their deal statuses'
    }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company UUID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Company consumed leads retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                data: {
                    type: 'array',
                    description: 'List of consumed leads for the specified company'
                }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Company not found' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminLeadsController.prototype, "getCompanyConsumedLeads", null);
__decorate([
    (0, common_1.Get)('consumed-leads/company/:companyId/metrics'),
    (0, swagger_1.ApiOperation)({
        summary: '[ADMIN] Get conversion metrics for a specific company',
        description: 'Returns detailed conversion analytics for a single company'
    }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company UUID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Company conversion metrics retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        companyId: { type: 'string' },
                        totalConsumedLeads: { type: 'number', example: 15 },
                        statusBreakdown: {
                            type: 'object',
                            properties: {
                                PENDING: { type: 'number', example: 3 },
                                COMPLETED: { type: 'number', example: 8 },
                                FAILED: { type: 'number', example: 2 },
                                NO_RESPONSE: { type: 'number', example: 2 }
                            }
                        },
                        conversionRate: { type: 'string', example: '53.33%' },
                        totalDealValue: { type: 'string', example: '125000.00' },
                        averageDealValue: { type: 'string', example: '15625.00' }
                    }
                }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminLeadsController.prototype, "getCompanyConversionMetrics", null);
__decorate([
    (0, common_1.Get)('analytics/most-consumed'),
    (0, swagger_1.ApiOperation)({
        summary: '[ADMIN] Get most consumed leads',
        description: 'Returns leads with highest consumption count'
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Most consumed leads retrieved' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminLeadsController.prototype, "getMostConsumedLeads", null);
__decorate([
    (0, common_1.Get)('analytics/most-viewed'),
    (0, swagger_1.ApiOperation)({
        summary: '[ADMIN] Get most viewed leads',
        description: 'Returns leads with highest view count'
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Most viewed leads retrieved' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminLeadsController.prototype, "getMostViewedLeads", null);
__decorate([
    (0, common_1.Get)('analytics/by-location'),
    (0, swagger_1.ApiOperation)({
        summary: '[ADMIN] Get leads grouped by location',
        description: 'Returns lead distribution by location'
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Leads by location retrieved' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminLeadsController.prototype, "getLeadsByLocation", null);
__decorate([
    (0, common_1.Get)('analytics/deactivated'),
    (0, swagger_1.ApiOperation)({
        summary: '[ADMIN] Get all deactivated/inactive leads',
        description: 'Returns leads that have been deactivated with reasons'
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Deactivated leads retrieved' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminLeadsController.prototype, "getDeactivatedLeads", null);
__decorate([
    (0, common_1.Get)('analytics/deactivated/by-reason'),
    (0, swagger_1.ApiOperation)({
        summary: '[ADMIN] Get deactivated leads grouped by reason',
        description: 'Returns count of deactivated leads by deactivation reason'
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Deactivation reasons retrieved' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminLeadsController.prototype, "getDeactivatedLeadsByReason", null);
__decorate([
    (0, common_1.Get)('analytics/count-by-date'),
    (0, swagger_1.ApiOperation)({
        summary: '[ADMIN] Get lead count by date',
        description: 'Returns daily lead creation counts'
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Lead counts by date retrieved' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminLeadsController.prototype, "getLeadCountByDate", null);
__decorate([
    (0, common_1.Get)('analytics/count-by-month'),
    (0, swagger_1.ApiOperation)({
        summary: '[ADMIN] Get lead count by month',
        description: 'Returns monthly lead creation counts'
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Lead counts by month retrieved' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminLeadsController.prototype, "getLeadCountByMonth", null);
__decorate([
    (0, common_1.Get)('analytics/summary'),
    (0, swagger_1.ApiOperation)({
        summary: '[ADMIN] Get overall lead analytics summary',
        description: 'Returns comprehensive lead statistics and metrics'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lead analytics summary retrieved',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        totalLeads: { type: 'number', example: 250 },
                        totalActiveLeads: { type: 'number', example: 180 },
                        totalConsumedLeads: { type: 'number', example: 450 },
                        conversionRate: {
                            type: 'object',
                            properties: {
                                totalLeads: { type: 'number' },
                                consumedLeads: { type: 'number' },
                                conversionRate: { type: 'string', example: '72.00%' }
                            }
                        },
                        averageLeadLifespan: { type: 'number', example: 15, description: 'Days' },
                        averageConsumptionsPerLead: { type: 'string', example: '1.8' }
                    }
                }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminLeadsController.prototype, "getLeadAnalyticsSummary", null);
exports.AdminLeadsController = AdminLeadsController = __decorate([
    (0, swagger_1.ApiTags)('Admin-Leads'),
    (0, common_1.Controller)('admin/leads'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    __metadata("design:paramtypes", [leads_service_1.LeadsService])
], AdminLeadsController);
//# sourceMappingURL=admin.leads.controller.js.map