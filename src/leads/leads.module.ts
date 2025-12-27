// src/modules/leads/leads.module.ts - Updated with NotificationsModule
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule } from '@nestjs/config';
import { LeadsService } from './leads.service';
import { AiLeadExtractionService } from './ai-lead-extraction.service';
import { LeadsController } from './leads.controller';
import { AdminLeadsController } from './admin.leads.controller';
import { Lead } from './entities/lead.entity';
import { ConsumedLead } from './entities/consumed-lead.entity';
import { CompanyModule } from '../company/company.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { S3Service } from '../chat/s3.service';
import * as multer from 'multer';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Lead, ConsumedLead]),
    CompanyModule,
    NotificationsModule, // Added
    MulterModule.register({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit for lead images
      },
    }),
  ],
  controllers: [LeadsController, AdminLeadsController],
  providers: [
    LeadsService, 
    AiLeadExtractionService,
    S3Service
  ],
  exports: [LeadsService],
})
export class LeadsModule {}