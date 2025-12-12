// src/modules/auth/dto/gst-details.dto.ts
import { IsString, IsNotEmpty, Matches, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GstDetailsDto {
  @ApiProperty({
    description: 'GST Number (GSTIN) - 15 character alphanumeric',
    example: '27AAPFU0939F1ZV',
  })
  @IsString()
  @IsNotEmpty()
  @Length(15, 15, { message: 'GST number must be exactly 15 characters' })
  @Matches(/^[0-9]{2}[A-Z0-9]{13}$/, {
    message: 'Invalid GST number format. Must be 15 characters: 2 digits followed by 13 alphanumeric characters',
  })
  gstNumber: string;
}