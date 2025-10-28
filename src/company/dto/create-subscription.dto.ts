// src/modules/company/dto/create-subscription.dto.ts
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionTier } from '../entities/subscription.entity';

export class CreateSubscriptionDto {
  @ApiProperty({ enum: SubscriptionTier, example: 'STARTER' })
  @IsEnum(SubscriptionTier)
  @IsNotEmpty()
  tier: SubscriptionTier;
}
