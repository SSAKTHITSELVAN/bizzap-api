// src/modules/company/company.controller.ts - Fixed route order
import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  UseGuards, 
  Request,
  UseInterceptors,
  UploadedFiles 
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { JwtAuthGuard } from '../core/guards/jwt-auth.guard';

@ApiTags('Companies')
@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get authenticated company profile' })
  @ApiResponse({ status: 200, description: 'Company profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getProfile(@Request() req) {
    const company = await this.companyService.findOne(req.user.companyId);
    const companyWithUrls = await this.companyService.getCompanyWithSignedUrls(company);
    
    return {
      message: 'Company profile retrieved successfully',
      data: companyWithUrls,
    };
  }

  // ✅ PLACE THIS BEFORE @Get(':id') - Specific routes must come before parameterized routes
  @Get('lead-quota')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get detailed lead quota information',
    description: 'Returns comprehensive information about lead consumption, posting quotas, remaining leads, and next reset date'
  })
  @ApiResponse({ 
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
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getLeadQuotaDetails(@Request() req) {
    const quotaDetails = await this.companyService.getLeadQuotaDetails(req.user.companyId);
    
    return {
      message: 'Lead quota details retrieved successfully',
      data: quotaDetails,
    };
  }

  @Get('consumed-leads')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all leads consumed by the authenticated company' })
  @ApiResponse({ status: 200, description: 'Consumed leads retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getConsumedLeads(@Request() req) {
    return {
      message: 'Consumed leads retrieved successfully',
      data: await this.companyService.getConsumedLeads(req.user.companyId),
    };
  }

  // ⚠️ IMPORTANT: This @Get(':id') must come AFTER all specific routes like 'profile', 'lead-quota', 'consumed-leads'
  @Get(':id')
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiParam({ name: 'id', description: 'Company UUID' })
  @ApiResponse({ status: 200, description: 'Company retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async findOne(@Param('id') id: string) {
    const company = await this.companyService.findOne(id);
    const companyWithUrls = await this.companyService.getCompanyWithSignedUrls(company);
    
    return {
      message: 'Company retrieved successfully',
      data: companyWithUrls,
    };
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'userPhoto', maxCount: 1 },
      { name: 'logo', maxCount: 1 },
      { name: 'coverImage', maxCount: 1 },
    ])
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Update authenticated company profile with file uploads',
    description: 'Update profile with optional file uploads for user photo, logo, and cover image. All fields are optional.'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        // File upload fields
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
        // Text fields from UpdateCompanyDto
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
  })
  @ApiResponse({ status: 200, description: 'Company profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async updateProfile(
    @Request() req, 
    @Body() updateCompanyDto: UpdateCompanyDto,
    @UploadedFiles() files?: { 
      userPhoto?: Express.Multer.File[], 
      logo?: Express.Multer.File[],
      coverImage?: Express.Multer.File[]
    }
  ) {
    const updatedCompany = await this.companyService.updateWithFiles(
      req.user.companyId, 
      updateCompanyDto,
      files
    );
    
    // Generate signed URLs for response
    const companyWithUrls = await this.companyService.getCompanyWithSignedUrls(updatedCompany);
    
    return {
      message: 'Company profile updated successfully',
      data: companyWithUrls,
    };
  }
}