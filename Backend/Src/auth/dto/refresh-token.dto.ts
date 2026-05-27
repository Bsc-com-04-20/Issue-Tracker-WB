import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshTokenBodyDto {
  @ApiProperty({ description: 'Opaque refresh token from login' })
  @IsString()
  @MinLength(10)
  refreshToken: string;
}
