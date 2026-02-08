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
exports.LeadsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const leads_service_1 = require("./leads.service");
const ai_lead_extraction_service_1 = require("./ai-lead-extraction.service");
const create_lead_dto_1 = require("./dto/create-lead.dto");
const update_lead_dto_1 = require("./dto/update-lead.dto");
const deactivate_lead_dto_1 = require("./dto/deactivate-lead.dto");
const update_consumed_lead_status_dto_1 = require("./dto/update-consumed-lead-status.dto");
const extract_lead_from_text_dto_1 = require("./dto/extract-lead-from-text.dto");
const jwt_auth_guard_1 = require("../core/guards/jwt-auth.guard");
let LeadsController = class LeadsController {
    leadsService;
    aiLeadExtractionService;
    constructor(leadsService, aiLeadExtractionService) {
        this.leadsService = leadsService;
        this.aiLeadExtractionService = aiLeadExtractionService;
    }
    async findAllPublic() {
        const leads = await this.leadsService.findAll();
        return {
            message: 'Active leads retrieved successfully',
            data: leads,
        };
    }
    async findOnePublic(id) {
        const lead = await this.leadsService.findOne(id);
        return {
            message: 'Lead retrieved successfully',
            data: lead,
        };
    }
    async getAvailableLeads(req) {
        const result = await this.leadsService.getAvailableLeadsForUser(req.user.companyId);
        return {
            message: 'Available leads retrieved successfully',
            data: {
                leads: result.leads,
                count: result.count,
            },
        };
    }
    async extractLeadFromText(req, extractDto) {
        const company = await this.leadsService['companyService'].findOne(req.user.companyId);
        const companyLocation = company.address || company.operationalAddress || company.registeredAddress || null;
        let enhancedInput = extractDto.userInput;
        if (companyLocation) {
            enhancedInput = `${extractDto.userInput} in ${companyLocation}`;
        }
        const extractedData = await this.aiLeadExtractionService.extractLeadDetails(enhancedInput);
        return {
            message: 'Lead details extracted successfully',
            data: extractedData,
        };
    }
    async create(req, createLeadDto, image) {
        const lead = await this.leadsService.create(req.user.companyId, createLeadDto, image);
        return {
            message: 'Lead created successfully',
            data: lead,
        };
    }
    async findMyLeads(req) {
        const leads = await this.leadsService.findByCompany(req.user.companyId);
        return {
            message: 'Your leads retrieved successfully',
            data: leads,
        };
    }
    async findMyActiveLeads(req) {
        const leads = await this.leadsService.findActiveByCompany(req.user.companyId);
        return {
            message: 'Your active leads retrieved successfully',
            data: leads,
        };
    }
    async findMyInactiveLeads(req) {
        const leads = await this.leadsService.findInactiveByCompany(req.user.companyId);
        return {
            message: 'Your inactive leads retrieved successfully',
            data: leads,
        };
    }
    async findOne(id) {
        const lead = await this.leadsService.findOne(id);
        return {
            message: 'Lead retrieved successfully',
            data: lead,
        };
    }
    async update(req, id, updateLeadDto, image) {
        const lead = await this.leadsService.update(id, req.user.companyId, updateLeadDto, image);
        return {
            message: 'Lead updated successfully',
            data: lead,
        };
    }
    async toggleStatus(req, id, isActive) {
        const lead = await this.leadsService.toggleActiveStatus(id, req.user.companyId, isActive);
        return {
            message: `Lead ${isActive ? 'activated' : 'deactivated'} successfully`,
            data: lead,
        };
    }
    async deactivate(req, id, deactivateDto) {
        const lead = await this.leadsService.deactivateLeadWithReason(id, req.user.companyId, deactivateDto.reasonForDeactivation);
        return {
            message: 'Lead deactivated successfully',
            data: lead,
        };
    }
    async remove(req, id) {
        await this.leadsService.remove(id, req.user.companyId);
        return {
            message: 'Lead deleted successfully',
            data: null,
        };
    }
    async consumeLead(req, id) {
        const result = await this.leadsService.consumeLead(id, req.user.companyId);
        if (!result.success) {
            return {
                message: 'Insufficient leads to consume',
                data: null,
            };
        }
        return {
            message: 'Lead consumed successfully',
            data: { contact: result.contact },
        };
    }
    async getLeadImage(id) {
        const imageUrl = await this.leadsService.getLeadImageUrl(id);
        return {
            message: 'Image URL generated successfully',
            data: { imageUrl },
        };
    }
    async getMyConsumedLeadsWithStatus(req) {
        const consumedLeads = await this.leadsService.getMyConsumedLeadsWithStatus(req.user.companyId);
        return {
            message: 'Consumed leads with status retrieved successfully',
            data: consumedLeads,
        };
    }
    async getConsumedLeadDetails(req, id) {
        const consumedLead = await this.leadsService.getConsumedLeadDetails(id, req.user.companyId);
        return {
            message: 'Consumed lead details retrieved successfully',
            data: consumedLead,
        };
    }
    async updateConsumedLeadStatus(req, id, updateStatusDto) {
        const updatedConsumedLead = await this.leadsService.updateConsumedLeadStatus(id, req.user.companyId, updateStatusDto);
        return {
            message: 'Consumed lead status updated successfully',
            data: updatedConsumedLead,
        };
    }
};
exports.LeadsController = LeadsController;
__decorate([
    (0, common_1.Get)('public'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all active leads (public endpoint)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Active leads retrieved successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "findAllPublic", null);
__decorate([
    (0, common_1.Get)('public/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single lead by ID (public endpoint)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Lead UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Lead retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Lead not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "findOnePublic", null);
__decorate([
    (0, common_1.Get)('available'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get available leads for consumption',
        description: 'Returns active leads that are not posted by the authenticated user and not yet consumed by them'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Available leads retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string', example: 'Available leads retrieved successfully' },
                data: {
                    type: 'object',
                    properties: {
                        leads: {
                            type: 'array',
                            description: 'List of available leads'
                        },
                        count: {
                            type: 'number',
                            description: 'Total number of available leads'
                        }
                    }
                }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "getAvailableLeads", null);
__decorate([
    (0, common_1.Post)('extract-from-text'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({
        summary: 'Extract lead details from natural language text using AI',
        description: 'Provide a natural language description of your business requirement and get structured lead data back. If location is not mentioned, your company location will be used automatically.'
    }),
    (0, swagger_1.ApiBody)({ type: extract_lead_from_text_dto_1.ExtractLeadFromTextDto }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lead details extracted successfully',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string', example: 'Lead details extracted successfully' },
                data: {
                    type: 'object',
                    properties: {
                        title: { type: 'string', example: 'Cotton Fabric 5K mtr', nullable: true },
                        description: { type: 'string', example: 'Need cotton fabric for manufacturing unit.', nullable: true },
                        budget: { type: 'string', example: '2L', nullable: true },
                        quantity: { type: 'string', example: '5K mtr', nullable: true },
                        location: { type: 'string', example: 'Coimbatore', description: 'Uses company location if not specified in text' },
                    }
                }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Bad request - Invalid input' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, extract_lead_from_text_dto_1.ExtractLeadFromTextDto]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "extractLeadFromText", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('image')),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new lead with optional image upload' }),
    (0, swagger_1.ApiBody)({
        description: 'Lead details with optional image',
        schema: {
            type: 'object',
            properties: {
                title: {
                    type: 'string',
                    description: 'Lead title',
                    example: 'Looking for Web Development Services',
                },
                description: {
                    type: 'string',
                    description: 'Detailed description',
                    example: 'We need a professional website for our startup',
                },
                budget: {
                    type: 'string',
                    description: 'Budget for the lead',
                    example: '$5000',
                },
                quantity: {
                    type: 'string',
                    description: 'Quantity required',
                    example: '1',
                },
                location: {
                    type: 'string',
                    description: 'Location',
                    example: 'San Francisco',
                },
                image: {
                    type: 'string',
                    format: 'binary',
                    description: 'Lead image (JPG, PNG, WebP, max 10MB)',
                },
            },
            required: ['title', 'description'],
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Lead created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Bad request' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)(new common_1.ParseFilePipe({
        validators: [
            new common_1.MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
            new common_1.FileTypeValidator({ fileType: /(image\/(jpeg|jpg|png|webp))/ }),
        ],
        fileIsRequired: false,
    }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_lead_dto_1.CreateLeadDto, Object]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('my-leads'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all leads (active + inactive) created by authenticated company' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Company leads retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "findMyLeads", null);
__decorate([
    (0, common_1.Get)('my-leads/active'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Get only active leads created by authenticated company' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Active company leads retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "findMyActiveLeads", null);
__decorate([
    (0, common_1.Get)('my-leads/inactive'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Get only inactive/deactivated leads created by authenticated company' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Inactive company leads retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "findMyInactiveLeads", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single lead by ID (protected)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Lead UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Lead retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Lead not found' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('image')),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a lead with optional new image' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Lead UUID' }),
    (0, swagger_1.ApiBody)({
        description: 'Lead update details with optional image',
        schema: {
            type: 'object',
            properties: {
                title: { type: 'string', example: 'Updated Lead Title' },
                description: { type: 'string', example: 'Updated description' },
                budget: { type: 'string', example: '$6000' },
                quantity: { type: 'string', example: '2' },
                location: { type: 'string', example: 'New York' },
                image: {
                    type: 'string',
                    format: 'binary',
                    description: 'New lead image (replaces existing)',
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Lead updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - not your lead' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Lead not found' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.UploadedFile)(new common_1.ParseFilePipe({
        validators: [
            new common_1.MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
            new common_1.FileTypeValidator({ fileType: /(image\/(jpeg|jpg|png|webp))/ }),
        ],
        fileIsRequired: false,
    }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_lead_dto_1.UpdateLeadDto, Object]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/toggle-status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Toggle lead active/inactive status' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Lead UUID' }),
    (0, swagger_1.ApiBody)({
        description: 'Active status',
        schema: {
            type: 'object',
            properties: {
                isActive: {
                    type: 'boolean',
                    description: 'Set to true to activate, false to deactivate',
                    example: true,
                },
            },
            required: ['isActive'],
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Lead status toggled successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - not your lead' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('isActive')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Boolean]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "toggleStatus", null);
__decorate([
    (0, common_1.Patch)(':id/deactivate'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Deactivate a lead with optional reason' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Lead UUID' }),
    (0, swagger_1.ApiBody)({
        description: 'Deactivation reason',
        schema: {
            type: 'object',
            properties: {
                reasonForDeactivation: {
                    type: 'string',
                    description: 'Reason for deactivating the lead',
                    example: 'Lead fulfilled',
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Lead deactivated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - not your lead' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, deactivate_lead_dto_1.DeactivateLeadDto]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "deactivate", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a lead (soft delete)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Lead UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Lead deleted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - not your lead' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/consume'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Consume a lead to get contact details' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Lead UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Lead consumed successfully or insufficient quota' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Cannot consume own lead or insufficient leads' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "consumeLead", null);
__decorate([
    (0, common_1.Get)(':id/image'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Get signed URL for lead image' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Lead UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Image URL generated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Lead or image not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "getLeadImage", null);
__decorate([
    (0, common_1.Get)('consumed-leads/my-status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all consumed leads with their status for authenticated company' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Consumed leads with status retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "getMyConsumedLeadsWithStatus", null);
__decorate([
    (0, common_1.Get)('consumed-leads/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Get details of a specific consumed lead' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Consumed Lead UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Consumed lead details retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Consumed lead not found' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "getConsumedLeadDetails", null);
__decorate([
    (0, common_1.Patch)('consumed-leads/:id/status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Update the status of a consumed lead' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Consumed Lead UUID' }),
    (0, swagger_1.ApiBody)({
        description: 'Update consumed lead status',
        schema: {
            type: 'object',
            properties: {
                dealStatus: {
                    type: 'string',
                    enum: ['PENDING', 'COMPLETED', 'FAILED', 'NO_RESPONSE'],
                    example: 'COMPLETED',
                    description: 'Current status of the deal',
                },
                dealNotes: {
                    type: 'string',
                    example: 'Successfully closed the deal. Great lead quality!',
                    description: 'Optional notes about the deal outcome',
                },
                dealValue: {
                    type: 'number',
                    example: 50000,
                    description: 'Deal value in INR (required for COMPLETED status)',
                },
            },
            required: ['dealStatus'],
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Consumed lead status updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Bad request - Invalid status or missing deal value' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - Not your consumed lead' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Consumed lead not found' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_consumed_lead_status_dto_1.UpdateConsumedLeadStatusDto]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "updateConsumedLeadStatus", null);
exports.LeadsController = LeadsController = __decorate([
    (0, swagger_1.ApiTags)('Leads'),
    (0, common_1.Controller)('leads'),
    __metadata("design:paramtypes", [leads_service_1.LeadsService,
        ai_lead_extraction_service_1.AiLeadExtractionService])
], LeadsController);
//# sourceMappingURL=leads.controller.js.map