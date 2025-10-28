// src/modules/company/dto/create-company.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsPhoneNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCompanyDto {
  @ApiProperty({
    description: 'Indian phone number',
    example: '+919876543210',
  })
  @IsPhoneNumber('IN')
  @IsNotEmpty()
  phoneNumber: string;

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
    description: 'Company logo URL',
    example: 'https://example.com/logo.png',
    required: false,
  })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiProperty({
    description: 'Company address',
    example: '123 Business Street, Tech City, State 123456',
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    description: 'Company description',
    example: 'Leading provider of technology solutions',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
  
  @ApiProperty({
    description: 'Company business category',
    example: 'IT Services',
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    description: 'Referral code provided by a referrer',
    example: 'BIZAP1234',
    required: false,
  })
  @IsOptional()
  @IsString()
  referralCode?: string;

  @ApiProperty({
    description: 'Referral code provided by a referrer (alias)',
    example: 'BIZAP1234',
    required: false,
  })
  @IsOptional()
  @IsString()
  referredBy?: string;

  @ApiProperty({
    description: 'Name of the user registering the company',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  userName?: string;

  @ApiProperty({
    description: 'URL to the user\'s profile photo',
    example: 'https://example.com/user.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  userPhoto?: string;

  @ApiProperty({
    description: 'URL to the company\'s cover image',
    example: 'https://example.com/cover.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiProperty({
    description: 'Company registered address',
    example: '123 Corporate Ave, City, State 123456',
    required: false,
  })
  @IsOptional()
  @IsString()
  registeredAddress?: string;
  
  @ApiProperty({
    description: 'Brief description about the company',
    example: 'We are a leading tech company specializing in AI solutions.',
    required: false,
  })
  @IsOptional()
  @IsString()
  about?: string;

  @ApiProperty({
    description: 'Company operational address',
    example: '456 Tech Park, City, State 123456',
    required: false,
  })
  @IsOptional()
  @IsString()
  operationalAddress?: string;
}