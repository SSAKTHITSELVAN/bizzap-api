// src/modules/leads/admin.leads.controller.ts - FIXED for Swagger
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
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { DeactivateLeadDto } from './dto/deactivate-lead.dto';
import { JwtAuthGuard } from '../core/guards/jwt-auth.guard';

// ✅ FIX: Add the correct ApiTags decorator
@ApiTags('Admin-Leads')
@Controller('admin/leads')  // Note: admin prefix in route
@UseGuards(JwtAuthGuard)     // All admin routes require authentication
@ApiBearerAuth('JWT-auth')
export class AdminLeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  // ===========================================================
  // 🆕 ADMIN: CONSUMED LEAD STATUS & ANALYTICS ENDPOINTS
  // ===========================================================

  @Get('consumed-leads')
  @ApiOperation({ 
    summary: '[ADMIN] Get all consumed leads with status',
    description: 'Returns all consumed leads across all companies with deal status tracking'
  })
  @ApiResponse({ 
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
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAllConsumedLeadsWithStatus() {
    const consumedLeads = await this.leadsService.getAllConsumedLeadsWithStatus();
    return {
      message: 'All consumed leads retrieved successfully',
      data: consumedLeads,
    };
  }

  @Get('consumed-leads/metrics')
  @ApiOperation({ 
    summary: '[ADMIN] Get comprehensive conversion metrics',
    description: 'Returns overall conversion rates, deal values, and company performance metrics'
  })
  @ApiResponse({ 
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
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getConsumedLeadMetrics() {
    const metrics = await this.leadsService.getConsumedLeadMetrics();
    return {
      message: 'Conversion metrics retrieved successfully',
      data: metrics,
    };
  }

  @Get('consumed-leads/company/:companyId')
  @ApiOperation({ 
    summary: '[ADMIN] Get consumed leads for a specific company',
    description: 'Returns all leads consumed by a specific company with their deal statuses'
  })
  @ApiParam({ name: 'companyId', description: 'Company UUID' })
  @ApiResponse({ 
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
  })
  @ApiResponse({ status: 404, description: 'Company not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCompanyConsumedLeads(@Param('companyId') companyId: string) {
    const consumedLeads = await this.leadsService.getCompanyConsumedLeadsWithStatus(companyId);
    return {
      message: 'Company consumed leads retrieved successfully',
      data: consumedLeads,
    };
  }

  @Get('consumed-leads/company/:companyId/metrics')
  @ApiOperation({ 
    summary: '[ADMIN] Get conversion metrics for a specific company',
    description: 'Returns detailed conversion analytics for a single company'
  })
  @ApiParam({ name: 'companyId', description: 'Company UUID' })
  @ApiResponse({ 
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
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCompanyConversionMetrics(@Param('companyId') companyId: string) {
    const metrics = await this.leadsService.getCompanyConversionMetrics(companyId);
    return {
      message: 'Company conversion metrics retrieved successfully',
      data: metrics,
    };
  }

  // ===========================================================
  // ADMIN: GENERAL LEAD ANALYTICS
  // ===========================================================

  @Get('analytics/most-consumed')
  @ApiOperation({ 
    summary: '[ADMIN] Get most consumed leads',
    description: 'Returns leads with highest consumption count'
  })
  @ApiResponse({ status: 200, description: 'Most consumed leads retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMostConsumedLeads() {
    const leads = await this.leadsService.getMostConsumedLeads(10);
    return {
      message: 'Most consumed leads retrieved successfully',
      data: leads,
    };
  }

  @Get('analytics/most-viewed')
  @ApiOperation({ 
    summary: '[ADMIN] Get most viewed leads',
    description: 'Returns leads with highest view count'
  })
  @ApiResponse({ status: 200, description: 'Most viewed leads retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMostViewedLeads() {
    const leads = await this.leadsService.getMostViewedLeads(10);
    return {
      message: 'Most viewed leads retrieved successfully',
      data: leads,
    };
  }

  @Get('analytics/by-location')
  @ApiOperation({ 
    summary: '[ADMIN] Get leads grouped by location',
    description: 'Returns lead distribution by location'
  })
  @ApiResponse({ status: 200, description: 'Leads by location retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getLeadsByLocation() {
    const locations = await this.leadsService.getLeadsByLocation();
    return {
      message: 'Leads by location retrieved successfully',
      data: locations,
    };
  }

  @Get('analytics/deactivated')
  @ApiOperation({ 
    summary: '[ADMIN] Get all deactivated/inactive leads',
    description: 'Returns leads that have been deactivated with reasons'
  })
  @ApiResponse({ status: 200, description: 'Deactivated leads retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDeactivatedLeads() {
    const result = await this.leadsService.getAllDeactivatedLeads();
    return {
      message: 'Deactivated leads retrieved successfully',
      data: result,
    };
  }

  @Get('analytics/deactivated/by-reason')
  @ApiOperation({ 
    summary: '[ADMIN] Get deactivated leads grouped by reason',
    description: 'Returns count of deactivated leads by deactivation reason'
  })
  @ApiResponse({ status: 200, description: 'Deactivation reasons retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDeactivatedLeadsByReason() {
    const reasons = await this.leadsService.getDeactivatedLeadsByReason();
    return {
      message: 'Deactivated leads by reason retrieved successfully',
      data: reasons,
    };
  }

  @Get('analytics/count-by-date')
  @ApiOperation({ 
    summary: '[ADMIN] Get lead count by date',
    description: 'Returns daily lead creation counts'
  })
  @ApiResponse({ status: 200, description: 'Lead counts by date retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getLeadCountByDate() {
    const counts = await this.leadsService.getLeadCountByDate();
    return {
      message: 'Lead count by date retrieved successfully',
      data: counts,
    };
  }

  @Get('analytics/count-by-month')
  @ApiOperation({ 
    summary: '[ADMIN] Get lead count by month',
    description: 'Returns monthly lead creation counts'
  })
  @ApiResponse({ status: 200, description: 'Lead counts by month retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getLeadCountByMonth() {
    const counts = await this.leadsService.getLeadCountByMonth();
    return {
      message: 'Lead count by month retrieved successfully',
      data: counts,
    };
  }

  @Get('analytics/summary')
  @ApiOperation({ 
    summary: '[ADMIN] Get overall lead analytics summary',
    description: 'Returns comprehensive lead statistics and metrics'
  })
  @ApiResponse({ 
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
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
}