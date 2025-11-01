// src/modules/auth/auth.module.ts - UPDATED
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { CompanyModule } from '../company/company.module';
import { ChatModule } from '../chat/chat.module'; // Import ChatModule for S3Service
import { JwtStrategy } from '../core/strategies/jwt.strategy';

@Module({
  imports: [
    CompanyModule,
    ChatModule, // Add ChatModule to access S3Service
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}