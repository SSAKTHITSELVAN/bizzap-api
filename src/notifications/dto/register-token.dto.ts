// src/modules/notifications/dto/register-token.dto.ts
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterTokenDto {
  @ApiProperty({
    description: 'Expo push token',
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'Device ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({
    description: 'Platform (ios, android, web)',
    required: false,
  })
  @IsOptional()
  @IsString()
  platform?: string;
}
