// src/modules/products/products.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { ChatModule } from '../chat/chat.module'; // Import to access S3Service
import * as multer from 'multer';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product]),
    ChatModule, // Import ChatModule to use S3Service
    MulterModule.register({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per image
        files: 10, // Max 10 images
      },
    }),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}