
// src/modules/leads/leads.controller.ts - Final Version
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { DeactivateLeadDto } from './dto/deactivate-lead.dto';
import { JwtAuthGuard } from '../core/guards/jwt-auth.guard';

@ApiTags('Leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new lead' })
  @ApiResponse({ status: 201, description: 'Lead created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async create(@Request() req, @Body() createLeadDto: CreateLeadDto) {
    return {
      message: 'Lead created successfully',
      data: await this.leadsService.create(req.user.companyId, createLeadDto),
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all active leads' })
  @ApiResponse({ status: 200, description: 'Leads retrieved successfully' })
  async findAll() {
    return {
      message: 'Leads retrieved successfully',
      data: await this.leadsService.findAll(),
    };
  }

  @Get('my-leads')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get authenticated company leads' })
  @ApiResponse({ status: 200, description: 'My leads retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async findMyLeads(@Request() req) {
    return {
      message: 'My leads retrieved successfully',
      data: await this.leadsService.findByCompany(req.user.companyId),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lead by ID' })
  @ApiParam({ name: 'id', description: 'Lead UUID' })
  @ApiResponse({ status: 200, description: 'Lead retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async findOne(@Param('id') id: string) {
    return {
      message: 'Lead retrieved successfully',
      data: await this.leadsService.findOne(id),
    };
  }

  @Post(':id/consume')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Consume a lead to get contact information' })
  @ApiParam({ name: 'id', description: 'Lead UUID' })
  @ApiResponse({ status: 200, description: 'Lead consumed successfully or insufficient quota' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Cannot consume your own lead' })
  async consumeLead(@Param('id') id: string, @Request() req) {
    const result = await this.leadsService.consumeLead(id, req.user.companyId);
    return {
      message: result.success ? 'Lead consumed successfully' : 'Insufficient lead quota',
      data: result,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a lead' })
  @ApiParam({ name: 'id', description: 'Lead UUID' })
  @ApiResponse({ status: 200, description: 'Lead updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Can only update your own leads' })
  async update(@Param('id') id: string, @Request() req, @Body() updateLeadDto: UpdateLeadDto) {
    return {
      message: 'Lead updated successfully',
      data: await this.leadsService.update(id, req.user.companyId, updateLeadDto),
    };
  }

  @Patch(':id/status/:isActive')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Toggle the active status of a lead' })
  @ApiParam({ name: 'id', description: 'Lead UUID' })
  @ApiParam({ name: 'isActive', description: 'Boolean status (true for active, false for inactive)' })
  @ApiResponse({ status: 200, description: 'Lead status updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async toggleActiveStatus(@Param('id') id: string, @Param('isActive') isActive: string, @Request() req) {
    const status = isActive.toLowerCase() === 'true';
    const lead = await this.leadsService.toggleActiveStatus(id, req.user.companyId, status);
    return {
      message: `Lead has been ${status ? 'activated' : 'deactivated'}`,
      data: lead,
    };
  }

  @Patch(':id/deactivate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Deactivate a lead with reason' })
  @ApiParam({ name: 'id', description: 'Lead UUID' })
  @ApiResponse({ status: 200, description: 'Lead deactivated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deactivateLead(@Param('id') id: string, @Request() req, @Body() deactivateLeadDto: DeactivateLeadDto) {
    const lead = await this.leadsService.deactivateLeadWithReason(id, req.user.companyId, deactivateLeadDto.reasonForDeactivation);
    return {
      message: 'Lead has been deactivated',
      data: lead,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a lead' })
  @ApiParam({ name: 'id', description: 'Lead UUID' })
  @ApiResponse({ status: 200, description: 'Lead deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Can only delete your own leads' })
  async remove(@Param('id') id: string, @Request() req) {
    await this.leadsService.remove(id, req.user.companyId);
    return {
      message: 'Lead deleted successfully',
      data: null,
    };
  }
}
