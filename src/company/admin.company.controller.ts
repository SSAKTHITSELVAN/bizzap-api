// src/modules/company/admin.company.controller.ts - Simplified without payments
import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

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