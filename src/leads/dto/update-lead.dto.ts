// src/modules/leads/dto/update-lead.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateLeadDto } from './create-lead.dto';
import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateLeadDto extends PartialType(CreateLeadDto) {
  @ApiProperty({
    description: 'Lead title',
    example: 'Updated Lead Title',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Detailed description of the lead requirement',
    example: 'Updated description for the lead.',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Optional image URL for the lead',
    example: 'https://example.com/updated-lead-image.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({
    description: 'Budget for the lead',
    required: false,
  })
  @IsOptional()
  @IsString()
  budget?: string;

  @ApiProperty({
    description: 'Quantity required',
    required: false,
  })
  @IsOptional()
  @IsString()
  quantity?: string;

  @ApiProperty({
    description: 'Location of the lead',
    required: false,
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    description: 'Reason for deactivating the lead',
    example: 'Lead requirement fulfilled',
    required: false,
  })
  @IsOptional()
  @IsString()
  reasonForDeactivation?: string;
}