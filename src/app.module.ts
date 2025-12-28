// src/app.module.ts - Updated with NotificationsModule
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { typeOrmConfig } from './database/typeorm.config';
import { ScheduleModule } from '@nestjs/schedule';

// Modules
import { AuthModule } from './auth/auth.module';
import { CompanyModule } from './company/company.module';
import { LeadsModule } from './leads/leads.module';
import { ProductsModule } from './products/products.module';
import { FollowersModule } from './followers/followers.module';
import { SearchModule } from './search/search.module';
import { ChatModule } from './chat/chat.module';
import { PostsModule } from './posts/posts.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(typeOrmConfig),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'bizzap-secret-key',
      signOptions: { expiresIn: '30d' },
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    CompanyModule,
    LeadsModule,
    ProductsModule,
    FollowersModule,
    SearchModule,
    ChatModule,
    PostsModule,
    SubscriptionModule,
    NotificationsModule,
  ],
})
export class AppModule {}