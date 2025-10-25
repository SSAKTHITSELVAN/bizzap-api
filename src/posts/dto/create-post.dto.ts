import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({
    description: 'Post content/text',
    example: 'Check out our latest update! 🚀',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}