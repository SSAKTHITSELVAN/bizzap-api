// src/modules/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from './entities/notification.entity';
import { ExpoPushToken } from './entities/expo-push-token.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, ExpoPushToken]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}