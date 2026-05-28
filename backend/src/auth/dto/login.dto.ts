import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@local.dev' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'admin123', format: 'password' })
  @IsString()
  password: string;
}
