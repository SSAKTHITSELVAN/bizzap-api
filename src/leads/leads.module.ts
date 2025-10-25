
// src/modules/leads/leads.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule } from '@nestjs/config';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { AdminLeadsController } from './admin.leads.controller';
import { Lead } from './entities/lead.entity';
import { ConsumedLead } from './entities/consumed-lead.entity';
import { CompanyModule } from '../company/company.module';
import { S3Service } from '../chat/s3.service'; // Import S3Service from chat module
import * as multer from 'multer';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Lead, ConsumedLead]),
    CompanyModule,
    MulterModule.register({
      storage: multer.memoryStorage(), // Store files in memory for direct S3 upload
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit for lead images
      },
    }),
  ],
  controllers: [LeadsController, AdminLeadsController],
  providers: [LeadsService, S3Service], // Add S3Service as provider
  exports: [LeadsService],
})
export class LeadsModule {}