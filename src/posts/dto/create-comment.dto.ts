import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({
    description: 'Comment text',
    example: 'Great post! Really inspiring content.',
  })
  @IsString()
  @IsNotEmpty()
  comment: string;
}