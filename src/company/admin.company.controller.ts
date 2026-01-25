// src/modules/company/admin.company.controller.ts - WITH COMPREHENSIVE ANALYTICS
import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { SignupAnalyticsQueryDto } from './dto/signup-analytics-query.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';

@ApiTags('Admin-Companies')
@Controller('admin/companies')
export class AdminCompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new company (admin only)' })
  @ApiResponse({ status: 201, description: 'Company created successfully' })
  async create(@Body() createCompanyDto: CreateCompanyDto) {
    return {
      message: 'Company created successfully',
      data: await this.companyService.create(createCompanyDto),
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all companies (admin only)' })
  @ApiResponse({ status: 200, description: 'Companies retrieved successfully' })
  async findAll() {
    return {
      message: 'Companies retrieved successfully',
      data: await this.companyService.findAll(),
    };
  }

  @Get('metrics/active-users')
  @ApiOperation({ summary: 'Get active user metrics (DAU, WAU, MAU)' })
  @ApiResponse({ status: 200, description: 'Active user metrics retrieved successfully' })
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
  
  @Get('metrics/company-breakdown')
  @ApiOperation({ summary: 'Get various company metrics' })
  @ApiResponse({ status: 200, description: 'Company metrics retrieved successfully' })
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

  // ==========================================
  // NEW COMPREHENSIVE SIGNUP ANALYTICS
  // ==========================================

  @Get('analytics/signups/daily')
  @ApiOperation({ 
    summary: 'Get daily new signups with optional date filtering',
    description: 'Returns list of companies registered per day with details. Use startDate and endDate to filter specific date range.'
  })
  @ApiQuery({ name: 'startDate', required: false, type: String, example: '2025-01-01', description: 'Start date (YYYY-MM-DD format)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, example: '2025-01-31', description: 'End date (YYYY-MM-DD format)' })
  @ApiResponse({ 
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
  })
  async getDailySignups(@Query() query: SignupAnalyticsQueryDto) {
    const data = await this.companyService.getDailySignupAnalytics(query.startDate, query.endDate);
    return {
      message: 'Daily signup analytics retrieved successfully',
      data,
    };
  }

  @Get('analytics/signups/weekly')
  @ApiOperation({ 
    summary: 'Get weekly new signups with optional date filtering',
    description: 'Returns list of companies registered per week with details. Use startDate and endDate to filter specific date range.'
  })
  @ApiQuery({ name: 'startDate', required: false, type: String, example: '2025-01-01', description: 'Start date (YYYY-MM-DD format)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, example: '2025-01-31', description: 'End date (YYYY-MM-DD format)' })
  @ApiResponse({ 
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
  })
  async getWeeklySignups(@Query() query: SignupAnalyticsQueryDto) {
    const data = await this.companyService.getWeeklySignupAnalytics(query.startDate, query.endDate);
    return {
      message: 'Weekly signup analytics retrieved successfully',
      data,
    };
  }

  @Get('analytics/signups/monthly')
  @ApiOperation({ 
    summary: 'Get monthly new signups with optional date filtering',
    description: 'Returns list of companies registered per month with details. Use startDate and endDate to filter specific date range.'
  })
  @ApiQuery({ name: 'startDate', required: false, type: String, example: '2025-01-01', description: 'Start date (YYYY-MM-DD format)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, example: '2025-12-31', description: 'End date (YYYY-MM-DD format)' })
  @ApiResponse({ 
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
  })
  async getMonthlySignups(@Query() query: SignupAnalyticsQueryDto) {
    const data = await this.companyService.getMonthlySignupAnalytics(query.startDate, query.endDate);
    return {
      message: 'Monthly signup analytics retrieved successfully',
      data,
    };
  }

  @Get('analytics/signups/yearly')
  @ApiOperation({ 
    summary: 'Get yearly new signups with optional date filtering',
    description: 'Returns list of companies registered per year with details. Use startDate and endDate to filter specific date range.'
  })
  @ApiQuery({ name: 'startDate', required: false, type: String, example: '2024-01-01', description: 'Start date (YYYY-MM-DD format)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, example: '2025-12-31', description: 'End date (YYYY-MM-DD format)' })
  @ApiResponse({ 
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
  })
  async getYearlySignups(@Query() query: SignupAnalyticsQueryDto) {
    const data = await this.companyService.getYearlySignupAnalytics(query.startDate, query.endDate);
    return {
      message: 'Yearly signup analytics retrieved successfully',
      data,
    };
  }

  @Get('analytics/signups/summary')
  @ApiOperation({ 
    summary: 'Get comprehensive signup summary with all time periods',
    description: 'Returns signup counts for today, this week, this month, this year, and all time with growth percentages.'
  })
  @ApiResponse({ 
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
  })
  async getSignupSummary() {
    const data = await this.companyService.getSignupSummary();
    return {
      message: 'Signup summary retrieved successfully',
      data,
    };
  }

  // ==========================================
  // EXISTING ENDPOINTS (UNCHANGED)
  // ==========================================
  
  @Get(':id/profile-completion')
  @ApiOperation({ summary: 'Get profile completion percentage for a specific company by ID (admin only)' })
  @ApiParam({ name: 'id', description: 'Company UUID' })
  @ApiResponse({ status: 200, description: 'Profile completion percentage retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async getCompanyProfileCompletion(@Param('id') id: string) {
    const completionPercentage = await this.companyService.getCompanyProfileCompletion(id);
    return {
      message: 'Profile completion percentage retrieved successfully',
      data: {
        companyId: id,
        completionPercentage: completionPercentage,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific company by ID (admin only)' })
  @ApiParam({ name: 'id', description: 'Company UUID' })
  @ApiResponse({ status: 200, description: 'Company retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async findOne(@Param('id') id: string) {
    const company = await this.companyService.findOne(id);
    
    return {
      message: 'Company retrieved successfully',
      data: company,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a company (admin only)' })
  @ApiParam({ name: 'id', description: 'Company UUID' })
  @ApiResponse({ status: 200, description: 'Company updated successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async update(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto) {
    return {
      message: 'Company updated successfully',
      data: await this.companyService.update(id, updateCompanyDto),
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a company (admin only)' })
  @ApiParam({ name: 'id', description: 'Company UUID' })
  @ApiResponse({ status: 200, description: 'Company deleted successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async remove(@Param('id') id: string) {
    await this.companyService.remove(id);
    return {
      message: 'Company deleted successfully',
      data: null,
    };
  }
}