// src/modules/leads/dto/deactivate-lead.dto.ts
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeactivateLeadDto {
  @ApiProperty({
    description: 'Reason for deactivating the lead',
    example: 'Lead requirement fulfilled',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reasonForDeactivation?: string;
}