// src/chat/chat.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { S3Service } from './s3.service';
import { Chat } from './entities/chat.entity';
import * as multer from 'multer';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Chat]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '24h' },
      }),
      inject: [ConfigService],
    }),
    MulterModule.register({
      storage: multer.memoryStorage(), // Store files in memory for direct S3 upload
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
      },
    }),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, S3Service],
  exports: [ChatService, S3Service],
})
export class ChatModule {}