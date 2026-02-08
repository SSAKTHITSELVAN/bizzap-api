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
exports.CompanyController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const company_service_1 = require("./company.service");
const update_company_dto_1 = require("./dto/update-company.dto");
const jwt_auth_guard_1 = require("../core/guards/jwt-auth.guard");
let CompanyController = class CompanyController {
    companyService;
    constructor(companyService) {
        this.companyService = companyService;
    }
    async getProfile(req) {
        const company = await this.companyService.findOne(req.user.companyId);
        const companyWithUrls = await this.companyService.getCompanyWithSignedUrls(company);
        return {
            message: 'Company profile retrieved successfully',
            data: companyWithUrls,
        };
    }
    async getLeadQuotaDetails(req) {
        const quotaDetails = await this.companyService.getLeadQuotaDetails(req.user.companyId);
        return {
            message: 'Lead quota details retrieved successfully',
            data: quotaDetails,
        };
    }
    async getConsumedLeads(req) {
        return {
            message: 'Consumed leads retrieved successfully',
            data: await this.companyService.getConsumedLeads(req.user.companyId),
        };
    }
    async findOne(id) {
        const company = await this.companyService.findOne(id);
        const companyWithUrls = await this.companyService.getCompanyWithSignedUrls(company);
        return {
            message: 'Company retrieved successfully',
            data: companyWithUrls,
        };
    }
    async updateProfile(req, updateCompanyDto, files) {
        const updatedCompany = await this.companyService.updateWithFiles(req.user.companyId, updateCompanyDto, files);
        const companyWithUrls = await this.companyService.getCompanyWithSignedUrls(updatedCompany);
        return {
            message: 'Company profile updated successfully',
            data: companyWithUrls,
        };
    }
};
exports.CompanyController = CompanyController;
__decorate([
    (0, common_1.Get)('profile'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Get authenticated company profile' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Company profile retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized - Invalid or missing token' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Get)('lead-quota'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get detailed lead quota information',
        description: 'Returns comprehensive information about lead consumption, posting quotas, remaining leads, and next reset date'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lead quota details retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string', example: 'Lead quota details retrieved successfully' },
                data: {
                    type: 'object',
                    properties: {
                        totalLeadQuota: { type: 'number', example: 25 },
                        consumedLeads: { type: 'number', example: 10 },
                        remainingLeads: { type: 'number', example: 15 },
                        postingQuota: { type: 'number', example: 30 },
                        postedLeads: { type: 'number', example: 5 },
                        remainingPosts: { type: 'number', example: 25 },
                        nextResetDate: { type: 'string', format: 'date-time', example: '2025-01-01T00:00:00.000Z' },
                        daysUntilReset: { type: 'number', example: 9 },
                        referralCode: { type: 'string', example: 'BIZAP1234' },
                        referralInfo: { type: 'string', example: 'Share your referral code to earn 5 bonus leads per successful referral!' }
                    }
                }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized - Invalid or missing token' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "getLeadQuotaDetails", null);
__decorate([
    (0, common_1.Get)('consumed-leads'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all leads consumed by the authenticated company' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Consumed leads retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized - Invalid or missing token' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "getConsumedLeads", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get company by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Company UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Company retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Company not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)('profile'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([
        { name: 'userPhoto', maxCount: 1 },
        { name: 'logo', maxCount: 1 },
        { name: 'coverImage', maxCount: 1 },
    ])),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({
        summary: 'Update authenticated company profile with file uploads',
        description: 'Update profile with optional file uploads for user photo, logo, and cover image. All fields are optional.'
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                userPhoto: {
                    type: 'string',
                    format: 'binary',
                    description: 'User profile photo (optional)',
                },
                logo: {
                    type: 'string',
                    format: 'binary',
                    description: 'Company logo (optional)',
                },
                coverImage: {
                    type: 'string',
                    format: 'binary',
                    description: 'Company cover image (optional)',
                },
                companyName: {
                    type: 'string',
                    example: 'Tech Solutions Pvt Ltd',
                },
                address: {
                    type: 'string',
                    example: '123 Business Street, Tech City, State 123456',
                },
                description: {
                    type: 'string',
                    example: 'Leading provider of technology solutions',
                },
                category: {
                    type: 'string',
                    example: 'IT Services',
                },
                userName: {
                    type: 'string',
                    example: 'John Doe',
                },
                registeredAddress: {
                    type: 'string',
                    example: '123 Corporate Ave, City, State 123456',
                },
                about: {
                    type: 'string',
                    example: 'We are a leading tech company specializing in AI solutions.',
                },
                operationalAddress: {
                    type: 'string',
                    example: '456 Tech Park, City, State 123456',
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Company profile updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized - Invalid or missing token' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_company_dto_1.UpdateCompanyDto, Object]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "updateProfile", null);
exports.CompanyController = CompanyController = __decorate([
    (0, swagger_1.ApiTags)('Companies'),
    (0, common_1.Controller)('companies'),
    __metadata("design:paramtypes", [company_service_1.CompanyService])
], CompanyController);
//# sourceMappingURL=company.controller.js.map