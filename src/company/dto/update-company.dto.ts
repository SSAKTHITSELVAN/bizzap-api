
// src/modules/company/dto/update-company.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateCompanyDto } from './create-company.dto';
import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {
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
    example: 'Fintech',
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    description: 'Name of the user',
    example: 'Jane Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  userName?: string;

  @ApiProperty({
    description: 'URL to the user\'s profile photo',
    example: 'https://example.com/user-new.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  userPhoto?: string;

  @ApiProperty({
    description: 'URL to the company\'s cover image',
    example: 'https://example.com/cover-new.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiProperty({
    description: 'Company registered address',
    example: '789 Industrial Drive, City, State 123456',
    required: false,
  })
  @IsOptional()
  @IsString()
  registeredAddress?: string;
  
  @ApiProperty({
    description: 'Brief description about the company',
    example: 'We have updated our services to include cloud computing.',
    required: false,
  })
  @IsOptional()
  @IsString()
  about?: string;

  @ApiProperty({
    description: 'Company operational address',
    example: '101 Tech Plaza, City, State 123456',
    required: false,
  })
  @IsOptional()
  @IsString()
  operationalAddress?: string;
}