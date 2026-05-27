import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class PublicTrackQueryDto {
  @ApiProperty({ example: 'ISS-123' })
  @IsString()
  @MinLength(1)
  issueRef: string;

  @ApiProperty({ example: '+265991234567' })
  @IsString()
  @MinLength(3)
  phone: string;
}
