import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

/** Optional filters; when omitted, reports use all stored data. */
export class ReportDateRangeQueryDto {
  @ApiPropertyOptional({
    example: '2026-03-01T00:00:00.000Z',
    description: 'Include issues with dateReported >= from (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    example: '2026-03-31T23:59:59.999Z',
    description: 'Include issues with dateReported <= to (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class ResolutionReportDateRangeQueryDto {
  @ApiPropertyOptional({
    example: '2026-03-01T00:00:00.000Z',
    description: 'Filter resolutions with dateResolved >= from',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    example: '2026-03-31T23:59:59.999Z',
    description: 'Filter resolutions with dateResolved <= to',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class SubcategoryAnalyticsQueryDto extends ResolutionReportDateRangeQueryDto {
  @ApiPropertyOptional({
    example: 5,
    description: 'Maximum rows to return for top failing subcategories',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    example: 72,
    description: 'SLA target in hours for resolved issue turnaround',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  slaHours?: number;
}
