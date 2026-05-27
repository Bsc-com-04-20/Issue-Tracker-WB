import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

export class SlaPolicyMergeDto {
  @ApiPropertyOptional({
    description:
      'Map keys like "water_supply:no_water_supply" or "water_supply:__default__" to resolution SLA hours',
    example: { 'water_supply:no_water_supply': 18 },
  })
  @IsOptional()
  @IsObject()
  resolutionHoursByKey?: Record<string, number>;

  @ApiPropertyOptional({
    description: 'Optional overrides for first-response (assignment) targets in hours',
    example: { 'water_supply:__default__': 6 },
  })
  @IsOptional()
  @IsObject()
  firstResponseHoursByKey?: Record<string, number>;
}
