import { Controller, Post, Get, Body, Req, UseGuards, Query, Logger } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { CreateAnalyticsDto } from './dto/create-analytics.dto';
import { LogSessionDto } from './dto/log-session.dto'; // 👈 Import new DTO
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Analytics')
@ApiBearerAuth('JWT-auth')
@Controller('analytics')
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  // =================================================================
  // 📥 INPUT ENDPOINTS (Track Activity)
  // =================================================================

  @Post('track')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Log user screen time (entry/exit)' })
  async trackScreenView(@Body() createAnalyticsDto: CreateAnalyticsDto, @Req() req) {
    const userId = req.user.companyId || req.user.id;
    if (!userId) {
      this.logger.error('User ID not found in token payload', req.user);
      throw new Error('User ID missing from authentication token');
    }
    return this.analyticsService.logScreenView(userId, createAnalyticsDto);
  }

  @Post('session')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Log App Open/Close events for Live Status' })
  async logSession(@Body() logSessionDto: LogSessionDto, @Req() req) { // 👈 Use DTO
    const userId = req.user.companyId || req.user.id;
    return this.analyticsService.logSessionEvent(userId, logSessionDto.status);
  }

  // =================================================================
  // 📊 OUTPUT ENDPOINTS (Dashboard Data)
  // =================================================================

  @Get('dashboard/screens')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get popularity and avg time for all screens' })
  async getScreenAnalytics() {
    return this.analyticsService.getScreenAnalytics();
  }

  @Get('dashboard/active-users')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get list of users active in the last 10 minutes (Excludes closed app)' })
  async getActiveUsers() {
    return this.analyticsService.getActiveUsers();
  }

  @Get('dashboard/user-engagement')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Top users by time spent with detailed breakdown' })
  @ApiQuery({ name: 'period', enum: ['day', 'week', 'month'], required: true })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by specific User ID' })
  async getUserEngagement(
    @Query('period') period: 'day' | 'week' | 'month',
    @Query('userId') userId?: string
  ) {
    return this.analyticsService.getUserEngagement(period, userId);
  }

  @Get('dashboard/live-distribution')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Count and list of active users per screen (Unique users only)' })
  async getLiveDistribution() {
    return this.analyticsService.getCurrentUserDistribution();
  }
}