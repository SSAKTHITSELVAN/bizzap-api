// src/modules/leads/dto/extract-lead-from-text.dto.ts
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExtractLeadFromTextDto {
  @ApiProperty({
    description: "User's natural language description of their business requirement",
    example: 'I need cotton fabric 5000 meters for my manufacturing unit in Coimbatore, budget around 2 lakhs',
    minLength: 10,
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Input must be at least 10 characters long' })
  @MaxLength(1000, { message: 'Input must not exceed 1000 characters' })
  userInput: string;
}