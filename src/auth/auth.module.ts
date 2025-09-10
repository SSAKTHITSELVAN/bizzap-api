// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { CompanyModule } from '../company/company.module';
import { JwtStrategy } from '../core/strategies/jwt.strategy';

@Module({
  imports: [CompanyModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
