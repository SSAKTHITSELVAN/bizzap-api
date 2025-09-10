// src/modules/auth/dto/register.dto.ts
import { IsString, IsNotEmpty, IsPhoneNumber, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'Indian phone number',
    example: '+919876543210',
  })
  @IsPhoneNumber('IN')
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({
    description: '6-digit OTP code',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp: string;

  @ApiProperty({
    description: 'Company GST number',
    example: '22AAAAA0000A1Z5',
  })
  @IsString()
  @IsNotEmpty()
  gstNumber: string;

  @ApiProperty({
    description: 'Company name',
    example: 'Tech Solutions Pvt Ltd',
  })
  @IsString()
  @IsNotEmpty()
  companyName: string;
  
  @ApiProperty({
    description: 'Name of the user registering the company',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  userName: string;

  @ApiProperty({
    description: 'URL to the user\'s profile photo',
    example: 'https://example.com/user.jpg',
  })
  @IsString()
  @IsNotEmpty()
  userPhoto: string;

  @ApiProperty({
    description: 'Company logo URL',
    example: 'https://example.com/logo.png',
  })
  @IsString()
  @IsNotEmpty()
  logo: string;

  @ApiProperty({
    description: 'Company address',
    example: '123 Business Street, Tech City, State 123456',
    required: false,
  })
  @IsString()
  address?: string;

  @ApiProperty({
    description: 'Company description',
    example: 'Leading provider of technology solutions',
    required: false,
  })
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Referral code provided by a referrer',
    example: 'BIZAP1234',
    required: false,
  })
  @IsString()
  referredBy?: string;
}