// src/modules/leads/dto/update-consumed-lead-status.dto.ts
import { IsEnum, IsOptional, IsNumber, IsString, Min, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DealStatus } from '../entities/consumed-lead.entity';

export class UpdateConsumedLeadStatusDto {
  @ApiProperty({
    enum: DealStatus,
    example: DealStatus.COMPLETED,
    description: 'Current status of the deal',
  })
  @IsEnum(DealStatus)
  dealStatus: DealStatus;

  @ApiProperty({
    description: 'Notes about the deal outcome',
    example: 'Successfully closed the deal. Great lead quality!',
    required: false,
  })
  @IsOptional()
  @IsString()
  dealNotes?: string;

  @ApiProperty({
    description: 'Deal value in INR (required for COMPLETED status)',
    example: 50000,
    required: false,
  })
  @ValidateIf(o => o.dealStatus === DealStatus.COMPLETED)
  @IsNumber()
  @Min(0)
  dealValue?: number;
}