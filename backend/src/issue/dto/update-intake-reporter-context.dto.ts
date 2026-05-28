import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Intake/supervisor correction before heavy dispatch — at least one field required (validated in service). */
export class UpdateIntakeReporterContextDto {
  @ApiPropertyOptional({ example: '+265991234567' })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(24)
  reporterPhone?: string;

  @ApiPropertyOptional({ example: -15.384 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  latitude?: number;

  @ApiPropertyOptional({ example: 35.318 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressDescription?: string;
}
