// src/modules/chat/dto/update-message.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMessageDto {
  @ApiProperty({
    description: 'Updated text message content',
    example: 'Hello, I saw your lead and would like to discuss the requirements.',
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}