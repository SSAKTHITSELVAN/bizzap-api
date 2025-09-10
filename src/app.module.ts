// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { typeOrmConfig } from './database/typeorm.config';

// Modules
import { AuthModule } from './auth/auth.module';
import { CompanyModule } from './company/company.module';
import { LeadsModule } from './leads/leads.module';
import { ProductsModule } from './products/products.module';
import { FollowersModule } from './followers/followers.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(typeOrmConfig),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'bizzap-secret-key',
      signOptions: { expiresIn: '30d' },
    }),
    AuthModule,
    CompanyModule,
    LeadsModule,
    ProductsModule,
    FollowersModule,
    SearchModule,
  ],
})
export class AppModule {}