// src/modules/company/company.module.ts - UPDATED with ScheduleModule for Cron Jobs
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule'; // 🆕 Import ScheduleModule for cron jobs
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { AdminCompanyController } from './admin.company.controller';
import { Company } from './entities/company.entity';
import { Subscription } from './entities/subscription.entity';
import { PaymentHistory } from './entities/payment-history.entity';
import { ConsumedLead } from '../leads/entities/consumed-lead.entity';
import { RazorpayService } from './razorpay.service';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(), // 🆕 Enable cron jobs
    TypeOrmModule.forFeature([Company, ConsumedLead, Subscription, PaymentHistory]),
    ChatModule,
  ],
  controllers: [CompanyController, AdminCompanyController],
  providers: [CompanyService, RazorpayService],
  exports: [CompanyService, RazorpayService],
})
export class CompanyModule {}