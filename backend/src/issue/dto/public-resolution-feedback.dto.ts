import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class PublicResolutionFeedbackDto {
  @ApiProperty({ example: 'ISS-42' })
  @IsString()
  @MaxLength(40)
  issueRef: string;

  @ApiProperty({ example: '+265991234567' })
  @IsString()
  @MaxLength(30)
  phone: string;

  @ApiProperty({ enum: ['confirmed', 'disputed'] })
  @IsString()
  @IsIn(['confirmed', 'disputed'])
  outcome: 'confirmed' | 'disputed';

  @ApiPropertyOptional({ example: 'Pressure still low in the kitchen tap.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
