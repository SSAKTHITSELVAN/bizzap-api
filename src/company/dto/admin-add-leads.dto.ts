// src/modules/company/dto/admin-add-leads.dto.ts
import { IsNotEmpty, IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminAddLeadsDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({ example: 10, minimum: 1 })
  @IsNumber()
  @Min(1)
  leadsCount: number;

  @ApiProperty({ example: 'Admin credit for promotional campaign' })
  @IsString()
  @IsOptional()
  notes?: string;
}