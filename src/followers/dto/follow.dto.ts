// src/modules/followers/dto/follow.dto.ts - Updated with Swagger decorators
import { IsString, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FollowDto {
  @ApiProperty({
    description: 'UUID of the company to follow',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  companyId: string;
}