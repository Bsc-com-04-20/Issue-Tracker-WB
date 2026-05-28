import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

/** Work sub-status while issue remains assigned / in_progress (values validated per issue category). */
export class UpdateFieldProgressDto {
  @ApiProperty({
    description:
      'Category-specific progress code (field crew, billing desk, metering, ICT, etc.)',
  })
  @IsString()
  @MinLength(1)
  fieldProgress: string;
}
