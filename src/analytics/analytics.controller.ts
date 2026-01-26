import { Controller, Post, Get, Body, Req, UseGuards, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { CreateAnalyticsDto } from './dto/create-analytics.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport'; // 👈 Ensure this is imported

@ApiTags('Analytics')
@ApiBearerAuth('JWT-auth') // 👈 This is just for Swagger UI documentation
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('track')
  @UseGuards(AuthGuard('jwt')) // 👈 THIS WAS MISSING. It creates req.user
  @ApiOperation({ summary: 'Log user screen time (entry/exit)' })
  async trackScreenView(@Body() createAnalyticsDto: CreateAnalyticsDto, @Req() req) {
    // Now req.user is guaranteed to exist
    const userId = req.user.companyId;
    return this.analyticsService.logScreenView(userId, createAnalyticsDto);
  }

  
  @Get('dashboard/screens')
  @UseGuards(AuthGuard('jwt')) // 👈 Good practice to secure these too
  @ApiOperation({ summary: 'Get popularity and avg time for all screens' })
  async getScreenAnalytics() {
    return this.analyticsService.getScreenAnalytics();
  }

  @Get('dashboard/active-users')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get list of users active in the last 5 minutes' })
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
  @ApiOperation({ summary: 'Count and list of active users per screen' })
  async getLiveDistribution() {
    return this.analyticsService.getCurrentUserDistribution();
  }
}