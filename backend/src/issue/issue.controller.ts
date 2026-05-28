import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { IssueService } from './issue.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueStatusDto } from './dto/update-issue-status.dto';
import { DuplicateHintsQueryDto } from './dto/duplicate-hints.query.dto';
import { ListIssuesQueryDto } from './dto/list-issues.query.dto';
import { PublicTrackQueryDto } from './dto/public-track.query.dto';
import { MergeDuplicateIssueDto } from './dto/merge-duplicate-issue.dto';
import { RequestSupervisorDto } from './dto/request-supervisor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ISSUE_STAFF_ROLES } from '../auth/staff-roles.constants';
import { JwtUser } from '../common/interfaces/jwt-user.interface';
import { UserService } from '../user/user.service';
import { SWAGGER_JWT_AUTH } from '../common/swagger.constants';
import { buildStaffClassificationPayload } from './issue-staff-classification.payload';
import { intakeRoutingHintsRecord } from './issue-intake-routing-hints';
import { BackfillCoDepartmentsDto } from './dto/backfill-co-departments.dto';
import { MeterLookupQueryDto } from './dto/meter-lookup.query.dto';
import { MeterVerifyConfirmDto, MeterVerifyStartDto } from './dto/meter-verify.dto';
import { PublicResolutionFeedbackDto } from './dto/public-resolution-feedback.dto';
import { UpdateFieldProgressDto } from './dto/update-field-progress.dto';
import { UpdateIntakeReporterContextDto } from './dto/update-intake-reporter-context.dto';

const uploadStorage = memoryStorage();
const uploadLimitBytes = 25 * 1024 * 1024;

@ApiTags('issues')
@Controller('issue')
export class IssueController {
  constructor(
    private readonly issueService: IssueService,
    private readonly userService: UserService,
  ) {}

  @Get('classification')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ISSUE_STAFF_ROLES)
  @ApiBearerAuth(SWAGGER_JWT_AUTH)
  @ApiOperation({
    summary:
      'List issue categories, subcategories, and departments (intake officers receive a subset without fraud investigation metadata)',
  })
  getClassification(@Req() request: Request & { user: JwtUser }) {
    return buildStaffClassificationPayload(request.user.role);
  }

  @Get('intake-routing-hints')
  @ApiOperation({
    summary:
      'Intake routing tips (category/subcategory); safe for unauthenticated new-issue flows',
  })
  getIntakeRoutingHints() {
    return intakeRoutingHintsRecord();
  }

  @Post('admin/backfill-intake-co-departments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth(SWAGGER_JWT_AUTH)
  @ApiOperation({
    summary:
      'Backfill intake_co_department_* from current rules; optionally recompute all (admin)',
  })
  backfillIntakeCoDepartments(@Body() body: BackfillCoDepartmentsDto) {
    return this.issueService.backfillIntakeCoDepartmentSuggestions({
      dryRun: body.dryRun ?? false,
      onlyMissingStamp: body.onlyMissingStamp ?? true,
      limit: body.limit ?? 500,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ISSUE_STAFF_ROLES)
  @ApiBearerAuth(SWAGGER_JWT_AUTH)
  @ApiOperation({
    summary: 'List issues (paginated, newest first; optional status filter)',
  })
  findAll(
    @Query() query: ListIssuesQueryDto,
    @Req() request: Request & { user: JwtUser },
  ) {
    const skip = query.skip ?? 0;
    const take = query.take ?? 50;
    return this.issueService.findAllForStaffPaginated(
      skip,
      take,
      query.status,
      request.user,
      {
        assignedDepartmentQuery: query.assignedDepartment,
        needsDuplicateReview: query.needsDuplicateReview,
      },
    );
  }

  @Get('possible-duplicates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ISSUE_STAFF_ROLES)
  @ApiBearerAuth(SWAGGER_JWT_AUTH)
  @ApiOperation({
    summary:
      'Open issues that may be duplicates (same phone and/or near coordinates, excluding closed)',
  })
  possibleDuplicates(
    @Query() query: DuplicateHintsQueryDto,
    @Req() request: Request & { user: JwtUser },
  ) {
    return this.issueService.findPossibleDuplicateHints({
      reporterPhone: query.reporterPhone,
      latitude: query.latitude,
      longitude: query.longitude,
      days: query.days ?? 14,
    });
  }

  @Get('public-track')
  @ApiOperation({
    summary: 'Public issue tracking by reference + reporter phone',
  })
  trackPublic(@Query() query: PublicTrackQueryDto) {
    return this.issueService.trackPublicByReference(query.issueRef, query.phone);
  }

  @Get('public/districts')
  @ApiOperation({
    summary: 'Malawi district list for public intake (numbered menu)',
  })
  publicDistricts() {
    return this.issueService.listPublicDistricts();
  }

  @Get('public/locations/:districtNumber')
  @ApiOperation({
    summary: 'Locations / areas within a district (dynamic menu; Zomba uses locality list)',
  })
  publicLocations(@Param('districtNumber', ParseIntPipe) districtNumber: number) {
    return this.issueService.listPublicLocations(districtNumber);
  }

  @Post('public/meter-verify/start')
  @ApiOperation({
    summary:
      'Start meter + phone ownership verification (prototype OTP; replace with SMS in production)',
  })
  startMeterVerify(@Body() body: MeterVerifyStartDto) {
    return this.issueService.startPublicMeterVerification(body);
  }

  @Post('public/meter-verify/confirm')
  @ApiOperation({ summary: 'Confirm OTP and receive meterVerificationId for public issue create' })
  confirmMeterVerify(@Body() body: MeterVerifyConfirmDto) {
    return this.issueService.confirmPublicMeterVerification(body);
  }

  @Get('public/meter-lookup')
  @ApiOperation({
    summary:
      'Resolve meter / premise key to account and zone context (demo registry; replace with CIS integration in production)',
  })
  lookupMeter(@Query() query: MeterLookupQueryDto) {
    return this.issueService.lookupMeterPublic(query.meterNumber);
  }

  @Post('public/resolution-feedback')
  @ApiOperation({
    summary:
      'Customer confirms or disputes resolution after the field team marks the issue resolved',
  })
  submitResolutionFeedback(@Body() body: PublicResolutionFeedbackDto) {
    return this.issueService.submitPublicResolutionFeedback({
      issueRef: body.issueRef,
      phone: body.phone,
      outcome: body.outcome,
      comment: body.comment,
    });
  }

  @Get('file/:attachmentId/download')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth(SWAGGER_JWT_AUTH)
  @ApiOperation({
    summary: 'Download an attachment (staff or assigned technician)',
  })
  downloadAttachment(
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
    @Req() request: Request & { user: JwtUser },
  ) {
    return this.issueService.streamAttachment(attachmentId, request.user);
  }

  @Get(':id/attachments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth(SWAGGER_JWT_AUTH)
  @ApiOperation({ summary: 'List attachments for an issue' })
  listAttachments(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request & { user: JwtUser },
  ) {
    return this.issueService.listAttachments(id, request.user);
  }

  @Post(':id/attachments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth(SWAGGER_JWT_AUTH)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({
    summary: 'Upload JPEG, PNG, WebP, or PDF (size limit from MAX_UPLOAD_MB)',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: uploadStorage,
      limits: { fileSize: uploadLimitBytes },
    }),
  )
  async uploadAttachment(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() request: Request & { user: JwtUser },
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('file is required');
    }
    const actor = await this.userService.findById(request.user.sub);
    if (!actor) {
      throw new UnauthorizedException('Authenticated user not found');
    }
    return this.issueService.addAttachment(id, file, actor, request.user);
  }

  @Get(':id/duplicate-hints')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ISSUE_STAFF_ROLES)
  @ApiBearerAuth(SWAGGER_JWT_AUTH)
  @ApiOperation({
    summary:
      'Possible duplicate issues (same phone and/or nearby location, last 30 days, excluding this id)',
  })
  duplicateHints(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request & { user: JwtUser },
  ) {
    return this.issueService.findDuplicateHintsForIssue(id, request.user);
  }

  @Post(':id/merge-as-duplicate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ISSUE_STAFF_ROLES)
  @ApiBearerAuth(SWAGGER_JWT_AUTH)
  @ApiOperation({
    summary:
      'Merge this issue (must be reported) into another as the primary record; closes the duplicate',
  })
  async mergeAsDuplicate(
    @Param('id', ParseIntPipe) duplicateIssueId: number,
    @Body() body: MergeDuplicateIssueDto,
    @Req() request: Request & { user: JwtUser },
  ) {
    const actor = await this.userService.findById(request.user.sub);
    if (!actor) {
      throw new UnauthorizedException('Authenticated user not found');
    }
    return this.issueService.mergeReportedDuplicateInto(
      duplicateIssueId,
      body.keepIssueId,
      actor,
      request.user,
    );
  }

  @Post(':id/request-supervisor')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ISSUE_STAFF_ROLES)
  @ApiBearerAuth(SWAGGER_JWT_AUTH)
  @ApiOperation({
    summary:
      'Flag issue for supervisor attention (customer service / intake); stores note on issue attributes',
  })
  async requestSupervisor(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: RequestSupervisorDto,
    @Req() request: Request & { user: JwtUser },
  ) {
    const actor = await this.userService.findById(request.user.sub);
    if (!actor) {
      throw new UnauthorizedException('Authenticated user not found');
    }
    return this.issueService.requestSupervisorReview(id, body, actor, request.user);
  }

  @Post(':id/acknowledge-supervisor-escalation')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiBearerAuth(SWAGGER_JWT_AUTH)
  @ApiOperation({
    summary:
      'Mark intake supervisor escalation as handled (supervisor or admin); keeps history on issue attributes',
  })
  async acknowledgeSupervisorEscalation(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request & { user: JwtUser },
  ) {
    const actor = await this.userService.findById(request.user.sub);
    if (!actor) {
      throw new UnauthorizedException('Authenticated user not found');
    }
    return this.issueService.acknowledgeSupervisorEscalation(
      id,
      actor,
      request.user,
    );
  }

  @Get(':id/status-history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth(SWAGGER_JWT_AUTH)
  @ApiOperation({
    summary:
      'Chronological status changes with actor (intake, supervisor dispatch, technician, closure)',
  })
  statusHistory(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request & { user: JwtUser },
  ) {
    return this.issueService.getStatusHistoryForViewer(id, request.user);
  }

  @Get(':id/suggested-technicians')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.ADMIN,
    Role.SUPERVISOR,
    Role.INTAKE_OFFICER,
    Role.DEPARTMENT_OFFICER,
  )
  @ApiBearerAuth(SWAGGER_JWT_AUTH)
  @ApiOperation({
    summary:
      'Suggested dispatch order: nearest home-base distance when coords exist on ticket and technician; otherwise Zomba roster hint, same routed department as ticket, then workload',
  })
  suggestedTechnicians(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request & { user: JwtUser },
  ) {
    return this.issueService.suggestTechniciansForIssue(id, request.user);
  }

  @Post(':id/refresh-intelligence')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.INTAKE_OFFICER)
  @ApiBearerAuth(SWAGGER_JWT_AUTH)
  @ApiOperation({
    summary:
      'Re-run duplicate candidate scoring and co-department hints (after phone/location corrections or rule changes)',
  })
  async refreshIntelligence(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request & { user: JwtUser },
  ) {
    const actor = await this.userService.findById(request.user.sub);
    if (!actor) {
      throw new UnauthorizedException('Authenticated user not found');
    }
    return this.issueService.refreshIntakeIntelligence(id, actor, request.user);
  }

  @Patch(':id/reporter-context')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.INTAKE_OFFICER)
  @ApiBearerAuth(SWAGGER_JWT_AUTH)
  @ApiOperation({
    summary:
      'Correct reporter phone and/or map pin while reported or assigned; refreshes duplicate intelligence',
  })
  async patchReporterContext(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateIntakeReporterContextDto,
    @Req() request: Request & { user: JwtUser },
  ) {
    const actor = await this.userService.findById(request.user.sub);
    if (!actor) {
      throw new UnauthorizedException('Authenticated user not found');
    }
    return this.issueService.patchIntakeReporterContext(id, body, actor, request.user);
  }

  @Patch(':id/field-progress')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TECHNICIAN)
  @ApiBearerAuth(SWAGGER_JWT_AUTH)
  @ApiOperation({
    summary:
      'Technician work sub-status (category-specific: field crew, billing desk, metering, etc.) while assigned or in progress',
  })
  async updateFieldProgress(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateFieldProgressDto,
    @Req() request: Request & { user: JwtUser },
  ) {
    const actor = await this.userService.findById(request.user.sub);
    if (!actor) {
      throw new UnauthorizedException('Authenticated user not found');
    }
    return this.issueService.updateFieldProgress(id, body.fieldProgress, actor);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth(SWAGGER_JWT_AUTH)
  @ApiOperation({
    summary:
      'Get issue by id (staff: scoped by role; technician: only if assigned)',
  })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request & { user: JwtUser },
  ) {
    return this.issueService.findOneForViewer(id, request.user);
  }

  @Get(':id/billing-resolution-context')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TECHNICIAN)
  @ApiBearerAuth(SWAGGER_JWT_AUTH)
  @ApiOperation({
    summary:
      'Auto ledger action, balance, and reconnection for billing resolution (from issue + billing registry)',
  })
  async getBillingResolutionContext(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request & { user: JwtUser },
  ) {
    const actor = await this.userService.findById(request.user.sub);
    if (!actor) {
      throw new UnauthorizedException('Authenticated user not found');
    }
    return this.issueService.getBillingResolutionContext(id, actor);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TECHNICIAN)
  @ApiBearerAuth(SWAGGER_JWT_AUTH)
  @ApiOperation({
    summary:
      'Update status: assigned→in_progress, or in_progress→resolved (with resolution details)',
  })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIssueStatusDto,
    @Req() request: Request & { user: JwtUser },
  ) {
    const actor = await this.userService.findById(request.user.sub);
    if (!actor) {
      throw new UnauthorizedException('Authenticated user not found');
    }
    return this.issueService.updateStatus(id, dto, actor);
  }

  @Post(':id/close')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.DEPARTMENT_OFFICER)
  @ApiBearerAuth(SWAGGER_JWT_AUTH)
  @ApiOperation({
    summary:
      'Close a resolved issue (supervisors/admins: any; department_officer: only issues routed to their unit)',
  })
  async close(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request & { user: JwtUser },
  ) {
    const actor = await this.userService.findById(request.user.sub);
    if (!actor) {
      throw new UnauthorizedException('Authenticated user not found');
    }
    return this.issueService.closeIssue(id, actor);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ISSUE_STAFF_ROLES)
  @ApiBearerAuth(SWAGGER_JWT_AUTH)
  @ApiOperation({
    summary: 'Create issue on behalf of a reporter (staff only)',
  })
  async create(
    @Body() createIssueDto: CreateIssueDto,
    @Req() request: Request & { user: JwtUser },
  ) {
    const currentUser = await this.userService.findById(request.user.sub);
    if (!currentUser) {
      throw new UnauthorizedException('Authenticated user not found');
    }
    return this.issueService.create(createIssueDto, currentUser);
  }

  @Post('public/attachments/:id')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        meterNumber: { type: 'string' },
        reporterPhone: { type: 'string' },
      },
      required: ['file', 'meterNumber', 'reporterPhone'],
    },
  })
  @ApiOperation({
    summary:
      'Upload evidence for a public complaint (within 1 hour of create; phone + meter must match)',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: uploadStorage,
      limits: { fileSize: uploadLimitBytes },
    }),
  )
  uploadPublicAttachment(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: { meterNumber: string; reporterPhone: string },
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('file is required');
    }
    if (!body.meterNumber?.trim() || !body.reporterPhone?.trim()) {
      throw new BadRequestException('meterNumber and reporterPhone are required');
    }
    return this.issueService.addPublicAttachment(id, file, {
      meterNumber: body.meterNumber.trim(),
      reporterPhone: body.reporterPhone.trim(),
    });
  }

  @Post('public')
  @ApiOperation({
    summary: 'Public guest complaint intake (no login required)',
  })
  createPublic(@Body() createIssueDto: CreateIssueDto) {
    return this.issueService.createPublic(createIssueDto);
  }
}
