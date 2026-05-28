import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class MeterVerifyStartDto {
  @ApiProperty({ example: '37224216590' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  meterNumber: string;

  @ApiProperty({ example: '+265991234567' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  phone: string;
}

export class MeterVerifyConfirmDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  verificationId: string;

  @ApiProperty({ example: '37224216590' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  meterNumber: string;

  @ApiProperty({ example: '000000' })
  @IsString()
  @MinLength(4)
  @MaxLength(12)
  otp: string;
}
