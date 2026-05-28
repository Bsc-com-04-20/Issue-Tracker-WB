import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { IssueStatus } from '../../common/enums/issue-status.enum';
import { BillingResolutionDto } from './billing-resolution.dto';

export class UpdateIssueStatusDto {
  @ApiProperty({ enum: [IssueStatus.IN_PROGRESS, IssueStatus.RESOLVED] })
  @IsIn([IssueStatus.IN_PROGRESS, IssueStatus.RESOLVED])
  status: IssueStatus.IN_PROGRESS | IssueStatus.RESOLVED;

  @ApiPropertyOptional({
    description:
      'Required when status is resolved (non-billing categories). For billing_account use billingResolution instead.',
    example: 'Replaced damaged section of pipe; pressure test OK.',
  })
  @ValidateIf(
    (o) =>
      o.status === IssueStatus.RESOLVED &&
      o.billingResolution == null,
  )
  @IsString()
  @IsNotEmpty()
  resolutionDetails?: string;

  @ApiPropertyOptional({
    description:
      'Structured billing desk resolution (required when resolving billing_account issues)',
  })
  @ValidateIf((o) => o.status === IssueStatus.RESOLVED)
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BillingResolutionDto)
  billingResolution?: BillingResolutionDto;
}
