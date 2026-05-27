import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ListIssuesQueryDto {
  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @ApiPropertyOptional({ default: 50, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number = 50;

  @ApiPropertyOptional({
    description: 'Filter by current status name (e.g. reported, assigned)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;

  @ApiPropertyOptional({
    description:
      'Filter by assignedDepartment (admin/supervisor only; ignored for department specialists who are scoped automatically)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  assignedDepartment?: string;

  @ApiPropertyOptional({
    description:
      'When true, only issues with system-flagged possible duplicates (intake_duplicate_candidate_count > 0 on issueAttributes)',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true' || value === '1') return true;
    if (value === false || value === 'false' || value === '0') return false;
    return undefined;
  })
  @IsBoolean()
  needsDuplicateReview?: boolean;
}
