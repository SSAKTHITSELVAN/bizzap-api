// src/modules/chat/dto/send-message.dto.ts
import { IsString, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({
    description: 'UUID of the company receiving the message',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  @IsNotEmpty()
  receiverId: string;

  @ApiProperty({
    description: 'Text message content',
    example: 'Hello, I saw your lead and would like to discuss it further.',
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}
