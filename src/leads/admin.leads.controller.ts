
// // src/modules/leads/admin.leads.controller.ts
// import { Controller, Get, Param, Delete } from '@nestjs/common';
// import { LeadsService } from './leads.service';
// import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

// @ApiTags('Admin-Leads')
// @Controller('admin/leads')
// export class AdminLeadsController {
//   constructor(private readonly leadsService: LeadsService) {}

//   @Get('metrics/daily')
//   @ApiOperation({ summary: 'Get lead creation count per day (admin only)' })
//   @ApiResponse({ status: 200, description: 'Daily lead count retrieved successfully' })
//   async getDailyLeadMetrics() {
//     return {
//       message: 'Daily lead count retrieved successfully',
//       data: await this.leadsService.getLeadCountByDate(),
//     };
//   }

//   @Get('metrics/monthly')
//   @ApiOperation({ summary: 'Get lead creation count per month (admin only)' })
//   @ApiResponse({ status: 200, description: 'Monthly lead count retrieved successfully' })
//   async getMonthlyLeadMetrics() {
//     return {
//       message: 'Monthly lead count retrieved successfully',
//       data: await this.leadsService.getLeadCountByMonth(),
//     };
//   }

//   @Get('metrics/total')
//   @ApiOperation({ summary: 'Get total lead counts (admin only)' })
//   @ApiResponse({ status: 200, description: 'Total lead counts retrieved successfully' })
//   async getTotalLeadMetrics() {
//     const totalLeads = await this.leadsService.getTotalLeadCount();
//     const totalActiveLeads = await this.leadsService.getTotalActiveLeads();
//     const totalConsumedLeads = await this.leadsService.getTotalConsumedLeads();
//     return {
//       message: 'Total lead metrics retrieved successfully',
//       data: {
//         totalLeads,
//         totalActiveLeads,
//         totalConsumedLeads,
//       },
//     };
//   }
  
//   @Get('metrics/conversion-rate')
//   @ApiOperation({ summary: 'Get lead conversion rate (admin only)' })
//   @ApiResponse({ status: 200, description: 'Lead conversion rate retrieved successfully' })
//   async getLeadConversionRate() {
//     return {
//       message: 'Lead conversion rate retrieved successfully',
//       data: await this.leadsService.getLeadConversionRate(),
//     };
//   }

//   @Get('metrics/avg-consumptions')
//   @ApiOperation({ summary: 'Get average consumptions per company (admin only)' })
//   @ApiResponse({ status: 200, description: 'Average consumptions per company retrieved successfully' })
//   async getAverageConsumptions() {
//     return {
//       message: 'Average consumptions per company retrieved successfully',
//       data: {
//         averageConsumptions: await this.leadsService.getAverageConsumptionsPerCompany(),
//       },
//     };
//   }

//   @Get('metrics/supply-demand')
//   @ApiOperation({ summary: 'Get lead supply vs. demand ratio (admin only)' })
//   @ApiResponse({ status: 200, description: 'Lead supply-demand ratio retrieved successfully' })
//   async getSupplyDemandRatio() {
//     return {
//       message: 'Lead supply-demand ratio retrieved successfully',
//       data: await this.leadsService.getLeadSupplyDemandRatio(),
//     };
//   }
  
//   @Get('metrics/locations')
//   @ApiOperation({ summary: 'Get most popular lead locations (admin only)' })
//   @ApiResponse({ status: 200, description: 'Top lead locations retrieved successfully' })
//   async getLeadsByLocation() {
//     return {
//       message: 'Top lead locations retrieved successfully',
//       data: await this.leadsService.getTopLeadLocations(),
//     };
//   }
  
//   @Get('metrics/churn-rate')
//   @ApiOperation({ summary: 'Get lead churn rate (leads with 0 views/consumptions) (admin only)' })
//   @ApiResponse({ status: 200, description: 'Lead churn rate retrieved successfully' })
//   async getLeadChurnRate() {
//     return {
//       message: 'Lead churn rate retrieved successfully',
//       data: await this.leadsService.getLeadChurnRate(),
//     };
//   }

//   @Get('metrics/consumed')
//   @ApiOperation({ summary: 'Get a list of most consumed leads (admin only)' })
//   @ApiResponse({ status: 200, description: 'Most consumed leads retrieved successfully' })
//   async getMostConsumedLeads() {
//     return {
//       message: 'Most consumed leads retrieved successfully',
//       data: await this.leadsService.getMostConsumedLeads(),
//     };
//   }

//   @Get('metrics/viewed')
//   @ApiOperation({ summary: 'Get a list of most viewed leads (admin only)' })
//   @ApiResponse({ status: 200, description: 'Most viewed leads retrieved successfully' })
//   async getMostViewedLeads() {
//     return {
//       message: 'Most viewed leads retrieved successfully',
//       data: await this.leadsService.getMostViewedLeads(),
//     };
//   }

//   @Get('metrics/lifespan')
//   @ApiOperation({ summary: 'Get average lead lifespan in days (admin only)' })
//   @ApiResponse({ status: 200, description: 'Average lead lifespan retrieved successfully' })
//   async getAverageLeadLifespan() {
//     const lifespanInDays = await this.leadsService.getAverageLeadLifespan();
//     return {
//       message: 'Average lead lifespan retrieved successfully',
//       data: {
//         averageLifespanInDays: lifespanInDays,
//       },
//     };
//   }
  
//   @Get(':companyId/metrics/leads-summary')
//   @ApiOperation({ summary: 'Get lead metrics for a specific company (admin only)' })
//   @ApiParam({ name: 'companyId', description: 'Company UUID' })
//   @ApiResponse({ status: 200, description: 'Company-specific lead metrics retrieved successfully' })
//   async getCompanyLeadMetrics(@Param('companyId') companyId: string) {
//     const totalLeads = await this.leadsService.getCompanyTotalLeadsPosted(companyId);
//     const activeLeads = await this.leadsService.getCompanyActiveLeads(companyId);
//     const consumedLeads = await this.leadsService.getCompanyConsumedLeads(companyId);
//     const availabilityRatio = await this.leadsService.getCompanyLeadAvailabilityRatio(companyId);

//     return {
//       message: `Lead metrics for company ${companyId} retrieved successfully`,
//       data: {
//         totalLeadsPosted: totalLeads,
//         totalActiveLeads: activeLeads,
//         totalConsumedLeads: consumedLeads,
//         leadAvailabilityRatio: availabilityRatio,
//       },
//     };
//   }
  
//   // Standard CRUD endpoints
//   @Get()
//   async findAll() {
//     return {
//       message: 'All leads retrieved successfully',
//       data: await this.leadsService.findAll(),
//     };
//   }
  
//   @Get(':id')
//   async findOne(@Param('id') id: string) {
//     return {
//       message: 'Lead retrieved successfully',
//       data: await this.leadsService.findOne(id),
//     };
//   }

//   @Delete(':id')
//   async remove(@Param('id') id: string) {
//     // Admin can delete any lead - pass empty companyId to bypass ownership check
//     await this.leadsService.remove(id, '');
//     return {
//       message: 'Lead deleted successfully',
//       data: null,
//     };
//   }
// }






//################################################################################
// Leads with reason
//################################################################################


// src/modules/leads/admin.leads.controller.ts
import { Controller, Get, Param, Delete } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Admin-Leads')
@Controller('admin/leads')
export class AdminLeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get('metrics/daily')
  @ApiOperation({ summary: 'Get lead creation count per day (admin only)' })
  @ApiResponse({ status: 200, description: 'Daily lead count retrieved successfully' })
  async getDailyLeadMetrics() {
    return {
      message: 'Daily lead count retrieved successfully',
      data: await this.leadsService.getLeadCountByDate(),
    };
  }

  @Get('metrics/monthly')
  @ApiOperation({ summary: 'Get lead creation count per month (admin only)' })
  @ApiResponse({ status: 200, description: 'Monthly lead count retrieved successfully' })
  async getMonthlyLeadMetrics() {
    return {
      message: 'Monthly lead count retrieved successfully',
      data: await this.leadsService.getLeadCountByMonth(),
    };
  }

  @Get('metrics/total')
  @ApiOperation({ summary: 'Get total lead counts (admin only)' })
  @ApiResponse({ status: 200, description: 'Total lead counts retrieved successfully' })
  async getTotalLeadMetrics() {
    const totalLeads = await this.leadsService.getTotalLeadCount();
    const totalActiveLeads = await this.leadsService.getTotalActiveLeads();
    const totalConsumedLeads = await this.leadsService.getTotalConsumedLeads();
    return {
      message: 'Total lead metrics retrieved successfully',
      data: {
        totalLeads,
        totalActiveLeads,
        totalConsumedLeads,
      },
    };
  }
  
  @Get('metrics/conversion-rate')
  @ApiOperation({ summary: 'Get lead conversion rate (admin only)' })
  @ApiResponse({ status: 200, description: 'Lead conversion rate retrieved successfully' })
  async getLeadConversionRate() {
    return {
      message: 'Lead conversion rate retrieved successfully',
      data: await this.leadsService.getLeadConversionRate(),
    };
  }

  @Get('metrics/avg-consumptions')
  @ApiOperation({ summary: 'Get average consumptions per company (admin only)' })
  @ApiResponse({ status: 200, description: 'Average consumptions per company retrieved successfully' })
  async getAverageConsumptions() {
    return {
      message: 'Average consumptions per company retrieved successfully',
      data: {
        averageConsumptions: await this.leadsService.getAverageConsumptionsPerCompany(),
      },
    };
  }

  @Get('metrics/supply-demand')
  @ApiOperation({ summary: 'Get lead supply vs. demand ratio (admin only)' })
  @ApiResponse({ status: 200, description: 'Lead supply-demand ratio retrieved successfully' })
  async getSupplyDemandRatio() {
    return {
      message: 'Lead supply-demand ratio retrieved successfully',
      data: await this.leadsService.getLeadSupplyDemandRatio(),
    };
  }
  
  @Get('metrics/locations')
  @ApiOperation({ summary: 'Get most popular lead locations (admin only)' })
  @ApiResponse({ status: 200, description: 'Top lead locations retrieved successfully' })
  async getLeadsByLocation() {
    return {
      message: 'Top lead locations retrieved successfully',
      data: await this.leadsService.getTopLeadLocations(),
    };
  }
  
  @Get('metrics/churn-rate')
  @ApiOperation({ summary: 'Get lead churn rate (leads with 0 views/consumptions) (admin only)' })
  @ApiResponse({ status: 200, description: 'Lead churn rate retrieved successfully' })
  async getLeadChurnRate() {
    return {
      message: 'Lead churn rate retrieved successfully',
      data: await this.leadsService.getLeadChurnRate(),
    };
  }

  @Get('metrics/consumed')
  @ApiOperation({ summary: 'Get a list of most consumed leads (admin only)' })
  @ApiResponse({ status: 200, description: 'Most consumed leads retrieved successfully' })
  async getMostConsumedLeads() {
    return {
      message: 'Most consumed leads retrieved successfully',
      data: await this.leadsService.getMostConsumedLeads(),
    };
  }

  @Get('metrics/viewed')
  @ApiOperation({ summary: 'Get a list of most viewed leads (admin only)' })
  @ApiResponse({ status: 200, description: 'Most viewed leads retrieved successfully' })
  async getMostViewedLeads() {
    return {
      message: 'Most viewed leads retrieved successfully',
      data: await this.leadsService.getMostViewedLeads(),
    };
  }

  @Get('metrics/lifespan')
  @ApiOperation({ summary: 'Get average lead lifespan in days (admin only)' })
  @ApiResponse({ status: 200, description: 'Average lead lifespan retrieved successfully' })
  async getAverageLeadLifespan() {
    const lifespanInDays = await this.leadsService.getAverageLeadLifespan();
    return {
      message: 'Average lead lifespan retrieved successfully',
      data: {
        averageLifespanInDays: lifespanInDays,
      },
    };
  }
  
  @Get('status/all-deactivated')
  @ApiOperation({ summary: 'Get all deactivated leads (both inactive and deleted) (admin only)' })
  @ApiResponse({ status: 200, description: 'All deactivated leads retrieved successfully' })
  async getAllDeactivatedLeads() {
    return {
      message: 'All deactivated leads retrieved successfully',
      data: await this.leadsService.getAllDeactivatedLeads(),
    };
  }

  @Get('status/inactive')
  @ApiOperation({ summary: 'Get inactive leads with their deactivation reasons (admin only)' })
  @ApiResponse({ status: 200, description: 'Inactive leads retrieved successfully' })
  async getInactiveLeads() {
    return {
      message: 'Inactive leads retrieved successfully',
      data: await this.leadsService.getInactiveLeads(),
    };
  }

  @Get('status/deleted')
  @ApiOperation({ summary: 'Get all deleted leads (admin only)' })
  @ApiResponse({ status: 200, description: 'Deleted leads retrieved successfully' })
  async getDeletedLeads() {
    return {
      message: 'Deleted leads retrieved successfully',
      data: await this.leadsService.getDeletedLeads(),
    };
  }

  @Get('status/inactive/by-reason')
  @ApiOperation({ summary: 'Get inactive leads grouped by deactivation reason (admin only)' })
  @ApiResponse({ status: 200, description: 'Inactive leads grouped by reason retrieved successfully' })
  async getInactiveLeadsByReason() {
    return {
      message: 'Inactive leads grouped by reason retrieved successfully',
      data: await this.leadsService.getInactiveLeadsByReason(),
    };
  }
  
  @Get(':companyId/metrics/leads-summary')
  @ApiOperation({ summary: 'Get lead metrics for a specific company (admin only)' })
  @ApiParam({ name: 'companyId', description: 'Company UUID' })
  @ApiResponse({ status: 200, description: 'Company-specific lead metrics retrieved successfully' })
  async getCompanyLeadMetrics(@Param('companyId') companyId: string) {
    const totalLeads = await this.leadsService.getCompanyTotalLeadsPosted(companyId);
    const activeLeads = await this.leadsService.getCompanyActiveLeads(companyId);
    const consumedLeads = await this.leadsService.getCompanyConsumedLeads(companyId);
    const availabilityRatio = await this.leadsService.getCompanyLeadAvailabilityRatio(companyId);

    return {
      message: `Lead metrics for company ${companyId} retrieved successfully`,
      data: {
        totalLeadsPosted: totalLeads,
        totalActiveLeads: activeLeads,
        totalConsumedLeads: consumedLeads,
        leadAvailabilityRatio: availabilityRatio,
      },
    };
  }
  
  // Standard CRUD endpoints
  @Get()
  async findAll() {
    return {
      message: 'All leads retrieved successfully',
      data: await this.leadsService.findAll(),
    };
  }
  
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return {
      message: 'Lead retrieved successfully',
      data: await this.leadsService.findOne(id),
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    // Admin can delete any lead - pass empty companyId to bypass ownership check
    await this.leadsService.remove(id, '');
    return {
      message: 'Lead deleted successfully',
      data: null,
    };
  }
}