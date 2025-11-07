// src/modules/products/dto/create-product.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({
    description: 'Product name',
    example: 'Professional Website Development',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Product description',
    example: 'Custom website development with modern design and responsive layout',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Product price',
    example: 25000.00,
    required: false,
  })
  @IsOptional()
  @Type(() => Number) // ✅ Transform string to number
  @IsNumber()
  price?: number;

  @ApiProperty({
    description: 'Minimum quantity for the product',
    example: 'Payment terms: 50% advance, 50% on completion',
    required: false,
  })
  @IsOptional()
  @IsString()
  minimumQuantity?: string;
}