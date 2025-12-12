// src/modules/auth/auth.module.ts - UPDATED WITH HTTPMODULE
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { CompanyModule } from '../company/company.module';
import { ChatModule } from '../chat/chat.module';
import { JwtStrategy } from '../core/strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule, // Add ConfigModule for environment variables
    HttpModule, // Add HttpModule for HTTP requests
    CompanyModule,
    ChatModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}