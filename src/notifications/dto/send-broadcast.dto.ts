
// ==========================================

// src/modules/notifications/dto/send-broadcast.dto.ts
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendBroadcastDto {
  @ApiProperty({
    description: 'Notification title',
    example: 'Important Update',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Notification message',
    example: 'We have added new features to the app!',
  })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({
    description: 'Additional data',
    required: false,
  })
  @IsOptional()
  data?: any;
}

// ==========================================
