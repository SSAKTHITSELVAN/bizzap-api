// src/modules/chat/dto/send-message.dto.ts
import { IsString, IsNotEmpty, IsUUID, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from '../entities/chat.entity';

export class SendMessageDto {
  @ApiProperty({
    description: 'UUID of the company receiving the message',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  @IsNotEmpty()
  receiverId: string;

  @ApiPropertyOptional({
    description: 'Text message content (required for text messages)',
    example: 'Hello, I saw your lead and would like to discuss it further.',
  })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiPropertyOptional({
    description: 'Type of message',
    enum: MessageType,
    example: MessageType.TEXT,
  })
  @IsEnum(MessageType)
  @IsOptional()
  messageType?: MessageType;

  @ApiPropertyOptional({
    description: 'Original filename (for file messages)',
    example: 'document.pdf',
  })
  @IsString()
  @IsOptional()
  fileName?: string;
}