
// src/modules/company/dto/pay-as-you-go.dto.ts
import { IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PayAsYouGoDto {
  @ApiProperty({ example: 10, minimum: 1, maximum: 100 })
  @IsNumber()
  @Min(1)
  @Max(100)
  leadsCount: number;
}
