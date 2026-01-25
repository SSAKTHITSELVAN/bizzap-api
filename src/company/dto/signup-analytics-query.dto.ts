// src/modules/company/dto/signup-analytics-query.dto.ts
import { IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupAnalyticsQueryDto {
  @ApiProperty({
    description: 'Start date for filtering signups (YYYY-MM-DD)',
    example: '2025-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'End date for filtering signups (YYYY-MM-DD)',
    example: '2025-01-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}