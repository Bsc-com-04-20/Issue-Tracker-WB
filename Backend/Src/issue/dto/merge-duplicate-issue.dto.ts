import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class MergeDuplicateIssueDto {
  @ApiProperty({
    description:
      'The issue id to keep as the canonical record (must differ from the duplicate in the URL)',
    example: 42,
  })
  @IsInt()
  @Min(1)
  keepIssueId: number;
}
