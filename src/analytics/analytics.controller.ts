// src/analytics/analytics.controller.ts
import { Controller, Post, Get, Body, Req, UseGuards, Query, Logger } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { CreateAnalyticsDto } from './dto/create-analytics.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport'; 

@ApiTags('Analytics')
@ApiBearerAuth('JWT-auth')
@Controller('analytics')
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('track')
  @UseGuards(AuthGuard('jwt')) 
  @ApiOperation({ summary: 'Log user screen time (entry/exit)' })
  async trackScreenView(@Body() createAnalyticsDto: CreateAnalyticsDto, @Req() req) {
    // 🔍 Debug: Print the user object to console if you still have issues
    // console.log('Authenticated User Payload:', req.user);

    // ✅ FIX: Use companyId because your JWT token uses 'companyId'
    // Fallback to 'id' just in case the strategy changes later
    const userId = req.user.companyId || req.user.id; 

    if (!userId) {
      this.logger.error('User ID not found in token payload', req.user);
      // This prevents the DB error by catching it early
      throw new Error('User ID missing from authentication token');
    }

    return this.analyticsService.logScreenView(userId, createAnalyticsDto);
  }

  // ... (Keep the GET endpoints below)
  
  @Get('dashboard/screens')
  @UseGuards(AuthGuard('jwt'))
  async getScreenAnalytics() {
    return this.analyticsService.getScreenAnalytics();
  }

  @Get('dashboard/active-users')
  @UseGuards(AuthGuard('jwt'))
  async getActiveUsers() {
    return this.analyticsService.getActiveUsers();
  }

  @Get('dashboard/user-engagement')
  @UseGuards(AuthGuard('jwt'))
  @ApiQuery({ name: 'period', enum: ['day', 'week', 'month'], required: true })
  @ApiQuery({ name: 'userId', required: false })
  async getUserEngagement(
    @Query('period') period: 'day' | 'week' | 'month',
    @Query('userId') userId?: string
  ) {
    return this.analyticsService.getUserEngagement(period, userId);
  }

  @Get('dashboard/live-distribution')
  @UseGuards(AuthGuard('jwt'))
  async getLiveDistribution() {
    return this.analyticsService.getCurrentUserDistribution();
  }
}