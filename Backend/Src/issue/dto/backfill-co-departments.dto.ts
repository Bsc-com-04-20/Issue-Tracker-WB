import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class BackfillCoDepartmentsDto {
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  /** When true (default), only issues missing intake_co_department_stamped_at are processed. */
  @IsOptional()
  @IsBoolean()
  onlyMissingStamp?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  limit?: number;
}
