import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class MeterLookupQueryDto {
  @ApiProperty({ example: 'WB-DEMO-1001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  meterNumber: string;
}
