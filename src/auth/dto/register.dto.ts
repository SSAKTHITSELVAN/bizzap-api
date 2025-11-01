// src/modules/auth/dto/register.dto.ts - UPDATED WITH COVER IMAGE
import { IsString, IsNotEmpty, IsPhoneNumber, Length, IsOptional } from 'class-validator';
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
    example: '936180',
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
    description: 'URL to the user\'s profile photo (ignored if file is uploaded)',
    example: 'https://example.com/user.jpg',
    required: false,
  })
  @IsString()
  @IsOptional()
  userPhoto?: string;

  @ApiProperty({
    description: 'Company logo URL (ignored if file is uploaded)',
    example: 'https://example.com/logo.png',
    required: false,
  })
  @IsString()
  @IsOptional()
  logo?: string;

  @ApiProperty({
    description: 'Company cover image URL (ignored if file is uploaded)',
    example: 'https://example.com/cover.jpg',
    required: false,
  })
  @IsString()
  @IsOptional()
  coverImage?: string;

  @ApiProperty({
    description: 'Company address',
    example: '123 Business Street, Tech City, State 123456',
    required: false,
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({
    description: 'Company description',
    example: 'Leading provider of technology solutions',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Referral code provided by a referrer',
    example: 'BIZAP1234',
    required: false,
  })
  @IsString()
  @IsOptional()
  referredBy?: string;

  @ApiProperty({
    description: 'Company business category',
    example: 'IT Services',
    required: false,
  })
  @IsString()
  @IsOptional()
  category?: string;
}