// src/modules/company/company.module.ts (Updated)
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { AdminCompanyController } from './admin.company.controller';
import { Company } from './entities/company.entity';
import { Subscription } from './entities/subscription.entity';
import { PaymentHistory } from './entities/payment-history.entity';
import { ConsumedLead } from '../leads/entities/consumed-lead.entity';
import { RazorpayService } from './razorpay.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Company, ConsumedLead, Subscription, PaymentHistory]),
  ],
  controllers: [CompanyController, AdminCompanyController],
  providers: [CompanyService, RazorpayService],
  exports: [CompanyService, RazorpayService],
})
export class CompanyModule {}