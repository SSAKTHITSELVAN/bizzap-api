
// src/modules/auth/dto/login.dto.ts - Updated with Swagger decorators
import { IsPhoneNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Indian phone number',
    example: '+919876543210',
  })
  @IsPhoneNumber('IN')
  @IsNotEmpty()
  phoneNumber: string;
}
