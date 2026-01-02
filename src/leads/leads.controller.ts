// src/modules/leads/leads.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Request,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth, 
  ApiParam,
  ApiConsumes,
  ApiBody 
} from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { AiLeadExtractionService } from './ai-lead-extraction.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { DeactivateLeadDto } from './dto/deactivate-lead.dto';
import { UpdateConsumedLeadStatusDto } from './dto/update-consumed-lead-status.dto';
import { ExtractLeadFromTextDto } from './dto/extract-lead-from-text.dto';
import { JwtAuthGuard } from '../core/guards/jwt-auth.guard';

@ApiTags('Leads')
@Controller('leads')
export class LeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly aiLeadExtractionService: AiLeadExtractionService,
  ) {}

  // ========== PUBLIC ENDPOINTS ==========

  @Get('public')
  @ApiOperation({ summary: 'Get all active leads (public endpoint)' })
  @ApiResponse({ status: 200, description: 'Active leads retrieved successfully' })
  async findAllPublic() {
    const leads = await this.leadsService.findAll();
    return {
      message: 'Active leads retrieved successfully',
      data: leads,
    };
  }

  @Get('public/:id')
  @ApiOperation({ summary: 'Get a single lead by ID (public endpoint)' })
  @ApiParam({ name: 'id', description: 'Lead UUID' })
  @ApiResponse({ status: 200, description: 'Lead retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async findOnePublic(@Param('id') id: string) {
    const lead = await this.leadsService.findOne(id);
    return {
      message: 'Lead retrieved successfully',
      data: lead,
    };
  }

  // ========== PROTECTED ENDPOINTS ==========

  // 🆕 NEW: Get available leads for consumption (not consumed by user and not posted by user)
  @Get('available')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get available leads for consumption',
    description: 'Returns active leads that are not posted by the authenticated user and not yet consumed by them'
  })
  @ApiResponse({ 
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
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAvailableLeads(@Request() req) {
    const result = await this.leadsService.getAvailableLeadsForUser(req.user.companyId);
    return {
      message: 'Available leads retrieved successfully',
      data: {
        leads: result.leads,
        count: result.count,
      },
    };
  }

  // Update this endpoint in leads.controller.ts

  @Post('extract-from-text')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Extract lead details from natural language text using AI',
    description: 'Provide a natural language description of your business requirement and get structured lead data back. If location is not mentioned, your company location will be used automatically.'
  })
  @ApiBody({ type: ExtractLeadFromTextDto })
  @ApiResponse({ 
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
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async extractLeadFromText(
    @Request() req,
    @Body() extractDto: ExtractLeadFromTextDto
  ) {
    // ✅ Step 1: Get company location from token
    const company = await this.leadsService['companyService'].findOne(req.user.companyId);
    const companyLocation = company.address || company.operationalAddress || company.registeredAddress || null;
    
    // ✅ Step 2: Append company location to user input (if available)
    let enhancedInput = extractDto.userInput;
    if (companyLocation) {
      enhancedInput = `${extractDto.userInput} in ${companyLocation}`;
    }
    
    // ✅ Step 3: Send enhanced input to AI (now includes location)
    const extractedData = await this.aiLeadExtractionService.extractLeadDetails(
      enhancedInput
    );
    
    return {
      message: 'Lead details extracted successfully',
      data: extractedData,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new lead with optional image upload' })
  @ApiBody({
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
  })
  @ApiResponse({ status: 201, description: 'Lead created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Request() req,
    @Body() createLeadDto: CreateLeadDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /(image\/(jpeg|jpg|png|webp))/ }),
        ],
        fileIsRequired: false,
      }),
    )
    image?: Express.Multer.File,
  ) {
    const lead = await this.leadsService.create(req.user.companyId, createLeadDto, image);
    return {
      message: 'Lead created successfully',
      data: lead,
    };
  }

  @Get('my-leads')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all leads (active + inactive) created by authenticated company' })
  @ApiResponse({ status: 200, description: 'Company leads retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findMyLeads(@Request() req) {
    const leads = await this.leadsService.findByCompany(req.user.companyId);
    return {
      message: 'Your leads retrieved successfully',
      data: leads,
    };
  }

  @Get('my-leads/active')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get only active leads created by authenticated company' })
  @ApiResponse({ status: 200, description: 'Active company leads retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findMyActiveLeads(@Request() req) {
    const leads = await this.leadsService.findActiveByCompany(req.user.companyId);
    return {
      message: 'Your active leads retrieved successfully',
      data: leads,
    };
  }

  @Get('my-leads/inactive')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get only inactive/deactivated leads created by authenticated company' })
  @ApiResponse({ status: 200, description: 'Inactive company leads retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findMyInactiveLeads(@Request() req) {
    const leads = await this.leadsService.findInactiveByCompany(req.user.companyId);
    return {
      message: 'Your inactive leads retrieved successfully',
      data: leads,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a single lead by ID (protected)' })
  @ApiParam({ name: 'id', description: 'Lead UUID' })
  @ApiResponse({ status: 200, description: 'Lead retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@Param('id') id: string) {
    const lead = await this.leadsService.findOne(id);
    return {
      message: 'Lead retrieved successfully',
      data: lead,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update a lead with optional new image' })
  @ApiParam({ name: 'id', description: 'Lead UUID' })
  @ApiBody({
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
  })
  @ApiResponse({ status: 200, description: 'Lead updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your lead' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateLeadDto: UpdateLeadDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /(image\/(jpeg|jpg|png|webp))/ }),
        ],
        fileIsRequired: false,
      }),
    )
    image?: Express.Multer.File,
  ) {
    const lead = await this.leadsService.update(id, req.user.companyId, updateLeadDto, image);
    return {
      message: 'Lead updated successfully',
      data: lead,
    };
  }

  @Patch(':id/toggle-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Toggle lead active/inactive status' })
  @ApiParam({ name: 'id', description: 'Lead UUID' })
  @ApiBody({
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
  })
  @ApiResponse({ status: 200, description: 'Lead status toggled successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your lead' })
  async toggleStatus(@Request() req, @Param('id') id: string, @Body('isActive') isActive: boolean) {
    const lead = await this.leadsService.toggleActiveStatus(id, req.user.companyId, isActive);
    return {
      message: `Lead ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: lead,
    };
  }

  @Patch(':id/deactivate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Deactivate a lead with optional reason' })
  @ApiParam({ name: 'id', description: 'Lead UUID' })
  @ApiBody({
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
  })
  @ApiResponse({ status: 200, description: 'Lead deactivated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your lead' })
  async deactivate(
    @Request() req,
    @Param('id') id: string,
    @Body() deactivateDto: DeactivateLeadDto,
  ) {
    const lead = await this.leadsService.deactivateLeadWithReason(
      id,
      req.user.companyId,
      deactivateDto.reasonForDeactivation,
    );
    return {
      message: 'Lead deactivated successfully',
      data: lead,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a lead (soft delete)' })
  @ApiParam({ name: 'id', description: 'Lead UUID' })
  @ApiResponse({ status: 200, description: 'Lead deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your lead' })
  async remove(@Request() req, @Param('id') id: string) {
    await this.leadsService.remove(id, req.user.companyId);
    return {
      message: 'Lead deleted successfully',
      data: null,
    };
  }

  @Post(':id/consume')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Consume a lead to get contact details' })
  @ApiParam({ name: 'id', description: 'Lead UUID' })
  @ApiResponse({ status: 200, description: 'Lead consumed successfully or insufficient quota' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Cannot consume own lead or insufficient leads' })
  async consumeLead(@Request() req, @Param('id') id: string) {
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

  @Get(':id/image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get signed URL for lead image' })
  @ApiParam({ name: 'id', description: 'Lead UUID' })
  @ApiResponse({ status: 200, description: 'Image URL generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Lead or image not found' })
  async getLeadImage(@Param('id') id: string) {
    const imageUrl = await this.leadsService.getLeadImageUrl(id);
    return {
      message: 'Image URL generated successfully',
      data: { imageUrl },
    };
  }

  // ===========================================================
  // CONSUMED LEAD STATUS TRACKING ENDPOINTS
  // ===========================================================

  @Get('consumed-leads/my-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all consumed leads with their status for authenticated company' })
  @ApiResponse({ status: 200, description: 'Consumed leads with status retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyConsumedLeadsWithStatus(@Request() req) {
    const consumedLeads = await this.leadsService.getMyConsumedLeadsWithStatus(req.user.companyId);
    return {
      message: 'Consumed leads with status retrieved successfully',
      data: consumedLeads,
    };
  }

  @Get('consumed-leads/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get details of a specific consumed lead' })
  @ApiParam({ name: 'id', description: 'Consumed Lead UUID' })
  @ApiResponse({ status: 200, description: 'Consumed lead details retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Consumed lead not found' })
  async getConsumedLeadDetails(@Request() req, @Param('id') id: string) {
    const consumedLead = await this.leadsService.getConsumedLeadDetails(id, req.user.companyId);
    return {
      message: 'Consumed lead details retrieved successfully',
      data: consumedLead,
    };
  }

  @Patch('consumed-leads/:id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update the status of a consumed lead' })
  @ApiParam({ name: 'id', description: 'Consumed Lead UUID' })
  @ApiBody({
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
  })
  @ApiResponse({ status: 200, description: 'Consumed lead status updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid status or missing deal value' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not your consumed lead' })
  @ApiResponse({ status: 404, description: 'Consumed lead not found' })
  async updateConsumedLeadStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateConsumedLeadStatusDto,
  ) {
    const updatedConsumedLead = await this.leadsService.updateConsumedLeadStatus(
      id,
      req.user.companyId,
      updateStatusDto,
    );
    return {
      message: 'Consumed lead status updated successfully',
      data: updatedConsumedLead,
    };
  }
}