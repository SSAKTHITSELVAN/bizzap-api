// src/analytics/analytics.controller.ts
import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { CreateAnalyticsDto } from './dto/create-analytics.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
// Assuming you have a standard JwtAuthGuard (standard in NestJS auth setups)
import { AuthGuard } from '@nestjs/passport'; 

@ApiTags('Analytics')
@ApiBearerAuth('JWT-auth')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('track')
  @UseGuards(AuthGuard('jwt')) // Ensures we know WHO the user is
  @ApiOperation({ summary: 'Log user screen time and activity' })
  async trackScreenView(@Body() createAnalyticsDto: CreateAnalyticsDto, @Req() req) {
    // req.user is populated by the JWT Guard from your auth module
    const userId = req.user.id; 
    return this.analyticsService.logScreenView(userId, createAnalyticsDto);
  }
}