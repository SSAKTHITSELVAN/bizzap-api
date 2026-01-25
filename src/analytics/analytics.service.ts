// src/analytics/analytics.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsLog } from './entities/analytics-log.entity';
import { CreateAnalyticsDto } from './dto/create-analytics.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(AnalyticsLog)
    private analyticsRepo: Repository<AnalyticsLog>,
  ) {}

  async logScreenView(companyId: string, data: CreateAnalyticsDto) {
    const log = this.analyticsRepo.create({
      ...data,
      companyId, // Successfully links the activity to the logged-in user
    });
    return await this.analyticsRepo.save(log);
  }
}