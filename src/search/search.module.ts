import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { Company } from '../company/entities/company.entity';
import { Lead } from '../leads/entities/lead.entity';
import { Product } from '../products/entities/product.entity';
import { ChatModule } from '../chat/chat.module'; // Import the module that provides S3Service

@Module({
  imports: [
    TypeOrmModule.forFeature([Company, Lead, Product]),
    ChatModule, // Add this to access S3Service
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}