import { Controller, Get, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ReportService } from './report.service';
import {
  ReportDateRangeQueryDto,
  ResolutionReportDateRangeQueryDto,
  SubcategoryAnalyticsQueryDto,
} from './dto/report-date-range.query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { SWAGGER_JWT_AUTH } from '../common/swagger.constants';

@ApiTags('reports')
@Controller('report')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPERVISOR)
@ApiBearerAuth(SWAGGER_JWT_AUTH)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('summary')
  @ApiOperation({
    summary:
      'Issue volume breakdown by status, severity, channel, and service area',
  })
  getSummary(
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    query: ReportDateRangeQueryDto,
  ) {
    return this.reportService.getSummary(query);
  }

  @Get('resolution-stats')
  @ApiOperation({
    summary:
      'Resolved issue count and average hours from report date to resolution (MySQL)',
  })
  getResolutionStats(
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    query: ResolutionReportDateRangeQueryDto,
  ) {
    return this.reportService.getResolutionStats(query);
  }

  @Get('issues-by-month')
  @ApiOperation({
    summary: 'Monthly issue counts for trend charts (by dateReported)',
  })
  getIssuesByMonth(
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    query: ReportDateRangeQueryDto,
  ) {
    return this.reportService.getIssuesByMonth(query);
  }

  @Get('top-failing-subcategories')
  @ApiOperation({
    summary: 'Top unresolved subcategories by open issue count',
  })
  getTopFailingSubcategories(
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    query: SubcategoryAnalyticsQueryDto,
  ) {
    return this.reportService.getTopFailingSubcategories(query);
  }

  @Get('resolution-by-subcategory')
  @ApiOperation({
    summary: 'Average resolution time and count by subcategory',
  })
  getResolutionBySubcategory(
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    query: ResolutionReportDateRangeQueryDto,
  ) {
    return this.reportService.getResolutionBySubcategory(query);
  }

  @Get('department-sla-by-subcategory')
  @ApiOperation({
    summary: 'SLA attainment by department and subcategory',
  })
  getDepartmentSlaBySubcategory(
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    query: SubcategoryAnalyticsQueryDto,
  ) {
    return this.reportService.getDepartmentSlaBySubcategory(query);
  }

  @Get('operational-pulse')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.INTAKE_OFFICER)
  @ApiOperation({
    summary:
      'SLA breach counts, overdue open issues, and per-technician active assignment load',
  })
  getOperationalPulse() {
    return this.reportService.getOperationalPulse();
  }

  @Get('geo-hotspots')
  @ApiOperation({
    summary: 'Complaint density by rounded map coordinates (infrastructure / dispatch planning)',
  })
  getGeoHotspots(@Query('limit') limit?: string) {
    const n = limit != null ? Number(limit) : 24;
    return this.reportService.getGeoHotspots(Number.isFinite(n) ? n : 24);
  }
}
