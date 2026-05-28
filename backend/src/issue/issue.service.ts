import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  DataSource,
  EntityManager,
  IsNull,
  MoreThan,
  Repository,
} from 'typeorm';
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import { Issue } from './issue.entity';
import { IssueAttachment } from './issue-attachment.entity';
import { Location } from '../location/location.entity';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIntakeReporterContextDto } from './dto/update-intake-reporter-context.dto';
import { UpdateIssueStatusDto } from './dto/update-issue-status.dto';
import { User } from '../user/user.entity';
import { StatusService } from '../status/status.service';
import { IssueStatus } from '../common/enums/issue-status.enum';
import { IssueStatusHistory } from './issue-status-history.entity';
import { AuditLog } from '../audit/audit-log.entity';
import { Assignment } from '../assignment/assignment.entity';
import { Resolution } from './resolution.entity';
import { Role } from '../common/enums/role.enum';
import { JwtUser } from '../common/interfaces/jwt-user.interface';
import { NotificationService } from '../notification/notification.service';
import {
  canCloseIssueFromStatus,
  isValidTechnicianStatusTransition,
} from './issue-status.rules';
import { ISSUE_CLASSIFICATION } from './issue-classification';
import { validateAndNormalizeIssueAttributes } from './issue-attributes.schema';
import {
  maxUrgencyLevel,
  resolveDepartmentFromCategory,
  resolveUrgencyLevelFromClassification,
} from './issue-routing';
import {
  canStaffQueryAssignedDepartmentFilter,
  canViewAnyIssueAsStaff,
  staffAssignedDepartmentListScope,
} from '../auth/role-access';
import type { DepartmentPlaybookDto } from './issue-department-playbook';
import {
  formatBillingResolutionDetails,
  parseAndValidateBillingResolution,
  stampBillingResolutionAttributes,
} from './billing-resolution';
import {
  buildBillingCustomerEmail,
  buildBillingCustomerSms,
  stampBillingNotificationAttributes,
} from './billing-customer-notification';
import {
  assertBillingResolutionMatchesContext,
  buildBillingResolutionContext,
} from './billing-resolution-context';
import { isValidWorkProgressForCategory } from './category-work-progress';
import {
  getDepartmentPlaybook,
  suggestCoDepartments,
} from './issue-department-playbook';
import { buildCitizenPublicGuidance } from './issue-citizen-public-guidance';
import { MeterLookupService } from '../meter/meter-lookup.service';
import { MeterVerificationService } from '../meter/meter-verification.service';
import { sanitizePremiseForPublic } from '../meter/premise-lookup.sanitize';
import { getDistrictByNumber, MALAWI_DISTRICTS } from '../meter/malawi-districts.data';
import type { PremiseLookupResult } from '../meter/premise-lookup.types';
import { SlaRulesService } from '../sla/sla-rules.service';
import { UserService } from '../user/user.service';
import { AssignmentService } from '../assignment/assignment.service';
import { PublicIntakeAssignmentService } from './public-intake-assignment.service';
import type {
  PublicAssignmentSummaryDto,
  PublicIssueCreateResultDto,
} from './dto/public-issue-create-result.dto';
import { normalizePhoneDigits } from '../meter/phone-normalize';
import { haversineDistanceKm } from '../geo/haversine-km';
import {
  canAccessFraudInvestigationIssueAsStaff,
  FRAUD_INVESTIGATION_CATEGORY,
} from './issue-fraud-access';

export type IntakeIntelligenceSummary = {
  duplicateCandidateCount: number;
  duplicateSkippedReason?: string;
  coDepartmentSuggestions?: string;
  refreshedAt: string;
};

export type BillingCustomerNotificationDelivery = {
  channel: string;
  smsSent: boolean;
  emailSent: boolean;
  attemptedAt: string;
  detail: string;
};

export type IssueWithResolution = Issue & {
  resolution?: Resolution | null;
  departmentPlaybook?: DepartmentPlaybookDto | null;
  currentAssignment?: {
    technicianId: number;
    technicianName: string;
    priorityLevel: string;
    assignmentDate: string;
  } | null;
  intakeIntelligence?: IntakeIntelligenceSummary;
  billingCustomerNotification?: BillingCustomerNotificationDelivery | null;
};
type PublicTrackResult = {
  issue: {
    id: number;
    reference: string;
    description: string;
    issueCategory: string;
    issueSubcategory: string | null;
    assignedDepartment: string;
    currentStatus: string;
    urgencyLevel: string;
    dateReported: Date;
    location: {
      addressDescription: string;
      serviceArea: string | null;
    } | null;
    customerResolutionFeedback: string | null;
    customerResolutionComment: string | null;
    customerResolutionAt: Date | null;
    premiseSummary: {
      found: boolean;
      meterNumber?: string;
      customerName?: string;
      accountNumber?: string;
      physicalAddress?: string;
      serviceArea?: string;
      supplyZone?: string;
      meterType?: string;
      accountStatus?: string;
      openIssuesOnPremise?: number;
    } | null;
  };
  timeline: Array<{
    status: string;
    changedAt: Date;
  }>;
  notifications: Array<{
    title: string;
    message: string;
    at: Date;
  }>;
  citizenGuidance: {
    headline: string;
    bullets: string[];
    disclaimer: string;
  };
};

@Injectable()
export class IssueService {
  constructor(
    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(IssueStatusHistory)
    private readonly historyRepository: Repository<IssueStatusHistory>,
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(Resolution)
    private readonly resolutionRepository: Repository<Resolution>,
    @InjectRepository(IssueAttachment)
    private readonly attachmentRepository: Repository<IssueAttachment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly statusService: StatusService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
    private readonly meterLookupService: MeterLookupService,
    private readonly meterVerificationService: MeterVerificationService,
    private readonly slaRulesService: SlaRulesService,
    private readonly userService: UserService,
    private readonly publicIntakeAssignment: PublicIntakeAssignmentService,
    private readonly assignmentService: AssignmentService,
  ) {}

  async createPublic(
    createIssueDto: CreateIssueDto,
  ): Promise<PublicIssueCreateResultDto> {
    const saved = await this.create(createIssueDto, null);
    const full = await this.issueRepository.findOne({
      where: { id: saved.id },
      relations: ['location', 'currentStatus'],
    });
    const issue = full ?? saved;

    let assignment: PublicAssignmentSummaryDto | null = null;
    try {
      assignment = await this.publicIntakeAssignment.tryAutoAssign(issue);
    } catch {
      assignment = null;
    }

    const publicReference =
      issue.issueCategory === 'water_supply'
        ? `WS-${new Date().getFullYear()}-${String(issue.id).padStart(6, '0')}`
        : null;

    return {
      id: issue.id,
      reference: `ISS-${issue.id}`,
      publicReference,
      issueCategory: issue.issueCategory,
      issueSubcategory: issue.issueSubcategory,
      currentStatus:
        assignment?.currentStatus ?? issue.currentStatus?.name ?? 'reported',
      assignment,
    };
  }

  async addPublicAttachment(
    issueId: number,
    file: Express.Multer.File,
    body: { meterNumber: string; reporterPhone: string },
  ): Promise<{
    id: number;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
  }> {
    const issue = await this.issueRepository.findOne({
      where: { id: issueId },
    });
    if (!issue) {
      throw new NotFoundException('Issue not found');
    }
    this.assertPublicReporterAccess(issue, body.reporterPhone, body.meterNumber);

    const uploader =
      (await this.userRepository.findOne({
        where: { role: Role.ADMIN, isActive: true },
        order: { id: 'ASC' },
      })) ??
      (await this.userRepository.findOne({
        where: { role: Role.SUPERVISOR, isActive: true },
        order: { id: 'ASC' },
      }));
    if (!uploader) {
      throw new BadRequestException('System uploader account is not configured');
    }

    const saved = await this.saveAttachmentFile(issueId, file, uploader);
    return {
      id: saved.id,
      originalName: saved.originalName,
      mimeType: saved.mimeType,
      sizeBytes: saved.sizeBytes,
    };
  }

  private assertPublicReporterAccess(
    issue: Issue,
    reporterPhone: string,
    meterNumberRaw: string,
  ): void {
    const phoneA = normalizePhoneDigits(reporterPhone);
    const phoneB = normalizePhoneDigits(issue.reporterPhone ?? '');
    if (!phoneA || phoneA !== phoneB) {
      throw new ForbiddenException('Phone number does not match this complaint');
    }
    const meter = this.meterLookupService.normalizeMeterNumber(meterNumberRaw);
    const snap = issue.premiseSnapshot as Record<string, unknown> | null;
    const snapMeter =
      typeof snap?.meterNumber === 'string' ? snap.meterNumber : '';
    if (snapMeter && snapMeter !== meter) {
      throw new ForbiddenException('Meter number does not match this complaint');
    }
    const ageMs = Date.now() - new Date(issue.dateReported).getTime();
    if (ageMs > 60 * 60 * 1000) {
      throw new BadRequestException(
        'The evidence upload window for this complaint has expired (1 hour).',
      );
    }
  }

  private async saveAttachmentFile(
    issueId: number,
    file: Express.Multer.File,
    uploadedBy: User,
  ): Promise<IssueAttachment> {
    const maxMb = this.configService.get<number>('MAX_UPLOAD_MB', 5);
    if (file.size > maxMb * 1024 * 1024) {
      throw new BadRequestException(`File exceeds ${maxMb}MB limit`);
    }
    const allowed = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ]);
    if (!allowed.has(file.mimetype)) {
      throw new BadRequestException(
        'Only JPEG, PNG, WebP, and PDF uploads are allowed',
      );
    }

    const baseDir = this.configService.get<string>('UPLOAD_DIR', 'uploads');
    const ext = extname(file.originalname || '') || '.bin';
    const storedFile = `${randomUUID()}${ext}`;
    const absDir = join(process.cwd(), baseDir, 'issues', String(issueId));
    mkdirSync(absDir, { recursive: true });
    const absPath = join(absDir, storedFile);
    writeFileSync(absPath, file.buffer);

    const storedPath = join('issues', String(issueId), storedFile).replace(
      /\\/g,
      '/',
    );

    return this.attachmentRepository.save(
      this.attachmentRepository.create({
        issue: { id: issueId } as Issue,
        uploadedBy,
        storedPath,
        originalName: (file.originalname || storedFile).slice(0, 250),
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploadedAt: new Date(),
      }),
    );
  }

  async create(
    createIssueDto: CreateIssueDto,
    createdBy: User | null,
  ): Promise<Issue> {
    const category = createIssueDto.issueCategory.trim();
    const categoryConfig = ISSUE_CLASSIFICATION[category];
    if (!categoryConfig) {
      throw new BadRequestException(
        `Unsupported issue category "${category}"`,
      );
    }
    if (createIssueDto.issueSubcategory?.trim()) {
      const subcategory = createIssueDto.issueSubcategory.trim();
      if (!categoryConfig.subcategories.includes(subcategory)) {
        throw new BadRequestException(
          `Subcategory "${subcategory}" is not valid for category "${category}"`,
        );
      }
    }

    const reportedStatus = await this.statusService.findByName(IssueStatus.REPORTED);
    if (!reportedStatus) {
      throw new NotFoundException('Default reported status is missing');
    }

    const subcategory = createIssueDto.issueSubcategory?.trim() || null;
    const normalizedAttributes = validateAndNormalizeIssueAttributes(
      subcategory,
      createIssueDto.issueAttributes,
    );

    const meterFromAttrs =
      normalizedAttributes &&
      typeof normalizedAttributes['meterNumber'] === 'string'
        ? String(normalizedAttributes['meterNumber']).trim()
        : '';
    const meterKey = (
      createIssueDto.meterNumber?.trim() ||
      meterFromAttrs ||
      ''
    ).trim();

    if (!createdBy && !meterKey) {
      throw new BadRequestException(
        'Public complaints require a registered meter number for identity and location anchoring.',
      );
    }

    let premiseSnapshot: Record<string, unknown> | null = null;
    let accountNumber = createIssueDto.accountNumber?.trim() || null;
    let serviceAreaFill = createIssueDto.location.serviceArea?.trim() || null;
    let lookedRow: PremiseLookupResult | null = null;

    if (meterKey) {
      lookedRow = this.meterLookupService.lookup(meterKey);
      if (lookedRow.found) {
        const { phoneNumber: _ph, nationalId: _nid, ...safePremise } = lookedRow;
        premiseSnapshot = {
          ...safePremise,
          fromRegistry: true,
        } as Record<string, unknown>;
        if (!accountNumber && lookedRow.accountNumber) {
          accountNumber = lookedRow.accountNumber;
        }
        if (!serviceAreaFill && lookedRow.serviceArea) {
          serviceAreaFill = lookedRow.serviceArea;
        }
      } else {
        premiseSnapshot = {
          found: false,
          meterNumber: lookedRow.meterNumber,
          fromRegistry: false,
        };
      }
    }

    if (!createdBy) {
      if (!lookedRow?.found) {
        throw new BadRequestException(
          'Invalid meter number. Please verify against the official meter registry and try again.',
        );
      }
      this.meterVerificationService.assertConsumedForPublicCreate(
        createIssueDto.meterVerificationId,
        meterKey,
      );
      const intakeCtx = {
        reportDistrictNumber: createIssueDto.reportDistrictNumber ?? null,
        reportDistrictName: createIssueDto.reportDistrictName?.trim() || null,
        reportLocationNumber: createIssueDto.reportLocationNumber ?? null,
        reportLocationName: createIssueDto.reportLocationName?.trim() || null,
        reportLocationDetail: createIssueDto.reportLocationDetail?.trim() || null,
        meterVerifiedAt: new Date().toISOString(),
      };
      premiseSnapshot = {
        ...(premiseSnapshot ?? {}),
        publicIntake: intakeCtx,
      };
    }

    const addrBase = (createIssueDto.location.addressDescription ?? '').trim();
    const addrDetail = (createIssueDto.reportLocationDetail ?? '').trim();
    const districtLine =
      createIssueDto.reportDistrictName?.trim() &&
      `District: ${createIssueDto.reportDistrictName.trim()}`;
    const areaLine =
      createIssueDto.reportLocationName?.trim() &&
      `Location menu: ${createIssueDto.reportLocationName.trim()}`;
    const addressDescription = [addrBase, addrDetail, districtLine, areaLine]
      .filter((x) => Boolean(x && String(x).trim()))
      .join('\n\n');

    let lat = createIssueDto.location.latitude;
    let lng = createIssueDto.location.longitude;
    if (
      lat == null ||
      lng == null ||
      !Number.isFinite(Number(lat)) ||
      !Number.isFinite(Number(lng))
    ) {
      if (
        lookedRow?.found &&
        lookedRow.latitude != null &&
        lookedRow.longitude != null
      ) {
        lat = Number(lookedRow.latitude);
        lng = Number(lookedRow.longitude);
      }
    }
    if (
      lat == null ||
      lng == null ||
      !Number.isFinite(Number(lat)) ||
      !Number.isFinite(Number(lng))
    ) {
      throw new BadRequestException(
        'location.latitude and location.longitude are required (or use a meter with registry coordinates).',
      );
    }

    const location = this.locationRepository.create({
      latitude: Number(lat),
      longitude: Number(lng),
      addressDescription: addressDescription || addrBase || 'Address not provided',
      serviceArea: serviceAreaFill ? serviceAreaFill : null,
    });

    const autoUrgency = resolveUrgencyLevelFromClassification(
      category,
      subcategory,
    );
    const dtoUrgency = createIssueDto.urgencyLevel?.trim();
    const urgencyLevel =
      createdBy != null && dtoUrgency
        ? maxUrgencyLevel(autoUrgency, dtoUrgency)
        : autoUrgency;

    const issue = this.issueRepository.create({
      description: createIssueDto.description,
      severityLevel: createIssueDto.severityLevel,
      issueCategory: category,
      issueSubcategory: subcategory,
      assignedDepartment: resolveDepartmentFromCategory(category),
      urgencyLevel,
      accountNumber,
      affectedScope: createIssueDto.affectedScope?.trim() || null,
      issueAttributes: normalizedAttributes,
      reportChannel: createIssueDto.reportChannel,
      dateReported: new Date(createIssueDto.dateReported),
      reporterName: createIssueDto.reporterName,
      reporterPhone: createIssueDto.reporterPhone,
      reporterAffiliation: createIssueDto.reporterAffiliation ?? null,
      reporterEmail: createIssueDto.reporterEmail
        ? createIssueDto.reporterEmail.trim().toLowerCase()
        : null,
      createdBy: createdBy ?? null,
      location,
      currentStatus: reportedStatus,
      premiseSnapshot,
      customerResolutionFeedback: null,
      customerResolutionComment: null,
      customerResolutionAt: null,
    });

    const savedIssue = await this.issueRepository.save(issue);

    await this.historyRepository.save(
      this.historyRepository.create({
        issue: savedIssue,
        status: reportedStatus,
        changedBy: createdBy ?? null,
        changedAt: new Date(),
      }),
    );

    await this.auditRepository.save(
      this.auditRepository.create({
        user: createdBy ?? null,
        actionPerformed: createdBy ? 'create_issue' : 'create_issue_public',
        entityName: 'Issue',
        entityId: savedIssue.id,
        timestamp: new Date(),
      }),
    );

    void this.notificationService.notifyIssueEvent({
      type: 'created',
      issueId: savedIssue.id,
      summary: `${savedIssue.reporterName?.trim() ? `Dear ${savedIssue.reporterName.trim()},\n\n` : ''}Your complaint has been received by the Malawi Water Board system.\n\nReference ID: ISS-${savedIssue.id}\nCategory: ${savedIssue.issueCategory.replace(/_/g, ' ')}${savedIssue.issueSubcategory ? ` (${savedIssue.issueSubcategory.replace(/_/g, ' ')})` : ''}\nCurrent status: reported\n\nKeep this reference ID to track updates. You can monitor progress on the public tracking page using your phone number.\n\nThank you for reporting this issue.`,
      reporterEmail: savedIssue.reporterEmail,
      reporterPhone: savedIssue.reporterPhone,
    });

    await this.stampIntakeDuplicateIntelligence(savedIssue.id);
    await this.stampDepartmentCoSuggestions(savedIssue.id, category, subcategory);
    await this.applySlaDueDates(
      savedIssue.id,
      category,
      subcategory,
      urgencyLevel,
      savedIssue.dateReported,
    );

    const refreshed = await this.issueRepository.findOne({
      where: { id: savedIssue.id },
      relations: ['location', 'currentStatus', 'createdBy'],
    });
    return refreshed ?? savedIssue;
  }

  async findAllForStaffPaginated(
    skip: number,
    take: number,
    statusName: string | undefined,
    viewer: JwtUser,
    listOptions?: {
      assignedDepartmentQuery?: string;
      needsDuplicateReview?: boolean;
    },
  ): Promise<{
    items: Issue[];
    total: number;
    skip: number;
    take: number;
  }> {
    const qb = this.issueRepository
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.createdBy', 'createdBy')
      .leftJoinAndSelect('issue.location', 'location')
      .leftJoinAndSelect('issue.currentStatus', 'st')
      .orderBy('issue.dateReported', 'DESC')
      .skip(skip)
      .take(take);

    if (statusName?.trim()) {
      qb.andWhere('st.name = :status', { status: statusName.trim() });
    }

    if (listOptions?.needsDuplicateReview) {
      qb.andWhere(
        `CAST(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(issue.issueAttributes, '$.intake_duplicate_candidate_count')), '0') AS UNSIGNED) > 0`,
      );
    }

    const scope = staffAssignedDepartmentListScope(
      viewer.role,
      viewer.department,
    );
    let assignedDepartmentFilter: string | undefined;
    if (scope) {
      assignedDepartmentFilter = scope[0];
    } else if (
      listOptions?.assignedDepartmentQuery?.trim() &&
      canStaffQueryAssignedDepartmentFilter(viewer.role)
    ) {
      assignedDepartmentFilter = listOptions.assignedDepartmentQuery.trim();
    }
    if (assignedDepartmentFilter) {
      qb.andWhere('issue.assignedDepartment = :adFilter', {
        adFilter: assignedDepartmentFilter,
      });
    }

    if (viewer.role === Role.INTAKE_OFFICER) {
      qb.andWhere('issue.issueCategory != :fraudCat', {
        fraudCat: FRAUD_INVESTIGATION_CATEGORY,
      });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, skip, take };
  }

  async findPossibleDuplicateHints(params: {
    reporterPhone?: string;
    latitude?: number;
    longitude?: number;
    days: number;
    /**
     * @deprecated Fraud investigation tickets are always excluded from duplicate matching.
     */
    forIntakeOfficer?: boolean;
    /** Minimum composite duplicate signal (phone proximity, map distance, category, time). Default 5. */
    minScore?: number;
    anchorReportedAt?: Date;
    anchorCategory?: string;
    excludeIssueId?: number;
  }): Promise<Issue[]> {
    const hasPhone = Boolean(params.reporterPhone?.trim());
    const hasGeo =
      params.latitude !== undefined && params.longitude !== undefined;
    if (!hasPhone && !hasGeo) {
      throw new BadRequestException(
        'Provide reporterPhone and/or both latitude and longitude',
      );
    }

    const since = new Date();
    since.setDate(since.getDate() - params.days);

    const qb = this.issueRepository
      .createQueryBuilder('issue')
      .innerJoinAndSelect('issue.currentStatus', 'st')
      .innerJoinAndSelect('issue.location', 'loc')
      .where('st.name != :closed', { closed: IssueStatus.CLOSED })
      .andWhere('issue.dateReported >= :since', { since })
      .andWhere('issue.issueCategory != :fraudCatDup', {
        fraudCatDup: FRAUD_INVESTIGATION_CATEGORY,
      });

    const box = 0.02;
    if (hasPhone && hasGeo) {
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('issue.reporterPhone = :dupPhone', {
              dupPhone: params.reporterPhone!.trim(),
            })
            .orWhere(
              'ABS(loc.latitude - :dupLat) < :dupBox AND ABS(loc.longitude - :dupLng) < :dupBox',
              {
                dupLat: params.latitude,
                dupLng: params.longitude,
                dupBox: box,
              },
            );
        }),
      );
    } else if (hasPhone) {
      qb.andWhere('issue.reporterPhone = :phone', {
        phone: params.reporterPhone!.trim(),
      });
    } else if (hasGeo) {
      qb.andWhere(
        'ABS(loc.latitude - :lat) < :box AND ABS(loc.longitude - :lng) < :box',
        {
          lat: params.latitude,
          lng: params.longitude,
          box,
        },
      );
    }

    qb.orderBy('issue.dateReported', 'DESC');
    const pool = await qb.getMany();

    const anchorPhoneNorm = normalizePhoneDigits(params.reporterPhone ?? '');
    const anchorLat = hasGeo ? Number(params.latitude) : undefined;
    const anchorLng = hasGeo ? Number(params.longitude) : undefined;
    const anchorTime = params.anchorReportedAt ?? new Date();
    const anchorCategory = params.anchorCategory ?? '';
    const minScore = params.minScore ?? 5;

    const scored = pool
      .filter((i) =>
        params.excludeIssueId != null ? i.id !== params.excludeIssueId : true,
      )
      .map((cand) => ({
        cand,
        score: this.scoreDuplicateCandidate(
          {
            anchorPhoneNorm,
            anchorLat,
            anchorLng,
            anchorTime,
            anchorCategory,
            hasPhone,
            hasGeo,
          },
          cand,
        ),
      }))
      .filter((x) => x.score >= minScore)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.cand.id - a.cand.id;
      })
      .slice(0, 25)
      .map((x) => x.cand);

    return scored;
  }

  private scoreDuplicateCandidate(
    anchor: {
      anchorPhoneNorm: string;
      anchorLat?: number;
      anchorLng?: number;
      anchorTime: Date;
      anchorCategory: string;
      hasPhone: boolean;
      hasGeo: boolean;
    },
    cand: Issue,
  ): number {
    let score = 0;
    const candNorm = normalizePhoneDigits(cand.reporterPhone ?? '');
    if (
      anchor.hasPhone &&
      anchor.anchorPhoneNorm.length > 0 &&
      candNorm.length > 0 &&
      candNorm === anchor.anchorPhoneNorm
    ) {
      score += 12;
    }
    if (
      anchor.hasGeo &&
      anchor.anchorLat != null &&
      anchor.anchorLng != null &&
      cand.location &&
      cand.location.latitude != null &&
      cand.location.longitude != null
    ) {
      const d = haversineDistanceKm(
        anchor.anchorLat,
        anchor.anchorLng,
        Number(cand.location.latitude),
        Number(cand.location.longitude),
      );
      if (d < 0.15) score += 8;
      else if (d < 0.5) score += 5;
      else if (d < 2) score += 3;
      else if (d < 5) score += 1;
    }
    if (
      anchor.anchorCategory &&
      cand.issueCategory === anchor.anchorCategory
    ) {
      score += 2;
    }
    const hoursApart =
      Math.abs(
        new Date(cand.dateReported).getTime() - anchor.anchorTime.getTime(),
      ) / 3600000;
    if (hoursApart < 48) score += 3;
    else if (hoursApart < 168) score += 1;
    return score;
  }

  /**
   * Same phone / nearby coordinates as this issue, excluding itself (intake duplicate check).
   */
  async findDuplicateHintsForIssue(
    issueId: number,
    viewer: JwtUser,
  ): Promise<Issue[]> {
    await this.assertIssueAccessible(issueId, viewer);
    const issue = await this.issueRepository.findOne({
      where: { id: issueId },
      relations: ['location'],
    });
    if (!issue) {
      throw new NotFoundException('Issue not found');
    }
    const lat = issue.location?.latitude;
    const lng = issue.location?.longitude;
    const hints = await this.findPossibleDuplicateHints({
      reporterPhone: issue.reporterPhone,
      latitude: lat !== undefined && lat !== null ? Number(lat) : undefined,
      longitude: lng !== undefined && lng !== null ? Number(lng) : undefined,
      days: 30,
      minScore: 5,
      anchorReportedAt: issue.dateReported,
      anchorCategory: issue.issueCategory,
      excludeIssueId: issueId,
    });
    return hints;
  }

  async refreshIntakeIntelligence(
    issueId: number,
    actor: User,
    viewer: JwtUser,
  ): Promise<IssueWithResolution> {
    await this.assertIssueAccessible(issueId, viewer);
    const issue = await this.issueRepository.findOne({ where: { id: issueId } });
    if (!issue) {
      throw new NotFoundException('Issue not found');
    }
    const dup = await this.stampIntakeDuplicateIntelligence(issueId);
    await this.stampDepartmentCoSuggestions(
      issueId,
      issue.issueCategory,
      issue.issueSubcategory ?? null,
    );
    await this.auditRepository.save(
      this.auditRepository.create({
        user: actor,
        actionPerformed: 'refresh_intake_intelligence',
        entityName: 'Issue',
        entityId: issueId,
        timestamp: new Date(),
      }),
    );
    return this.buildIssueWithIntelligenceSummary(issueId, viewer, dup);
  }

  async patchIntakeReporterContext(
    issueId: number,
    dto: UpdateIntakeReporterContextDto,
    actor: User,
    viewer: JwtUser,
  ): Promise<IssueWithResolution> {
    const hasPhone = Boolean(dto.reporterPhone?.trim());
    const latDefined =
      dto.latitude !== undefined && dto.latitude !== null && !Number.isNaN(dto.latitude);
    const lngDefined =
      dto.longitude !== undefined &&
      dto.longitude !== null &&
      !Number.isNaN(dto.longitude);
    if (latDefined !== lngDefined) {
      throw new BadRequestException(
        'Provide both latitude and longitude together, or omit coordinates',
      );
    }
    const hasGeo = latDefined && lngDefined;
    const hasAddrField = dto.addressDescription !== undefined;
    if (!hasPhone && !hasGeo && !hasAddrField) {
      throw new BadRequestException(
        'Provide reporterPhone, both coordinates, and/or addressDescription to update',
      );
    }

    await this.assertIssueAccessible(issueId, viewer);
    const issue = await this.issueRepository.findOne({
      where: { id: issueId },
      relations: ['location', 'currentStatus'],
    });
    if (!issue) {
      throw new NotFoundException('Issue not found');
    }
    const st = issue.currentStatus?.name;
    if (st !== IssueStatus.REPORTED && st !== IssueStatus.ASSIGNED) {
      throw new BadRequestException(
        'Reporter contact can only be corrected while the issue is reported or assigned',
      );
    }
    if (!issue.location) {
      throw new BadRequestException('Issue has no location record to update');
    }

    let locationTouched = false;
    if (hasGeo) {
      issue.location.latitude = Number(dto.latitude);
      issue.location.longitude = Number(dto.longitude);
      locationTouched = true;
    }
    if (hasAddrField) {
      issue.location.addressDescription = dto.addressDescription!.trim();
      locationTouched = true;
    }
    if (locationTouched) {
      await this.locationRepository.save(issue.location);
    }
    if (hasPhone) {
      issue.reporterPhone = dto.reporterPhone!.trim();
    }
    await this.issueRepository.save(issue);

    const dup = await this.stampIntakeDuplicateIntelligence(issueId);
    await this.stampDepartmentCoSuggestions(
      issueId,
      issue.issueCategory,
      issue.issueSubcategory ?? null,
    );

    await this.auditRepository.save(
      this.auditRepository.create({
        user: actor,
        actionPerformed: 'patch_intake_reporter_context',
        entityName: 'Issue',
        entityId: issueId,
        timestamp: new Date(),
      }),
    );

    return this.buildIssueWithIntelligenceSummary(issueId, viewer, dup);
  }

  private async buildIssueWithIntelligenceSummary(
    issueId: number,
    viewer: JwtUser,
    dup: { count: number; skippedReason?: string },
  ): Promise<IssueWithResolution> {
    const base = await this.findOneForViewer(issueId, viewer);
    const attrs = base.issueAttributes ?? {};
    const co = attrs.intake_co_department_suggestions;
    return Object.assign(base, {
      intakeIntelligence: {
        duplicateCandidateCount: dup.count,
        duplicateSkippedReason: dup.skippedReason,
        coDepartmentSuggestions:
          typeof co === 'string' && co.trim() ? co : undefined,
        refreshedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Intake-only: administratively close a duplicate `reported` ticket and consolidate
   * the story onto the primary. Does not use field-work "resolved" — duplicate goes
   * straight to `closed` with structured attributes for reporting and audit.
   */
  async mergeReportedDuplicateInto(
    duplicateIssueId: number,
    keepIssueId: number,
    actor: User,
    viewer: JwtUser,
  ): Promise<IssueWithResolution> {
    if (duplicateIssueId === keepIssueId) {
      throw new BadRequestException('Cannot merge an issue into itself');
    }
    if (!canViewAnyIssueAsStaff(viewer.role)) {
      throw new ForbiddenException('You cannot merge duplicate issues');
    }
    await this.assertIssueAccessible(duplicateIssueId, viewer);
    await this.assertIssueAccessible(keepIssueId, viewer);

    const closedStatus = await this.statusService.findByName(IssueStatus.CLOSED);
    if (!closedStatus) {
      throw new NotFoundException('Closed status is missing');
    }

    const merged = await this.dataSource.transaction(async (manager) => {
      const duplicate = await manager.findOne(Issue, {
        where: { id: duplicateIssueId },
        relations: ['currentStatus'],
        lock: { mode: 'pessimistic_write' },
      });
      const primary = await manager.findOne(Issue, {
        where: { id: keepIssueId },
        relations: ['currentStatus'],
        lock: { mode: 'pessimistic_write' },
      });
      if (!duplicate || !primary) {
        throw new NotFoundException('Issue not found');
      }

      if (duplicate.currentStatus.name !== IssueStatus.REPORTED) {
        throw new BadRequestException(
          'Only issues still in "reported" status can be merged as duplicates',
        );
      }
      const primaryStatus = primary.currentStatus.name;
      if (
        primaryStatus === IssueStatus.CLOSED ||
        primaryStatus === IssueStatus.RESOLVED
      ) {
        throw new BadRequestException(
          'Cannot merge into a closed or resolved issue — pick an active primary record',
        );
      }

      const dupAttrs = duplicate.issueAttributes ?? {};
      if (
        dupAttrs.merged_into_issue_id != null &&
        String(dupAttrs.merged_into_issue_id).trim() !== ''
      ) {
        throw new BadRequestException(
          'This issue was already merged into another record',
        );
      }

      const existingRes = await manager.findOne(Resolution, {
        where: { issue: { id: duplicateIssueId } },
      });
      if (existingRes) {
        throw new BadRequestException(
          'This issue already has a field resolution; merge is not allowed',
        );
      }

      const primaryAttrs: Record<string, string | number> = {
        ...(primary.issueAttributes ?? {}),
      };
      const prevMerged = String(primaryAttrs.intake_merged_duplicate_ids ?? '').trim();
      primaryAttrs.intake_merged_duplicate_ids = prevMerged
        ? `${prevMerged},${duplicateIssueId}`
        : String(duplicateIssueId);
      const excerpt = duplicate.description.trim().slice(0, 400);
      const mergeLine = `[Also registered as ISS-${duplicateIssueId} — ${duplicate.reporterName?.trim() || 'Reporter'}]: ${excerpt}`;
      const prevNotes = primaryAttrs.intake_consolidated_notes;
      primaryAttrs.intake_consolidated_notes = prevNotes
        ? `${String(prevNotes)}\n\n${mergeLine}`
        : mergeLine;
      primary.issueAttributes = primaryAttrs;
      await manager.save(Issue, primary);

      const nextDupAttrs: Record<string, string | number> = {
        ...dupAttrs,
        merged_into_issue_id: keepIssueId,
        closure_kind: 'intake_duplicate_merge',
        intake_duplicate_merge_at: new Date().toISOString(),
        intake_duplicate_merge_by_user_id: actor.id,
      };
      duplicate.issueAttributes = nextDupAttrs;

      duplicate.currentStatus = closedStatus;
      await manager.save(Issue, duplicate);

      await manager.save(
        IssueStatusHistory,
        manager.create(IssueStatusHistory, {
          issue: duplicate,
          status: closedStatus,
          changedBy: actor,
          changedAt: new Date(),
        }),
      );

      await manager.save(
        AuditLog,
        manager.create(AuditLog, {
          user: actor,
          actionPerformed: 'merge_duplicate_issue',
          entityName: 'Issue',
          entityId: duplicateIssueId,
          timestamp: new Date(),
        }),
      );

      const fresh = await manager.findOne(Issue, { where: { id: duplicateIssueId } });
      return this.mergeResolutionWithManager(manager, fresh!);
    });

    const greet = merged.reporterName?.trim()
      ? `Dear ${merged.reporterName.trim()},\n\n`
      : '';
    void this.notificationService.notifyIssueEvent({
      type: 'merged_duplicate',
      issueId: duplicateIssueId,
      summary: `${greet}Your complaint ISS-${duplicateIssueId} was registered as a duplicate of an existing case. All updates will be tracked under reference ISS-${keepIssueId}. Please use that reference when you contact the Water Board.\n\nThank you.`,
      reporterEmail: merged.reporterEmail ?? null,
      reporterPhone: merged.reporterPhone ?? null,
    });

    return merged;
  }

  async requestSupervisorReview(
    issueId: number,
    dto: { note?: string },
    actor: User,
    viewer: JwtUser,
  ): Promise<IssueWithResolution> {
    if (!canViewAnyIssueAsStaff(viewer.role)) {
      throw new ForbiddenException('You cannot request supervisor review');
    }
    await this.assertIssueAccessible(issueId, viewer);

    const updated = await this.dataSource.transaction(async (manager) => {
      const issue = await manager.findOne(Issue, {
        where: { id: issueId },
        relations: ['currentStatus'],
        lock: { mode: 'pessimistic_write' },
      });
      if (!issue) {
        throw new NotFoundException('Issue not found');
      }
      if (issue.currentStatus.name === IssueStatus.CLOSED) {
        throw new BadRequestException('Cannot request review on a closed issue');
      }

      const prev = issue.issueAttributes ?? {};
      const next: Record<string, string | number> = { ...prev };
      next.cs_supervisor_requested = 'true';
      next.cs_supervisor_requested_at = new Date().toISOString();
      next.cs_supervisor_requested_by_user_id = actor.id;
      if (dto.note?.trim()) {
        next.cs_supervisor_note = dto.note.trim().slice(0, 500);
      }
      issue.issueAttributes = next;
      await manager.save(Issue, issue);

      await manager.save(
        AuditLog,
        manager.create(AuditLog, {
          user: actor,
          actionPerformed: 'request_supervisor_review',
          entityName: 'Issue',
          entityId: issueId,
          timestamp: new Date(),
        }),
      );

      const fresh = await manager.findOne(Issue, { where: { id: issueId } });
      return this.mergeResolutionWithManager(manager, fresh!);
    });

    void this.notificationService.notifyIssueEvent({
      type: 'cs_supervisor_requested',
      issueId,
      summary: `Issue #${issueId}: customer service requested supervisor attention.${dto.note?.trim() ? ` Note: ${dto.note.trim()}` : ''}`,
      reporterEmail: null,
      reporterPhone: null,
    });

    return updated;
  }

  async acknowledgeSupervisorEscalation(
    issueId: number,
    actor: User,
    viewer: JwtUser,
  ): Promise<IssueWithResolution> {
    if (viewer.role !== Role.ADMIN && viewer.role !== Role.SUPERVISOR) {
      throw new ForbiddenException(
        'Only supervisors or administrators can acknowledge an escalation',
      );
    }
    await this.assertIssueAccessible(issueId, viewer);

    const updated = await this.dataSource.transaction(async (manager) => {
      const issue = await manager.findOne(Issue, {
        where: { id: issueId },
        relations: ['currentStatus'],
        lock: { mode: 'pessimistic_write' },
      });
      if (!issue) {
        throw new NotFoundException('Issue not found');
      }
      if (issue.currentStatus.name === IssueStatus.CLOSED) {
        throw new BadRequestException('Cannot acknowledge on a closed issue');
      }

      const prev = issue.issueAttributes ?? {};
      const raw = prev.cs_supervisor_requested;
      const flagged =
        raw === 'true' || raw === 1 || raw === '1';
      if (!flagged) {
        throw new BadRequestException(
          'This issue does not have an active supervisor escalation flag',
        );
      }

      const next: Record<string, string | number> = { ...prev };
      next.cs_supervisor_acknowledged = 'true';
      next.cs_supervisor_acknowledged_at = new Date().toISOString();
      next.cs_supervisor_acknowledged_by_user_id = actor.id;
      issue.issueAttributes = next;
      await manager.save(Issue, issue);

      await manager.save(
        AuditLog,
        manager.create(AuditLog, {
          user: actor,
          actionPerformed: 'acknowledge_supervisor_escalation',
          entityName: 'Issue',
          entityId: issueId,
          timestamp: new Date(),
        }),
      );

      const fresh = await manager.findOne(Issue, { where: { id: issueId } });
      return this.mergeResolutionWithManager(manager, fresh!);
    });

    return updated;
  }

  async assertIssueAccessible(
    issueId: number,
    viewer: JwtUser,
  ): Promise<Issue> {
    if (viewer.role === Role.CITIZEN) {
      throw new ForbiddenException(
        'Citizen accounts cannot open staff issue records',
      );
    }

    const issue = await this.issueRepository.findOne({
      where: { id: issueId },
      relations: ['currentStatus', 'location'],
    });
    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    if (viewer.role === Role.TECHNICIAN) {
      await this.assertTechnicianAssignedRead(issueId, viewer.sub);
      return issue;
    }

    if (canViewAnyIssueAsStaff(viewer.role)) {
      if (
        issue.issueCategory === FRAUD_INVESTIGATION_CATEGORY &&
        !canAccessFraudInvestigationIssueAsStaff(viewer)
      ) {
        throw new ForbiddenException(
          'Illegal connection and fraud investigations are visible only to inspection & compliance unit officers, supervisors, and administrators.',
        );
      }
      const scope = staffAssignedDepartmentListScope(
        viewer.role,
        viewer.department,
      );
      if (scope && !scope.includes(issue.assignedDepartment)) {
        throw new ForbiddenException('You cannot view this issue');
      }
      return issue;
    }

    throw new ForbiddenException('You cannot view this issue');
  }

  async findOneForViewer(
    issueId: number,
    viewer: JwtUser,
  ): Promise<IssueWithResolution> {
    const issue = await this.assertIssueAccessible(issueId, viewer);
    await this.maybeFlagSlaBreach(issue);
    const fresh = await this.issueRepository.findOne({
      where: { id: issueId },
      relations: ['currentStatus', 'location', 'createdBy'],
    });
    const withRes = await this.attachResolution(fresh ?? issue);
    const playbook = getDepartmentPlaybook((fresh ?? issue).issueCategory);

    const latestAssign = await this.assignmentRepository
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.assignedTo', 'u')
      .where('a.issueId = :id', { id: issueId })
      .orderBy('a.assignmentDate', 'DESC')
      .addOrderBy('a.id', 'DESC')
      .getOne();

    const currentAssignment = latestAssign?.assignedTo
      ? {
          technicianId: latestAssign.assignedTo.id,
          technicianName: latestAssign.assignedTo.name,
          priorityLevel: latestAssign.priorityLevel,
          assignmentDate:
            latestAssign.assignmentDate instanceof Date
              ? latestAssign.assignmentDate.toISOString()
              : String(latestAssign.assignmentDate),
        }
      : null;

    return Object.assign(withRes, {
      departmentPlaybook: playbook ?? undefined,
      currentAssignment,
    });
  }

  /** Status transitions with actor (for lifecycle / progress UI). */
  async getStatusHistoryForViewer(
    issueId: number,
    viewer: JwtUser,
  ): Promise<
    Array<{
      status: string;
      changedAt: Date;
      changedBy: { name: string; email: string; role: string } | null;
    }>
  > {
    await this.assertIssueAccessible(issueId, viewer);
    const rows = await this.historyRepository.find({
      where: { issue: { id: issueId } },
      relations: ['status', 'changedBy'],
      order: { changedAt: 'ASC' },
    });
    return rows.map((r) => ({
      status: r.status.name,
      changedAt: r.changedAt,
      changedBy: r.changedBy
        ? {
            name: r.changedBy.name,
            email: r.changedBy.email,
            role: r.changedBy.role,
          }
        : null,
    }));
  }

  async trackPublicByReference(
    issueRef: string,
    reporterPhone: string,
  ): Promise<PublicTrackResult> {
    const id = this.parseIssueRef(issueRef);
    const issue = await this.issueRepository.findOne({
      where: { id },
      relations: ['currentStatus', 'location'],
    });
    if (!issue) {
      throw new NotFoundException('Issue not found');
    }
    if ((issue.reporterPhone ?? '').trim() !== reporterPhone.trim()) {
      throw new ForbiddenException('Issue reference and phone do not match');
    }

    const history = await this.historyRepository.find({
      where: { issue: { id: issue.id } },
      relations: ['status'],
      order: { changedAt: 'ASC' },
    });

    const timeline = history.map((h) => ({
      status: h.status.name,
      changedAt: h.changedAt,
    }));

    const notifications = timeline.map((step) => ({
      title: `Status update: ${step.status.replace(/_/g, ' ')}`,
      message: `Your complaint ${issueRef.toUpperCase()} is now ${step.status.replace(/_/g, ' ')}.`,
      at: step.changedAt,
    }));

    const citizenGuidance = buildCitizenPublicGuidance({
      issueCategory: issue.issueCategory,
      issueSubcategory: issue.issueSubcategory,
      urgencyLevel: issue.urgencyLevel,
    });

    return {
      issue: {
        id: issue.id,
        reference: `ISS-${issue.id}`,
        description: issue.description,
        issueCategory: issue.issueCategory,
        issueSubcategory: issue.issueSubcategory,
        assignedDepartment: issue.assignedDepartment,
        currentStatus: issue.currentStatus.name,
        urgencyLevel: issue.urgencyLevel,
        dateReported: issue.dateReported,
        location: issue.location
          ? {
              addressDescription: issue.location.addressDescription,
              serviceArea: issue.location.serviceArea ?? null,
            }
          : null,
        customerResolutionFeedback: issue.customerResolutionFeedback ?? null,
        customerResolutionComment: issue.customerResolutionComment ?? null,
        customerResolutionAt: issue.customerResolutionAt ?? null,
        premiseSummary: this.buildPremiseSummaryForPublic(issue.premiseSnapshot),
      },
      timeline,
      notifications,
      citizenGuidance,
    };
  }

  lookupMeterPublic(meterNumber: string) {
    const norm = this.meterLookupService.normalizeMeterNumber(meterNumber);
    if (!norm) {
      throw new BadRequestException('meterNumber is required');
    }
    const full = this.meterLookupService.lookup(norm);
    return sanitizePremiseForPublic(full);
  }

  listPublicDistricts(): Array<{ number: number; name: string; code: string }> {
    return MALAWI_DISTRICTS.map((d) => ({
      number: d.number,
      name: d.name,
      code: d.code,
    }));
  }

  listPublicLocations(districtNumber: number): {
    districtNumber: number;
    districtName: string;
    code: string;
    locations: { number: number; label: string }[];
  } {
    const d = getDistrictByNumber(districtNumber);
    if (!d) {
      throw new BadRequestException('Unknown district number');
    }
    return {
      districtNumber: d.number,
      districtName: d.name,
      code: d.code,
      locations: d.locations,
    };
  }

  startPublicMeterVerification(body: { meterNumber: string; phone: string }) {
    return this.meterVerificationService.start(body.meterNumber, body.phone);
  }

  confirmPublicMeterVerification(body: {
    verificationId: string;
    meterNumber: string;
    otp: string;
  }): { ok: true; meterVerificationId: string } {
    this.meterVerificationService.confirm(
      body.verificationId,
      body.otp,
      body.meterNumber,
    );
    return { ok: true, meterVerificationId: body.verificationId };
  }

  async submitPublicResolutionFeedback(params: {
    issueRef: string;
    phone: string;
    outcome: 'confirmed' | 'disputed';
    comment?: string;
  }): Promise<{
    ok: true;
    customerResolutionFeedback: string;
    customerResolutionAt: Date;
  }> {
    const id = this.parseIssueRef(params.issueRef);
    const issue = await this.issueRepository.findOne({
      where: { id },
      relations: ['currentStatus'],
    });
    if (!issue) {
      throw new NotFoundException('Issue not found');
    }
    if ((issue.reporterPhone ?? '').trim() !== params.phone.trim()) {
      throw new ForbiddenException('Issue reference and phone do not match');
    }
    if (issue.currentStatus.name !== IssueStatus.RESOLVED) {
      throw new BadRequestException(
        'You can only confirm or dispute resolution after the team marks the issue as resolved.',
      );
    }
    const prev = (issue.customerResolutionFeedback ?? '').trim();
    if (prev === 'confirmed' && params.outcome === 'disputed') {
      throw new BadRequestException(
        'This issue was already marked as satisfactorily resolved.',
      );
    }

    issue.customerResolutionFeedback =
      params.outcome === 'confirmed' ? 'confirmed' : 'disputed';
    issue.customerResolutionComment = params.comment?.trim() || null;
    issue.customerResolutionAt = new Date();
    await this.issueRepository.save(issue);

    void this.notificationService.notifyIssueEvent({
      type: 'customer_resolution_feedback',
      issueId: issue.id,
      summary: `Customer ${params.outcome === 'confirmed' ? 'confirmed' : 'disputed'} resolution for issue #${issue.id}.`,
      reporterEmail: issue.reporterEmail ?? null,
      reporterPhone: issue.reporterPhone ?? null,
    });

    return {
      ok: true,
      customerResolutionFeedback: issue.customerResolutionFeedback,
      customerResolutionAt: issue.customerResolutionAt,
    };
  }

  async listAttachments(issueId: number, viewer: JwtUser) {
    await this.assertIssueAccessible(issueId, viewer);
    const rows = await this.attachmentRepository.find({
      where: { issue: { id: issueId } },
      order: { uploadedAt: 'DESC' },
    });
    return rows.map((a) => ({
      id: a.id,
      originalName: a.originalName,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      uploadedAt: a.uploadedAt,
      downloadPath: `/issue/file/${a.id}/download`,
    }));
  }

  async addAttachment(
    issueId: number,
    file: Express.Multer.File,
    uploadedBy: User,
    viewer: JwtUser,
  ): Promise<{
    id: number;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    downloadPath: string;
  }> {
    await this.assertIssueAccessible(issueId, viewer);
    const maxMb = this.configService.get<number>('MAX_UPLOAD_MB', 5);
    if (file.size > maxMb * 1024 * 1024) {
      throw new BadRequestException(`File exceeds ${maxMb}MB limit`);
    }
    const allowed = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ]);
    if (!allowed.has(file.mimetype)) {
      throw new BadRequestException(
        'Only JPEG, PNG, WebP, and PDF uploads are allowed',
      );
    }

    const baseDir = this.configService.get<string>('UPLOAD_DIR', 'uploads');
    const ext = extname(file.originalname || '') || '.bin';
    const storedFile = `${randomUUID()}${ext}`;
    const absDir = join(process.cwd(), baseDir, 'issues', String(issueId));
    mkdirSync(absDir, { recursive: true });
    const absPath = join(absDir, storedFile);
    writeFileSync(absPath, file.buffer);

    const storedPath = join('issues', String(issueId), storedFile).replace(
      /\\/g,
      '/',
    );

    const saved = await this.attachmentRepository.save(
      this.attachmentRepository.create({
        issue: { id: issueId } as Issue,
        uploadedBy,
        storedPath,
        originalName: (file.originalname || storedFile).slice(0, 250),
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploadedAt: new Date(),
      }),
    );

    return {
      id: saved.id,
      originalName: saved.originalName,
      mimeType: saved.mimeType,
      sizeBytes: saved.sizeBytes,
      downloadPath: `/issue/file/${saved.id}/download`,
    };
  }

  async streamAttachment(
    attachmentId: number,
    viewer: JwtUser,
  ): Promise<StreamableFile> {
    const att = await this.attachmentRepository.findOne({
      where: { id: attachmentId },
      relations: ['issue'],
    });
    if (!att) {
      throw new NotFoundException('Attachment not found');
    }
    await this.assertIssueAccessible(att.issue.id, viewer);
    const base = this.configService.get<string>('UPLOAD_DIR', 'uploads');
    const full = join(process.cwd(), base, att.storedPath);
    if (!existsSync(full)) {
      throw new NotFoundException('File no longer on disk');
    }
    const stream = createReadStream(full);
    return new StreamableFile(stream, {
      type: att.mimeType,
      disposition: `attachment; filename="${encodeURIComponent(att.originalName)}"`,
    });
  }

  async updateStatus(
    issueId: number,
    dto: UpdateIssueStatusDto,
    actor: User,
  ): Promise<IssueWithResolution> {
    if (actor.role !== Role.TECHNICIAN) {
      throw new ForbiddenException('Only technicians can update issue status here');
    }

    const result = await this.dataSource.transaction(async (manager) => {
      await this.assertTechnicianAssigned(manager, issueId, actor.id);

      const issue = await manager.findOne(Issue, {
        where: { id: issueId },
        relations: ['currentStatus'],
        lock: { mode: 'pessimistic_write' },
      });
      if (!issue) {
        throw new NotFoundException('Issue not found');
      }

      const current = issue.currentStatus.name;
      const next = dto.status;

      let resolvedDetailsText: string | undefined;
      if (next === IssueStatus.RESOLVED) {
        if (issue.issueCategory === 'billing_account') {
          if (!dto.billingResolution) {
            throw new BadRequestException(
              'billingResolution is required when resolving billing & account issues',
            );
          }
          const billing = parseAndValidateBillingResolution(
            dto.billingResolution,
          );
          const premise = this.resolvePremiseForBilling(issue);
          assertBillingResolutionMatchesContext(issue, premise, billing);
          resolvedDetailsText = formatBillingResolutionDetails(billing, issue);
          issue.issueAttributes = stampBillingResolutionAttributes(
            { ...(issue.issueAttributes ?? {}) },
            billing,
          );
        } else {
          const details = dto.resolutionDetails?.trim();
          if (!details) {
            throw new BadRequestException(
              'resolutionDetails is required when status is resolved',
            );
          }
          resolvedDetailsText = details;
        }
      }

      if (!isValidTechnicianStatusTransition(current, next)) {
        throw new BadRequestException(
          `Invalid transition: cannot move from "${current}" to "${next}" (expected assigned→in_progress or in_progress→resolved)`,
        );
      }

      if (next === IssueStatus.RESOLVED) {
        const existing = await manager.findOne(Resolution, {
          where: { issue: { id: issueId } },
        });
        if (existing) {
          throw new BadRequestException('This issue is already resolved');
        }
      }

      const nextStatusEntity = await this.statusService.findByName(next);
      if (!nextStatusEntity) {
        throw new NotFoundException(`Status "${next}" is not configured`);
      }

      issue.currentStatus = nextStatusEntity;
      if (next === IssueStatus.RESOLVED) {
        issue.customerResolutionFeedback = 'pending';
        issue.customerResolutionComment = null;
        issue.customerResolutionAt = null;
      }
      await manager.save(Issue, issue);

      if (next === IssueStatus.RESOLVED && resolvedDetailsText) {
        await manager.save(
          Resolution,
          manager.create(Resolution, {
            issue,
            resolutionDetails: resolvedDetailsText,
            dateResolved: new Date(),
            resolvedBy: actor,
          }),
        );
      }

      await manager.save(
        IssueStatusHistory,
        manager.create(IssueStatusHistory, {
          issue,
          status: nextStatusEntity,
          changedBy: actor,
          changedAt: new Date(),
        }),
      );

      await manager.save(
        AuditLog,
        manager.create(AuditLog, {
          user: actor,
          actionPerformed: 'update_issue_status',
          entityName: 'Issue',
          entityId: issue.id,
          timestamp: new Date(),
        }),
      );

      const fresh = await manager.findOne(Issue, { where: { id: issueId } });
      return this.mergeResolutionWithManager(manager, fresh!);
    });

    let billingCustomerNotification: BillingCustomerNotificationDelivery | null =
      null;
    const billingResolved =
      dto.status === IssueStatus.RESOLVED && dto.billingResolution != null;

    if (billingResolved) {
      const billing = parseAndValidateBillingResolution(dto.billingResolution);
      const issueRow = await this.issueRepository.findOne({
        where: { id: issueId },
      });
      if (issueRow?.issueCategory === 'billing_account') {
        if (
          billing.customerContactChannel === 'system_sms' &&
          !issueRow.reporterPhone?.trim() &&
          !issueRow.reporterEmail?.trim()
        ) {
          throw new BadRequestException(
            'Cannot send system SMS/email: add reporter phone or email on the issue, or choose phone / in-person contact instead.',
          );
        }
        if (billing.customerContactChannel === 'system_sms') {
          const smsBody = buildBillingCustomerSms(issueRow, billing);
          const emailBody = buildBillingCustomerEmail(issueRow, billing);
          const sent =
            await this.notificationService.notifyBillingResolutionCustomer({
              issueId,
              reporterName: issueRow.reporterName,
              reporterEmail: issueRow.reporterEmail,
              reporterPhone: issueRow.reporterPhone,
              smsBody,
              emailBody,
            });
          const attemptedAt = new Date().toISOString();
          billingCustomerNotification = {
            channel: billing.customerContactChannel,
            smsSent: sent.smsSent,
            emailSent: sent.emailSent,
            attemptedAt,
            detail: sent.detail,
          };
          issueRow.issueAttributes = stampBillingNotificationAttributes(
            issueRow.issueAttributes ?? {},
            billing.customerContactChannel,
            {
              channel: billing.customerContactChannel,
              ...sent,
              attemptedAt,
            },
          );
          await this.issueRepository.save(issueRow);
        } else {
          const attemptedAt = new Date().toISOString();
          billingCustomerNotification = {
            channel: billing.customerContactChannel,
            smsSent: false,
            emailSent: false,
            attemptedAt,
            detail: 'Recorded staff contact — no automated message sent.',
          };
          issueRow.issueAttributes = stampBillingNotificationAttributes(
            issueRow.issueAttributes ?? {},
            billing.customerContactChannel,
            null,
          );
          await this.issueRepository.save(issueRow);
        }
      }
    }

    const meta = await this.issueRepository.findOne({
      where: { id: issueId },
      select: ['id', 'reporterEmail', 'reporterPhone', 'issueCategory'],
    });
    const skipGenericResolved =
      billingResolved && meta?.issueCategory === 'billing_account';
    if (!skipGenericResolved) {
      void this.notificationService.notifyIssueEvent({
        type: `status_${dto.status}`,
        issueId,
        summary: `Issue #${issueId} is now "${dto.status}".`,
        reporterEmail: meta?.reporterEmail ?? null,
        reporterPhone: meta?.reporterPhone ?? null,
      });
    }

    return Object.assign(result, {
      billingCustomerNotification,
    });
  }

  async closeIssue(issueId: number, actor: User): Promise<IssueWithResolution> {
    const closed = await this.dataSource.transaction(async (manager) => {
      const issue = await manager.findOne(Issue, {
        where: { id: issueId },
        relations: ['currentStatus'],
        lock: { mode: 'pessimistic_write' },
      });
      if (!issue) {
        throw new NotFoundException('Issue not found');
      }

      if (actor.role !== Role.ADMIN && actor.role !== Role.SUPERVISOR) {
        if (actor.role !== Role.DEPARTMENT_OFFICER) {
          throw new ForbiddenException(
            'Only supervisors, admins, or department officers can close issues',
          );
        }
        const scope = staffAssignedDepartmentListScope(
          actor.role,
          actor.department,
        );
        if (
          !scope ||
          !scope.includes((issue.assignedDepartment ?? '').trim())
        ) {
          throw new ForbiddenException(
            'Department officers may only close issues routed to their unit',
          );
        }
      }

      if (!canCloseIssueFromStatus(issue.currentStatus.name)) {
        throw new BadRequestException(
          `Issue must be resolved before closing (current: "${issue.currentStatus.name}")`,
        );
      }

      const requireAck =
        this.configService.get<string>(
          'REQUIRE_CUSTOMER_RESOLUTION_ACK_BEFORE_CLOSE',
          'false',
        ) === 'true';
      if (
        requireAck &&
        issue.customerResolutionFeedback !== 'confirmed' &&
        actor.role !== Role.ADMIN &&
        actor.role !== Role.SUPERVISOR
      ) {
        throw new BadRequestException(
          'Customer resolution confirmation is required before closing. Ask the customer to confirm on the public tracking page, or have an administrator or supervisor close the record.',
        );
      }

      const closedStatus = await this.statusService.findByName(IssueStatus.CLOSED);
      if (!closedStatus) {
        throw new NotFoundException('Closed status is missing');
      }

      issue.currentStatus = closedStatus;
      await manager.save(Issue, issue);

      await manager.save(
        IssueStatusHistory,
        manager.create(IssueStatusHistory, {
          issue,
          status: closedStatus,
          changedBy: actor,
          changedAt: new Date(),
        }),
      );

      await manager.save(
        AuditLog,
        manager.create(AuditLog, {
          user: actor,
          actionPerformed: 'close_issue',
          entityName: 'Issue',
          entityId: issue.id,
          timestamp: new Date(),
        }),
      );

      const fresh = await manager.findOne(Issue, { where: { id: issueId } });
      return this.mergeResolutionWithManager(manager, fresh!);
    });

    const greet = closed.reporterName?.trim()
      ? `Dear ${closed.reporterName.trim()},\n\n`
      : '';
    const summary = `${greet}Your reported issue #${issueId} has been officially closed by our team after the work was completed and verified as resolved.\n\nThank you for taking the time to report it.\n\n— Issue tracking`;
    void this.notificationService.notifyIssueEvent({
      type: 'closed',
      issueId,
      summary,
      reporterEmail: closed.reporterEmail ?? null,
      reporterPhone: closed.reporterPhone ?? null,
    });

    return closed;
  }

  async processSlaBreachesBatch(
    viewer: JwtUser,
    limit: number,
  ): Promise<{ scanned: number; newlyBreached: number }> {
    if (viewer.role !== Role.ADMIN && viewer.role !== Role.SUPERVISOR) {
      throw new ForbiddenException('Only supervisors or administrators can run SLA breach processing');
    }
    const cap = Math.min(Math.max(1, limit), 500);
    const rows = await this.issueRepository
      .createQueryBuilder('issue')
      .innerJoin('issue.currentStatus', 'st')
      .where('st.name NOT IN (:...terminal)', {
        terminal: [IssueStatus.CLOSED, IssueStatus.RESOLVED],
      })
      .andWhere('issue.slaResolutionDueAt IS NOT NULL')
      .andWhere('issue.slaResolutionDueAt < :now', { now: new Date() })
      .andWhere('issue.slaBreachedAt IS NULL')
      .orderBy('issue.slaResolutionDueAt', 'ASC')
      .take(cap)
      .getMany();

    let newlyBreached = 0;
    for (const row of rows) {
      const hit = await this.maybeFlagSlaBreach(row);
      if (hit) {
        newlyBreached += 1;
      }
    }
    return { scanned: rows.length, newlyBreached };
  }

  async suggestTechniciansForIssue(issueId: number, viewer: JwtUser) {
    if (
      viewer.role !== Role.ADMIN &&
      viewer.role !== Role.SUPERVISOR &&
      viewer.role !== Role.INTAKE_OFFICER &&
      viewer.role !== Role.DEPARTMENT_OFFICER
    ) {
      throw new ForbiddenException(
        'Only intake officers, supervisors, administrators, or department officers can view suggested dispatch order',
      );
    }
    const issue = await this.assertIssueAccessible(issueId, viewer);
    const lat =
      issue.location?.latitude !== undefined && issue.location?.latitude !== null
        ? Number(issue.location.latitude)
        : null;
    const lng =
      issue.location?.longitude !== undefined && issue.location?.longitude !== null
        ? Number(issue.location.longitude)
        : null;
    const coordsOk =
      lat != null &&
      lng != null &&
      Number.isFinite(lat) &&
      Number.isFinite(lng);

    const snap = issue.premiseSnapshot as Record<string, unknown> | null;
    const premiseDistrict =
      typeof snap?.district === 'string'
        ? snap.district.trim().toUpperCase()
        : '';
    const preferredZombaName =
      premiseDistrict === 'ZOMBA' ? 'Peter Mbewe' : null;
    const routedDept = (issue.assignedDepartment ?? '').trim();

    const techs = await this.userService.findActiveTechniciansWithHomeBase();

    type Row = {
      id: number;
      name: string;
      email: string;
      distanceKm: number | null;
      workloadActive: number;
      rankHint: string;
      preferredMatch: boolean;
      sameDept: boolean;
    };

    const rows: Row[] = await Promise.all(
      techs.map(async (t) => {
        let distanceKm: number | null = null;
        if (
          coordsOk &&
          t.homeBaseLatitude != null &&
          t.homeBaseLongitude != null
        ) {
          distanceKm = haversineDistanceKm(
            lat!,
            lng!,
            t.homeBaseLatitude,
            t.homeBaseLongitude,
          );
        }
        const workloadActive =
          await this.assignmentService.countActiveWorkloadForTechnician(t.id);
        const sameDept =
          t.department != null && t.department.trim() === routedDept;
        const preferredMatch =
          preferredZombaName != null &&
          t.name.trim().toLowerCase() === preferredZombaName.toLowerCase();

        let rankHint: string;
        if (distanceKm != null) {
          rankHint = `${distanceKm.toFixed(1)} km · ${workloadActive} active job(s)`;
        } else if (preferredMatch) {
          rankHint = `Zomba roster match · ${workloadActive} active job(s)`;
        } else if (sameDept) {
          rankHint = `Same unit as ticket · ${workloadActive} active job(s)`;
        } else {
          rankHint = `${workloadActive} active job(s) — add home base lat/lng for distance`;
        }

        return {
          id: t.id,
          name: t.name,
          email: t.email,
          distanceKm,
          workloadActive,
          rankHint,
          preferredMatch,
          sameDept,
        };
      }),
    );

    rows.sort((a, b) => {
      const aHas = a.distanceKm != null;
      const bHas = b.distanceKm != null;
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      if (aHas && bHas) {
        const da = a.distanceKm as number;
        const db = b.distanceKm as number;
        if (Math.abs(da - db) > 1e-9) return da - db;
        if (a.workloadActive !== b.workloadActive) {
          return a.workloadActive - b.workloadActive;
        }
        return a.name.localeCompare(b.name);
      }
      if (a.preferredMatch !== b.preferredMatch) return a.preferredMatch ? -1 : 1;
      if (a.sameDept !== b.sameDept) return a.sameDept ? -1 : 1;
      if (a.workloadActive !== b.workloadActive) {
        return a.workloadActive - b.workloadActive;
      }
      return a.name.localeCompare(b.name);
    });

    const ranked = rows.map(({ preferredMatch: _pm, sameDept: _sd, ...pub }) => pub);

    return {
      issueId,
      issueLocationAvailable: coordsOk,
      rankingsExplainer:
        'Ordered by nearest home base when coordinates exist on both ticket and technician; otherwise by Zomba demo roster match → same department as this ticket → fewest active field jobs.',
      ranked,
    };
  }

  async getBillingResolutionContext(issueId: number, actor: User) {
    if (actor.role !== Role.TECHNICIAN) {
      throw new ForbiddenException(
        'Only assigned billing staff can load billing resolution context',
      );
    }
    const issue = await this.issueRepository.findOne({
      where: { id: issueId },
      relations: ['currentStatus'],
    });
    if (!issue) {
      throw new NotFoundException('Issue not found');
    }
    await this.assertTechnicianAssignedRead(issueId, actor.id);
    if (
      issue.issueCategory !== 'billing_account' &&
      issue.issueCategory !== 'digital_payment'
    ) {
      throw new BadRequestException(
        'Billing resolution context applies only to billing and digital payment issues',
      );
    }
    const premise = this.resolvePremiseForBilling(issue);
    return buildBillingResolutionContext(issue, premise);
  }

  private resolvePremiseForBilling(issue: Issue): PremiseLookupResult | null {
    const acct = issue.accountNumber?.trim();
    if (acct) {
      const hit = this.meterLookupService.lookupByAccountNumber(acct);
      if (hit?.found) {
        return hit;
      }
    }
    const snap = issue.premiseSnapshot as Record<string, unknown> | null;
    if (!snap || snap['found'] === false) {
      return null;
    }
    const balance = snap['accountBalanceMwk'];
    const pending = snap['pendingPaymentMwk'];
    return {
      found: true,
      meterNumber: String(snap['meterNumber'] ?? ''),
      customerName:
        typeof snap['customerName'] === 'string' ? snap['customerName'] : undefined,
      accountNumber: String(snap['accountNumber'] ?? acct ?? ''),
      accountStatus:
        typeof snap['accountStatus'] === 'string'
          ? snap['accountStatus']
          : undefined,
      connectionStatus:
        typeof snap['connectionStatus'] === 'string'
          ? snap['connectionStatus']
          : undefined,
      accountBalanceMwk:
        typeof balance === 'number'
          ? balance
          : typeof balance === 'string'
            ? Number(balance)
            : undefined,
      pendingPaymentMwk:
        typeof pending === 'number'
          ? pending
          : typeof pending === 'string'
            ? Number(pending)
            : undefined,
    };
  }

  async updateFieldProgress(
    issueId: number,
    fieldProgress: string,
    actor: User,
  ): Promise<IssueWithResolution> {
    if (actor.role !== Role.TECHNICIAN) {
      throw new ForbiddenException('Only technicians can update field progress');
    }
    const issue = await this.issueRepository.findOne({
      where: { id: issueId },
      relations: ['currentStatus', 'location', 'createdBy'],
    });
    if (!issue) {
      throw new NotFoundException('Issue not found');
    }
    await this.assertTechnicianAssignedRead(issueId, actor.id);
    const st = issue.currentStatus.name;
    if (st !== IssueStatus.ASSIGNED && st !== IssueStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Work progress updates apply only while the issue is assigned or in progress',
      );
    }
    if (!isValidWorkProgressForCategory(issue.issueCategory, fieldProgress)) {
      throw new BadRequestException(
        `Invalid work progress "${fieldProgress}" for category "${issue.issueCategory}"`,
      );
    }
    const attrs: Record<string, string | number> = {
      ...(issue.issueAttributes ?? {}),
    };
    attrs.field_progress = fieldProgress;
    issue.issueAttributes = attrs;
    await this.issueRepository.save(issue);

    await this.auditRepository.save(
      this.auditRepository.create({
        user: actor,
        actionPerformed: 'update_field_progress',
        entityName: 'Issue',
        entityId: issue.id,
        timestamp: new Date(),
      }),
    );

    const withRes = await this.attachResolution(issue);
    const playbook = getDepartmentPlaybook(issue.issueCategory);
    return Object.assign(withRes, {
      departmentPlaybook: playbook ?? undefined,
    });
  }

  private async applySlaDueDates(
    issueId: number,
    category: string,
    subcategory: string | null,
    urgencyLevel: string,
    reportedAt: Date,
  ): Promise<void> {
    const p = this.slaRulesService.resolve(category, subcategory, urgencyLevel);
    const slaFirstResponseDueAt = this.slaRulesService.addHours(
      reportedAt,
      p.firstResponseHours,
    );
    const slaResolutionDueAt = this.slaRulesService.addHours(
      reportedAt,
      p.resolutionHours,
    );
    await this.issueRepository.update(issueId, {
      slaFirstResponseDueAt,
      slaResolutionDueAt,
    });
  }

  private async maybeFlagSlaBreach(issue: Issue): Promise<boolean> {
    const st = issue.currentStatus?.name;
    if (!st || st === IssueStatus.CLOSED || st === IssueStatus.RESOLVED) {
      return false;
    }
    if (!issue.slaResolutionDueAt || issue.slaBreachedAt) {
      return false;
    }
    if (new Date().getTime() <= new Date(issue.slaResolutionDueAt).getTime()) {
      return false;
    }
    const res = await this.issueRepository.update(
      { id: issue.id, slaBreachedAt: IsNull() },
      {
        slaBreachedAt: new Date(),
        slaEscalationLevel: Math.max(issue.slaEscalationLevel ?? 0, 1),
      },
    );
    if (res.affected && res.affected > 0) {
      void this.notificationService.notifyIssueEvent({
        type: 'sla_resolution_breach',
        issueId: issue.id,
        summary: `SLA breach: issue #${issue.id} passed its target resolution deadline while still active.`,
        reporterEmail: null,
        reporterPhone: null,
      });
      return true;
    }
    return false;
  }

  private async assertTechnicianAssignedRead(
    issueId: number,
    technicianId: number,
  ): Promise<void> {
    const latest = await this.assignmentRepository.findOne({
      where: { issue: { id: issueId } },
      relations: ['assignedTo'],
      order: { assignmentDate: 'DESC' },
    });
    if (!latest || latest.assignedTo.id !== technicianId) {
      throw new ForbiddenException(
        'You are not the assigned technician for this issue',
      );
    }
  }

  private async assertTechnicianAssigned(
    manager: EntityManager,
    issueId: number,
    technicianId: number,
  ): Promise<void> {
    const latest = await manager.findOne(Assignment, {
      where: { issue: { id: issueId } },
      relations: ['assignedTo'],
      order: { assignmentDate: 'DESC' },
    });
    if (!latest || latest.assignedTo.id !== technicianId) {
      throw new ForbiddenException(
        'You are not the assigned technician for this issue',
      );
    }
  }

  private async attachResolution(issue: Issue): Promise<IssueWithResolution> {
    const resolution = await this.resolutionRepository.findOne({
      where: { issue: { id: issue.id } },
      relations: ['resolvedBy'],
    });
    return Object.assign(issue, { resolution: resolution ?? null });
  }

  private async mergeResolutionWithManager(
    manager: EntityManager,
    issue: Issue,
  ): Promise<IssueWithResolution> {
    const resolution = await manager.findOne(Resolution, {
      where: { issue: { id: issue.id } },
      relations: ['resolvedBy'],
    });
    return Object.assign(issue, { resolution: resolution ?? null });
  }

  /**
   * After registration, scan open tickets (same phone OR nearby map) and stamp hints
   * on the new issue so intake is guided by the system, not only manual recall.
   */
  private async stampDepartmentCoSuggestions(
    issueId: number,
    category: string,
    subcategory: string | null,
  ): Promise<void> {
    const issue = await this.issueRepository.findOne({
      where: { id: issueId },
    });
    if (!issue) {
      return;
    }
    const base = resolveDepartmentFromCategory(category);
    const co = suggestCoDepartments(category, subcategory);
    const filtered = co.filter((d) => d !== base);
    const attrs: Record<string, string | number> = {
      ...(issue.issueAttributes ?? {}),
    };
    if (filtered.length === 0) {
      delete attrs.intake_co_department_suggestions;
      delete attrs.intake_co_department_primary;
      delete attrs.intake_co_department_stamped_at;
      issue.issueAttributes = attrs;
      await this.issueRepository.save(issue);
      return;
    }
    attrs.intake_co_department_suggestions = filtered.join(',');
    attrs.intake_co_department_primary = base;
    attrs.intake_co_department_stamped_at = new Date().toISOString();
    issue.issueAttributes = attrs;
    await this.issueRepository.save(issue);
  }

  private async stampIntakeDuplicateIntelligence(issueId: number): Promise<{
    count: number;
    skippedReason?: string;
  }> {
    const issue = await this.issueRepository.findOne({
      where: { id: issueId },
      relations: ['location'],
    });
    if (!issue?.location || !issue.reporterPhone?.trim()) {
      return {
        count: 0,
        skippedReason: 'reporter_phone_and_map_location_required',
      };
    }
    try {
      const hints = await this.findPossibleDuplicateHints({
        reporterPhone: issue.reporterPhone,
        latitude: Number(issue.location.latitude),
        longitude: Number(issue.location.longitude),
        days: 30,
        minScore: 6,
        anchorReportedAt: issue.dateReported,
        anchorCategory: issue.issueCategory,
        excludeIssueId: issueId,
      });
      const others = hints.slice(0, 12);
      const attrs: Record<string, string | number> = {
        ...(issue.issueAttributes ?? {}),
      };
      if (others.length === 0) {
        delete attrs.intake_duplicate_candidate_count;
        delete attrs.intake_duplicate_candidate_ids;
        delete attrs.intake_duplicate_candidates_as_of;
        issue.issueAttributes = attrs;
        await this.issueRepository.save(issue);
        return { count: 0 };
      }
      attrs.intake_duplicate_candidate_count = others.length;
      attrs.intake_duplicate_candidate_ids = others
        .map((h) => String(h.id))
        .join(',');
      attrs.intake_duplicate_candidates_as_of = new Date().toISOString();
      issue.issueAttributes = attrs;
      await this.issueRepository.save(issue);
      return { count: others.length };
    } catch {
      // Never block registration on hint failure.
      return { count: 0, skippedReason: 'duplicate_scan_failed' };
    }
  }

  /**
   * Stamp or refresh intake_co_department_* using current suggestCoDepartments rules.
   * onlyMissingStamp: only issues without intake_co_department_stamped_at (default backfill).
   * When false, recomputes every scanned row (clears attributes if new rules yield no co-deps).
   */
  async backfillIntakeCoDepartmentSuggestions(options: {
    dryRun: boolean;
    onlyMissingStamp: boolean;
    limit: number;
  }): Promise<{
    examined: number;
    updated: number;
    cleared: number;
    skipped: number;
  }> {
    const cap = Math.min(Math.max(options.limit, 1), 5000);
    let examined = 0;
    let updated = 0;
    let cleared = 0;
    let skipped = 0;
    let lastId = 0;

    while (examined < cap) {
      const take = Math.min(200, cap - examined);
      const batch = await this.issueRepository.find({
        where: { id: MoreThan(lastId) },
        order: { id: 'ASC' },
        take,
      });
      if (batch.length === 0) {
        break;
      }
      lastId = batch[batch.length - 1].id;

      for (const issue of batch) {
        if (examined >= cap) {
          break;
        }
        examined += 1;

        const attrs = { ...(issue.issueAttributes ?? {}) };
        const hasStamp = Boolean(attrs.intake_co_department_stamped_at);

        if (options.onlyMissingStamp && hasStamp) {
          skipped += 1;
          continue;
        }

        const base = resolveDepartmentFromCategory(issue.issueCategory);
        const co = suggestCoDepartments(
          issue.issueCategory,
          issue.issueSubcategory,
        );
        const filtered = co.filter((d) => d !== base);

        if (filtered.length === 0) {
          const hadCoData =
            hasStamp ||
            attrs.intake_co_department_suggestions != null ||
            attrs.intake_co_department_primary != null;
          if (hadCoData) {
            if (!options.dryRun) {
              delete attrs.intake_co_department_suggestions;
              delete attrs.intake_co_department_primary;
              delete attrs.intake_co_department_stamped_at;
              issue.issueAttributes =
                Object.keys(attrs).length > 0 ? attrs : null;
              await this.issueRepository.save(issue);
            }
            cleared += 1;
          } else {
            skipped += 1;
          }
          continue;
        }

        if (!options.dryRun) {
          attrs.intake_co_department_suggestions = filtered.join(',');
          attrs.intake_co_department_primary = base;
          attrs.intake_co_department_stamped_at = new Date().toISOString();
          issue.issueAttributes = attrs;
          await this.issueRepository.save(issue);
        }
        updated += 1;
      }

      if (examined >= cap) {
        break;
      }
      if (batch.length < take) {
        break;
      }
    }

    return { examined, updated, cleared, skipped };
  }

  private buildPremiseSummaryForPublic(
    premiseSnapshot: Record<string, unknown> | null,
  ): PublicTrackResult['issue']['premiseSummary'] {
    if (!premiseSnapshot || typeof premiseSnapshot !== 'object') {
      return null;
    }
    const found = premiseSnapshot['found'] === true;
    const str = (v: unknown) =>
      typeof v === 'string' && v.trim() ? v.trim() : undefined;
    const num = (v: unknown) =>
      typeof v === 'number' && Number.isFinite(v) ? v : undefined;
    return {
      found,
      meterNumber: str(premiseSnapshot['meterNumber']),
      customerName: str(premiseSnapshot['customerName']),
      accountNumber: str(premiseSnapshot['accountNumber']),
      physicalAddress: str(premiseSnapshot['physicalAddress']),
      serviceArea: str(premiseSnapshot['serviceArea']),
      supplyZone: str(premiseSnapshot['supplyZone']),
      meterType: str(premiseSnapshot['meterType']),
      accountStatus: str(premiseSnapshot['accountStatus']),
      openIssuesOnPremise: num(premiseSnapshot['openIssuesOnPremise']),
    };
  }

  private parseIssueRef(input: string): number {
    const raw = input.trim();
    const key = /^ISS-(\d+)$/i.exec(raw);
    const n = key ? Number(key[1]) : Number(raw);
    if (!Number.isFinite(n) || n < 1) {
      throw new BadRequestException('Invalid issue reference');
    }
    return n;
  }
}
