import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'Jane Officer' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'jane@utility.mw' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+265991234567' })
  @IsString()
  phone: string;

  @ApiProperty({ enum: Role, example: Role.INTAKE_OFFICER })
  @IsEnum(Role)
  role: Role;

  @ApiPropertyOptional({ example: 'Customer Service' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ minLength: 6, example: 'change-me-1' })
  @IsString()
  @MinLength(6)
  password: string;
}
