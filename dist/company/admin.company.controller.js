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
exports.AdminCompanyController = void 0;
const common_1 = require("@nestjs/common");
const company_service_1 = require("./company.service");
const create_company_dto_1 = require("./dto/create-company.dto");
const update_company_dto_1 = require("./dto/update-company.dto");
const signup_analytics_query_dto_1 = require("./dto/signup-analytics-query.dto");
const swagger_1 = require("@nestjs/swagger");
let AdminCompanyController = class AdminCompanyController {
    companyService;
    constructor(companyService) {
        this.companyService = companyService;
    }
    async create(createCompanyDto) {
        return {
            message: 'Company created successfully',
            data: await this.companyService.create(createCompanyDto),
        };
    }
    async findAll() {
        return {
            message: 'Companies retrieved successfully',
            data: await this.companyService.findAll(),
        };
    }
    async getActiveUserMetrics() {
        const dau = await this.companyService.getDailyActiveUsers();
        const wau = await this.companyService.getWeeklyActiveUsers();
        const mau = await this.companyService.getMonthlyActiveUsers();
        return {
            message: 'Active user metrics retrieved successfully',
            data: {
                dailyActiveUsers: dau,
                weeklyActiveUsers: wau,
                monthlyActiveUsers: mau,
            },
        };
    }
    async getCompanyMetrics() {
        const totalCompanies = await this.companyService.getTotalRegisteredCompanies();
        const newSignups = await this.companyService.getNewSignupsPerMonth();
        const profileCompletion = await this.companyService.getProfileCompletionPercentage();
        const categoryBreakdown = await this.companyService.getCompaniesByCategory();
        return {
            message: 'Company metrics retrieved successfully',
            data: {
                totalRegisteredCompanies: totalCompanies,
                newSignupsPerMonth: newSignups,
                profileCompletionPercentage: profileCompletion,
                categoryBreakdown: categoryBreakdown,
            },
        };
    }
    async getDailySignups(query) {
        const data = await this.companyService.getDailySignupAnalytics(query.startDate, query.endDate);
        return {
            message: 'Daily signup analytics retrieved successfully',
            data,
        };
    }
    async getWeeklySignups(query) {
        const data = await this.companyService.getWeeklySignupAnalytics(query.startDate, query.endDate);
        return {
            message: 'Weekly signup analytics retrieved successfully',
            data,
        };
    }
    async getMonthlySignups(query) {
        const data = await this.companyService.getMonthlySignupAnalytics(query.startDate, query.endDate);
        return {
            message: 'Monthly signup analytics retrieved successfully',
            data,
        };
    }
    async getYearlySignups(query) {
        const data = await this.companyService.getYearlySignupAnalytics(query.startDate, query.endDate);
        return {
            message: 'Yearly signup analytics retrieved successfully',
            data,
        };
    }
    async getSignupSummary() {
        const data = await this.companyService.getSignupSummary();
        return {
            message: 'Signup summary retrieved successfully',
            data,
        };
    }
    async getCompanyProfileCompletion(id) {
        const completionPercentage = await this.companyService.getCompanyProfileCompletion(id);
        return {
            message: 'Profile completion percentage retrieved successfully',
            data: {
                companyId: id,
                completionPercentage: completionPercentage,
            },
        };
    }
    async findOne(id) {
        const company = await this.companyService.findOne(id);
        return {
            message: 'Company retrieved successfully',
            data: company,
        };
    }
    async update(id, updateCompanyDto) {
        return {
            message: 'Company updated successfully',
            data: await this.companyService.update(id, updateCompanyDto),
        };
    }
    async remove(id) {
        await this.companyService.remove(id);
        return {
            message: 'Company deleted successfully',
            data: null,
        };
    }
};
exports.AdminCompanyController = AdminCompanyController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new company (admin only)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Company created successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_company_dto_1.CreateCompanyDto]),
    __metadata("design:returntype", Promise)
], AdminCompanyController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all companies (admin only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Companies retrieved successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminCompanyController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('metrics/active-users'),
    (0, swagger_1.ApiOperation)({ summary: 'Get active user metrics (DAU, WAU, MAU)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Active user metrics retrieved successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminCompanyController.prototype, "getActiveUserMetrics", null);
__decorate([
    (0, common_1.Get)('metrics/company-breakdown'),
    (0, swagger_1.ApiOperation)({ summary: 'Get various company metrics' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Company metrics retrieved successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminCompanyController.prototype, "getCompanyMetrics", null);
__decorate([
    (0, common_1.Get)('analytics/signups/daily'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get daily new signups with optional date filtering',
        description: 'Returns list of companies registered per day with details. Use startDate and endDate to filter specific date range.'
    }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: false, type: String, example: '2025-01-01', description: 'Start date (YYYY-MM-DD format)' }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: false, type: String, example: '2025-01-31', description: 'End date (YYYY-MM-DD format)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Daily signup analytics retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        totalSignups: { type: 'number', example: 45 },
                        dateRange: {
                            type: 'object',
                            properties: {
                                start: { type: 'string', example: '2025-01-01' },
                                end: { type: 'string', example: '2025-01-31' }
                            }
                        },
                        dailyBreakdown: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    date: { type: 'string', example: '2025-01-15' },
                                    count: { type: 'number', example: 3 },
                                    companies: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                id: { type: 'string' },
                                                companyName: { type: 'string' },
                                                phoneNumber: { type: 'string' },
                                                category: { type: 'string' },
                                                createdAt: { type: 'string' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [signup_analytics_query_dto_1.SignupAnalyticsQueryDto]),
    __metadata("design:returntype", Promise)
], AdminCompanyController.prototype, "getDailySignups", null);
__decorate([
    (0, common_1.Get)('analytics/signups/weekly'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get weekly new signups with optional date filtering',
        description: 'Returns list of companies registered per week with details. Use startDate and endDate to filter specific date range.'
    }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: false, type: String, example: '2025-01-01', description: 'Start date (YYYY-MM-DD format)' }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: false, type: String, example: '2025-01-31', description: 'End date (YYYY-MM-DD format)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Weekly signup analytics retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        totalSignups: { type: 'number', example: 45 },
                        dateRange: {
                            type: 'object',
                            properties: {
                                start: { type: 'string', example: '2025-01-01' },
                                end: { type: 'string', example: '2025-01-31' }
                            }
                        },
                        weeklyBreakdown: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    weekNumber: { type: 'number', example: 3 },
                                    year: { type: 'number', example: 2025 },
                                    weekStart: { type: 'string', example: '2025-01-13' },
                                    weekEnd: { type: 'string', example: '2025-01-19' },
                                    count: { type: 'number', example: 12 },
                                    companies: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                id: { type: 'string' },
                                                companyName: { type: 'string' },
                                                phoneNumber: { type: 'string' },
                                                category: { type: 'string' },
                                                createdAt: { type: 'string' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [signup_analytics_query_dto_1.SignupAnalyticsQueryDto]),
    __metadata("design:returntype", Promise)
], AdminCompanyController.prototype, "getWeeklySignups", null);
__decorate([
    (0, common_1.Get)('analytics/signups/monthly'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get monthly new signups with optional date filtering',
        description: 'Returns list of companies registered per month with details. Use startDate and endDate to filter specific date range.'
    }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: false, type: String, example: '2025-01-01', description: 'Start date (YYYY-MM-DD format)' }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: false, type: String, example: '2025-12-31', description: 'End date (YYYY-MM-DD format)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Monthly signup analytics retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        totalSignups: { type: 'number', example: 156 },
                        dateRange: {
                            type: 'object',
                            properties: {
                                start: { type: 'string', example: '2025-01-01' },
                                end: { type: 'string', example: '2025-12-31' }
                            }
                        },
                        monthlyBreakdown: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    month: { type: 'string', example: 'January' },
                                    year: { type: 'number', example: 2025 },
                                    monthYear: { type: 'string', example: '2025-01' },
                                    count: { type: 'number', example: 45 },
                                    companies: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                id: { type: 'string' },
                                                companyName: { type: 'string' },
                                                phoneNumber: { type: 'string' },
                                                category: { type: 'string' },
                                                createdAt: { type: 'string' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [signup_analytics_query_dto_1.SignupAnalyticsQueryDto]),
    __metadata("design:returntype", Promise)
], AdminCompanyController.prototype, "getMonthlySignups", null);
__decorate([
    (0, common_1.Get)('analytics/signups/yearly'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get yearly new signups with optional date filtering',
        description: 'Returns list of companies registered per year with details. Use startDate and endDate to filter specific date range.'
    }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: false, type: String, example: '2024-01-01', description: 'Start date (YYYY-MM-DD format)' }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: false, type: String, example: '2025-12-31', description: 'End date (YYYY-MM-DD format)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Yearly signup analytics retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        totalSignups: { type: 'number', example: 523 },
                        dateRange: {
                            type: 'object',
                            properties: {
                                start: { type: 'string', example: '2024-01-01' },
                                end: { type: 'string', example: '2025-12-31' }
                            }
                        },
                        yearlyBreakdown: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    year: { type: 'number', example: 2025 },
                                    count: { type: 'number', example: 156 },
                                    companies: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                id: { type: 'string' },
                                                companyName: { type: 'string' },
                                                phoneNumber: { type: 'string' },
                                                category: { type: 'string' },
                                                createdAt: { type: 'string' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [signup_analytics_query_dto_1.SignupAnalyticsQueryDto]),
    __metadata("design:returntype", Promise)
], AdminCompanyController.prototype, "getYearlySignups", null);
__decorate([
    (0, common_1.Get)('analytics/signups/summary'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get comprehensive signup summary with all time periods',
        description: 'Returns signup counts for today, this week, this month, this year, and all time with growth percentages.'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Signup summary retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        today: {
                            type: 'object',
                            properties: {
                                count: { type: 'number', example: 5 },
                                growthPercent: { type: 'number', example: 25.5 }
                            }
                        },
                        thisWeek: {
                            type: 'object',
                            properties: {
                                count: { type: 'number', example: 23 },
                                growthPercent: { type: 'number', example: 15.2 }
                            }
                        },
                        thisMonth: {
                            type: 'object',
                            properties: {
                                count: { type: 'number', example: 87 },
                                growthPercent: { type: 'number', example: 12.8 }
                            }
                        },
                        thisYear: {
                            type: 'object',
                            properties: {
                                count: { type: 'number', example: 156 },
                                growthPercent: { type: 'number', example: 45.3 }
                            }
                        },
                        allTime: {
                            type: 'object',
                            properties: {
                                count: { type: 'number', example: 523 }
                            }
                        }
                    }
                }
            }
        }
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminCompanyController.prototype, "getSignupSummary", null);
__decorate([
    (0, common_1.Get)(':id/profile-completion'),
    (0, swagger_1.ApiOperation)({ summary: 'Get profile completion percentage for a specific company by ID (admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Company UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Profile completion percentage retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Company not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminCompanyController.prototype, "getCompanyProfileCompletion", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a specific company by ID (admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Company UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Company retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Company not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminCompanyController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a company (admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Company UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Company updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Company not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_company_dto_1.UpdateCompanyDto]),
    __metadata("design:returntype", Promise)
], AdminCompanyController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a company (admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Company UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Company deleted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Company not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminCompanyController.prototype, "remove", null);
exports.AdminCompanyController = AdminCompanyController = __decorate([
    (0, swagger_1.ApiTags)('Admin-Companies'),
    (0, common_1.Controller)('admin/companies'),
    __metadata("design:paramtypes", [company_service_1.CompanyService])
], AdminCompanyController);
//# sourceMappingURL=admin.company.controller.js.map