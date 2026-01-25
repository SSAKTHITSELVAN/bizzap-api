// src/analytics/dto/create-analytics.dto.ts
import { IsString, IsDateString, IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAnalyticsDto {
  @ApiProperty({ example: 'DashboardScreen' })
  @IsString()
  @IsNotEmpty()
  screenName: string;

  @ApiProperty({ example: '2026-01-25T10:00:00.000Z' })
  @IsDateString()
  entryTime: string;

  @ApiProperty({ example: '2026-01-25T10:00:05.000Z' })
  @IsDateString()
  exitTime: string;

  @ApiProperty({ example: 5000, description: 'Duration in milliseconds' })
  @IsNumber()
  durationMs: number;
}