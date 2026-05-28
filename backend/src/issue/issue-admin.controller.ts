import { Body, Controller, Get, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtUser } from '../common/interfaces/jwt-user.interface';
import { SWAGGER_JWT_AUTH } from '../common/swagger.constants';
import { IssueService } from './issue.service';
import { SlaPolicyMergeDto } from './dto/sla-policy-merge.dto';
import { SlaRulesService } from '../sla/sla-rules.service';

@ApiTags('issues-admin')
@Controller('issue/admin')
export class IssueAdminController {
  constructor(
    private readonly issueService: IssueService,
    private readonly slaRulesService: SlaRulesService,
  ) {}

  @Get('sla-policy')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiBearerAuth(SWAGGER_JWT_AUTH)
  @ApiOperation({
    summary:
      'Read merged SLA policy file (defaults + config/sla-policy.merge.json overrides)',
  })
  getSlaPolicy() {
    return this.slaRulesService.readMergeJson();
  }

  @Put('sla-policy')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth(SWAGGER_JWT_AUTH)
  @ApiOperation({
    summary: 'Replace SLA merge overrides file (admin; hot-reloads in-process rules)',
  })
  putSlaPolicy(@Body() body: SlaPolicyMergeDto) {
    this.slaRulesService.writeMergeJson({
      resolutionHoursByKey: body.resolutionHoursByKey ?? {},
      firstResponseHoursByKey: body.firstResponseHoursByKey ?? {},
    });
    return { ok: true, path: this.slaRulesService.mergeFilePath() };
  }

  @Post('process-sla-breaches')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiBearerAuth(SWAGGER_JWT_AUTH)
  @ApiOperation({
    summary:
      'Scan open issues past resolution SLA, stamp breach time once, and notify supervisors',
  })
  processSlaBreaches(@Req() request: Request & { user: JwtUser }) {
    return this.issueService.processSlaBreachesBatch(request.user, 200);
  }
}
