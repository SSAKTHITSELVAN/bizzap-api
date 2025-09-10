// // src/modules/company/company.controller.ts - Updated with Swagger decorators
// import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
// import { CompanyService } from './company.service';
// import { CreateCompanyDto } from './dto/create-company.dto';
// import { UpdateCompanyDto } from './dto/update-company.dto';
// import { JwtAuthGuard } from '../core/guards/jwt-auth.guard';

// @ApiTags('Companies')
// @Controller('companies')
// export class CompanyController {
//   constructor(private readonly companyService: CompanyService) {}

//   @Get('profile')
//   @UseGuards(JwtAuthGuard)
//   @ApiBearerAuth('JWT-auth')
//   @ApiOperation({ summary: 'Get authenticated company profile' })
//   @ApiResponse({ status: 200, description: 'Company profile retrieved successfully' })
//   @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
//   async getProfile(@Request() req) {
//     return {
//       message: 'Company profile retrieved successfully',
//       data: await this.companyService.findOne(req.user.companyId),
//     };
//   }

//   @Get(':id')
//   @ApiOperation({ summary: 'Get company by ID' })
//   @ApiParam({ name: 'id', description: 'Company UUID' })
//   @ApiResponse({ status: 200, description: 'Company retrieved successfully' })
//   @ApiResponse({ status: 404, description: 'Company not found' })
//   async findOne(@Param('id') id: string) {
//     return {
//       message: 'Company retrieved successfully',
//       data: await this.companyService.findOne(id),
//     };
//   }

//   @Patch('profile')
//   @UseGuards(JwtAuthGuard)
//   @ApiBearerAuth('JWT-auth')
//   @ApiOperation({ summary: 'Update authenticated company profile' })
//   @ApiResponse({ status: 200, description: 'Company profile updated successfully' })
//   @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
//   async updateProfile(@Request() req, @Body() updateCompanyDto: UpdateCompanyDto) {
//     return {
//       message: 'Company profile updated successfully',
//       data: await this.companyService.update(req.user.companyId, updateCompanyDto),
//     };
//   }
// }






// src/modules/company/company.controller.ts - Updated with consumed leads endpoint
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
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
    return {
      message: 'Company profile retrieved successfully',
      data: await this.companyService.findOne(req.user.companyId),
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

  @Get(':id')
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiParam({ name: 'id', description: 'Company UUID' })
  @ApiResponse({ status: 200, description: 'Company retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async findOne(@Param('id') id: string) {
    return {
      message: 'Company retrieved successfully',
      data: await this.companyService.findOne(id),
    };
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update authenticated company profile' })
  @ApiResponse({ status: 200, description: 'Company profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async updateProfile(@Request() req, @Body() updateCompanyDto: UpdateCompanyDto) {
    return {
      message: 'Company profile updated successfully',
      data: await this.companyService.update(req.user.companyId, updateCompanyDto),
    };
  }
}