// src/modules/company/company.module.ts - Simplified without payments
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { AdminCompanyController } from './admin.company.controller';
import { Company } from './entities/company.entity';
import { ConsumedLead } from '../leads/entities/consumed-lead.entity';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(), // Enable cron jobs for monthly quota reset
    TypeOrmModule.forFeature([Company, ConsumedLead]),
    ChatModule,
  ],
  controllers: [CompanyController, AdminCompanyController],
  providers: [CompanyService],
  exports: [CompanyService],
})
export class CompanyModule {}