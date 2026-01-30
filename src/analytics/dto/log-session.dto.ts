import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum AppSessionStatus {
  OPEN = 'OPEN',
  CLOSE = 'CLOSE',
}

export class LogSessionDto {
  @ApiProperty({ enum: AppSessionStatus, example: 'OPEN', description: 'App lifecycle status' })
  @IsEnum(AppSessionStatus)
  @IsNotEmpty()
  status: AppSessionStatus;
}