
// src/modules/company/dto/verify-payment.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyPaymentDto {
  @ApiProperty({ example: 'order_xyz123' })
  @IsString()
  @IsNotEmpty()
  razorpayOrderId: string;

  @ApiProperty({ example: 'pay_abc456' })
  @IsString()
  @IsNotEmpty()
  razorpayPaymentId: string;

  @ApiProperty({ example: 'signature_def789' })
  @IsString()
  @IsNotEmpty()
  razorpaySignature: string;
}
