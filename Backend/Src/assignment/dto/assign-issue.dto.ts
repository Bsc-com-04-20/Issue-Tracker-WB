import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, MaxLength, Min } from 'class-validator';

export class AssignIssueDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  issueId: number;

  @ApiProperty({ example: 2, description: 'Must be a user with role technician' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assignedToUserId: number;

  @ApiProperty({ example: 'high' })
  @IsString()
  @MaxLength(20)
  priorityLevel: string;
}
