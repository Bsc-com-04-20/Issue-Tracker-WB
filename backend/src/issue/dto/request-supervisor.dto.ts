import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestSupervisorDto {
  @ApiPropertyOptional({
    example: 'Customer reports burst worsening; needs urgent dispatch.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
