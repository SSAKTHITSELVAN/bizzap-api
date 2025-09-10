import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { AdminLeadsController } from './admin.leads.controller';
import { Lead } from './entities/lead.entity';
import { ConsumedLead } from './entities/consumed-lead.entity'; // Import the new entity
import { CompanyModule } from '../company/company.module';

@Module({
  imports: [TypeOrmModule.forFeature([Lead, ConsumedLead]), CompanyModule], // Add ConsumedLead here
  controllers: [LeadsController, AdminLeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}