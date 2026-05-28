import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsDefined,
  IsEmail,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class LocationInputDto {
  @ApiPropertyOptional({ example: -13.9626, description: 'Optional when address-only public intake supplies map later' })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ example: 33.7741 })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiProperty({ example: 'Area 25, near main road' })
  @IsString()
  addressDescription: string;

  @ApiPropertyOptional({ example: 'Lilongwe North' })
  @IsOptional()
  @IsString()
  serviceArea?: string;
}

export class CreateIssueDto {
  @ApiProperty({ example: 'Pipe burst at junction' })
  @IsString()
  description: string;

  @ApiProperty({ example: 'high' })
  @IsString()
  severityLevel: string;

  @ApiProperty({ example: 'water_supply' })
  @IsString()
  issueCategory: string;

  @ApiPropertyOptional({ example: 'no_water_supply' })
  @IsOptional()
  @IsString()
  issueSubcategory?: string;

  @ApiPropertyOptional({ example: 'normal' })
  @IsOptional()
  @IsString()
  urgencyLevel?: string;

  @ApiPropertyOptional({
    example: '37224216590',
    description:
      'Optional meter / premise key for registry lookup (account, zone, address hints). Public web requires a registered meter.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  meterNumber?: string;

  @ApiPropertyOptional({
    description:
      'From POST /issue/public/meter-verify/confirm — required for authenticated meter on public create.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  meterVerificationId?: string;

  @ApiPropertyOptional({ example: 'WB-00012345' })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiPropertyOptional({ example: 'community' })
  @IsOptional()
  @IsString()
  affectedScope?: string;

  @ApiPropertyOptional({
    example: { affectedArea: 'Area 25', durationHours: 6 },
    description: 'Structured subcategory attributes captured by guided form',
  })
  @IsOptional()
  @IsObject()
  issueAttributes?: Record<string, unknown>;

  @ApiProperty({ example: 'phone' })
  @IsString()
  reportChannel: string;

  @ApiProperty({ example: '2026-03-28T10:00:00.000Z' })
  @IsDateString()
  dateReported: string;

  @ApiProperty({ example: 'John Banda' })
  @IsString()
  reporterName: string;

  @ApiProperty({ example: '+265991111111' })
  @IsString()
  reporterPhone: string;

  @ApiPropertyOptional({ example: 'Community committee' })
  @IsOptional()
  @IsString()
  reporterAffiliation?: string;

  @ApiPropertyOptional({
    example: 'reporter@example.com',
    description: 'Optional — used for email notifications on status updates',
  })
  @IsOptional()
  @IsEmail()
  reporterEmail?: string;

  @ApiPropertyOptional({ example: 27, description: 'Malawi district menu number (public intake)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(28)
  reportDistrictNumber?: number;

  @ApiPropertyOptional({ example: 'ZOMBA' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  reportDistrictName?: string;

  @ApiPropertyOptional({ example: 30, description: 'Locality number within district menu' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  reportLocationNumber?: number;

  @ApiPropertyOptional({ example: 'CHIKANDA' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reportLocationName?: string;

  @ApiPropertyOptional({ example: 'Near Chikanda Market' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reportLocationDetail?: string;

  @ApiProperty({ type: LocationInputDto })
  @IsDefined({ message: 'location is required (coordinates and address)' })
  @ValidateNested()
  @Type(() => LocationInputDto)
  location: LocationInputDto;
}
