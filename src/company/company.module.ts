// src/modules/company/company.module.ts - Updated to include ConsumedLead entity
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { AdminCompanyController } from './admin.company.controller';
import { Company } from './entities/company.entity';
import { ConsumedLead } from '../leads/entities/consumed-lead.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Company, ConsumedLead])],
  controllers: [CompanyController, AdminCompanyController],
  providers: [CompanyService],
  exports: [CompanyService],
})
export class CompanyModule {}