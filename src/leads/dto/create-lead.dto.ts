// src/modules/leads/dto/create-lead.dto.ts - Updated with Swagger decorators
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLeadDto {
  @ApiProperty({
    description: 'Lead title',
    example: 'Looking for Web Development Services',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Detailed description of the lead requirement',
    example: 'We need a professional website for our startup with modern design and mobile responsiveness.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Optional image URL for the lead',
    example: 'https://example.com/lead-image.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({
    description: 'Budget for the lead (e.g., $5000)',
    required: false,
  })
  @IsOptional()
  @IsString()
  budget?: string;

  @ApiProperty({
    description: 'Quantity required (e.g., 50 units)',
    required: false,
  })
  @IsOptional()
  @IsString()
  quantity?: string;

  @ApiProperty({
    description: 'Location of the lead (e.g., San Francisco)',
    required: false,
  })
  @IsOptional()
  @IsString()
  location?: string;
}