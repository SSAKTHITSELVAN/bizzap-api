
// src/modules/notifications/dto/mark-notification-read.dto.ts
import { IsString, IsNotEmpty, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkNotificationReadDto {
  @ApiProperty({
    description: 'Array of notification IDs to mark as read',
    type: [String],
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  notificationIds: string[];
}