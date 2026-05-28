import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UpdateUserPasswordDto {
  @ApiProperty({ minLength: 6, example: 'new-secure-pass' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
