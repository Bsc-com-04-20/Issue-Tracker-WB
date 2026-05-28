import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class PublicAttachmentBodyDto {
  @ApiProperty({ example: '37224210001' })
  @IsString()
  @MinLength(3)
  meterNumber: string;

  @ApiProperty({ example: '+265991000001' })
  @IsString()
  @MinLength(6)
  reporterPhone: string;
}
