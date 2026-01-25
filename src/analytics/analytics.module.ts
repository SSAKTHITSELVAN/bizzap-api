// src/analytics/analytics.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsLog } from './entities/analytics-log.entity';
import { Company } from '../company/entities/company.entity'; // 👈 Import Company Entity

@Module({
  imports: [
    TypeOrmModule.forFeature([AnalyticsLog, Company]) // 👈 Add Company here
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}