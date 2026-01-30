// src/analytics/dto/create-analytics.dto.ts
import { IsString, IsDateString, IsNumber, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAnalyticsDto {
  @ApiProperty({ example: 'DashboardScreen' })
  @IsString()
  @IsNotEmpty()
  screenName: string;

  @ApiProperty()
  @IsDateString()
  entryTime: string;

  @ApiProperty()
  @IsDateString()
  exitTime: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional() // 👈 Make this optional
  durationMs?: number;
}