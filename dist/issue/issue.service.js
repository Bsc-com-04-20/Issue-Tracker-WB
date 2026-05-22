"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IssueService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const fs_1 = require("fs");
const path_1 = require("path");
const crypto_1 = require("crypto");
const issue_entity_1 = require("./issue.entity");
const issue_attachment_entity_1 = require("./issue-attachment.entity");
const location_entity_1 = require("../location/location.entity");
const status_service_1 = require("../status/status.service");
const issue_status_enum_1 = require("../common/enums/issue-status.enum");
const issue_status_history_entity_1 = require("./issue-status-history.entity");
const audit_log_entity_1 = require("../audit/audit-log.entity");
const assignment_entity_1 = require("../assignment/assignment.entity");
const resolution_entity_1 = require("./resolution.entity");
const role_enum_1 = require("../common/enums/role.enum");
const notification_service_1 = require("../notification/notification.service");
const issue_status_rules_1 = require("./issue-status.rules");
let IssueService = class IssueService {
    issueRepository;
    locationRepository;
    historyRepository;
    auditRepository;
    assignmentRepository;
    resolutionRepository;
    attachmentRepository;
    statusService;
    dataSource;
    configService;
    notificationService;
    constructor(issueRepository, locationRepository, historyRepository, auditRepository, assignmentRepository, resolutionRepository, attachmentRepository, statusService, dataSource, configService, notificationService) {
        this.issueRepository = issueRepository;
        this.locationRepository = locationRepository;
        this.historyRepository = historyRepository;
        this.auditRepository = auditRepository;
        this.assignmentRepository = assignmentRepository;
        this.resolutionRepository = resolutionRepository;
        this.attachmentRepository = attachmentRepository;
        this.statusService = statusService;
        this.dataSource = dataSource;
        this.configService = configService;
        this.notificationService = notificationService;
    }
    async create(createIssueDto, createdBy) {
        const reportedStatus = await this.statusService.findByName(issue_status_enum_1.IssueStatus.REPORTED);
        if (!reportedStatus) {
            throw new common_1.NotFoundException('Default reported status is missing');
        }
        const location = this.locationRepository.create({
            latitude: createIssueDto.location.latitude,
            longitude: createIssueDto.location.longitude,
            addressDescription: createIssueDto.location.addressDescription,
            serviceArea: createIssueDto.location.serviceArea ?? null,
        });
        const issue = this.issueRepository.create({
            description: createIssueDto.description,
            severityLevel: createIssueDto.severityLevel,
            reportChannel: createIssueDto.reportChannel,
            dateReported: new Date(createIssueDto.dateReported),
            reporterName: createIssueDto.reporterName,
            reporterPhone: createIssueDto.reporterPhone,
            reporterAffiliation: createIssueDto.reporterAffiliation ?? null,
            reporterEmail: createIssueDto.reporterEmail
                ? createIssueDto.reporterEmail.trim().toLowerCase()
                : null,
            createdBy,
            location,
            currentStatus: reportedStatus,
        });
        const savedIssue = await this.issueRepository.save(issue);
        await this.historyRepository.save(this.historyRepository.create({
            issue: savedIssue,
            status: reportedStatus,
            changedBy: createdBy,
            changedAt: new Date(),
        }));
        await this.auditRepository.save(this.auditRepository.create({
            user: createdBy,
            actionPerformed: 'create_issue',
            entityName: 'Issue',
            entityId: savedIssue.id,
            timestamp: new Date(),
        }));
        void this.notificationService.notifyIssueEvent({
            type: 'created',
            issueId: savedIssue.id,
            summary: `A new issue was logged (#${savedIssue.id}): ${savedIssue.description.slice(0, 400)}`,
            reporterEmail: savedIssue.reporterEmail,
        });
        return savedIssue;
    }
    async findAllForStaffPaginated(skip, take, statusName) {
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
        const [items, total] = await qb.getManyAndCount();
        return { items, total, skip, take };
    }
    async findPossibleDuplicateHints(params) {
        const hasPhone = Boolean(params.reporterPhone?.trim());
        const hasGeo = params.latitude !== undefined && params.longitude !== undefined;
        if (!hasPhone && !hasGeo) {
            throw new common_1.BadRequestException('Provide reporterPhone and/or both latitude and longitude');
        }
        const since = new Date();
        since.setDate(since.getDate() - params.days);
        const qb = this.issueRepository
            .createQueryBuilder('issue')
            .innerJoinAndSelect('issue.currentStatus', 'st')
            .innerJoinAndSelect('issue.location', 'loc')
            .where('st.name != :closed', { closed: issue_status_enum_1.IssueStatus.CLOSED })
            .andWhere('issue.dateReported >= :since', { since });
        if (hasPhone) {
            qb.andWhere('issue.reporterPhone = :phone', {
                phone: params.reporterPhone.trim(),
            });
        }
        if (hasGeo) {
            const box = 0.02;
            qb.andWhere('ABS(loc.latitude - :lat) < :box AND ABS(loc.longitude - :lng) < :box', {
                lat: params.latitude,
                lng: params.longitude,
                box,
            });
        }
        qb.orderBy('issue.dateReported', 'DESC').take(25);
        return qb.getMany();
    }
    async assertIssueAccessible(issueId, viewer) {
        const issue = await this.issueRepository.findOne({
            where: { id: issueId },
        });
        if (!issue) {
            throw new common_1.NotFoundException('Issue not found');
        }
        const staffRoles = [role_enum_1.Role.ADMIN, role_enum_1.Role.SUPERVISOR, role_enum_1.Role.OFFICER];
        if (staffRoles.includes(viewer.role)) {
            return issue;
        }
        if (viewer.role === role_enum_1.Role.TECHNICIAN) {
            await this.assertTechnicianAssignedRead(issueId, viewer.sub);
            return issue;
        }
        throw new common_1.ForbiddenException('You cannot view this issue');
    }
    async findOneForViewer(issueId, viewer) {
        const issue = await this.assertIssueAccessible(issueId, viewer);
        return this.attachResolution(issue);
    }
    async listAttachments(issueId, viewer) {
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
    async addAttachment(issueId, file, uploadedBy, viewer) {
        await this.assertIssueAccessible(issueId, viewer);
        const maxMb = this.configService.get('MAX_UPLOAD_MB', 5);
        if (file.size > maxMb * 1024 * 1024) {
            throw new common_1.BadRequestException(`File exceeds ${maxMb}MB limit`);
        }
        const allowed = new Set([
            'image/jpeg',
            'image/png',
            'image/webp',
            'application/pdf',
        ]);
        if (!allowed.has(file.mimetype)) {
            throw new common_1.BadRequestException('Only JPEG, PNG, WebP, and PDF uploads are allowed');
        }
        const baseDir = this.configService.get('UPLOAD_DIR', 'uploads');
        const ext = (0, path_1.extname)(file.originalname || '') || '.bin';
        const storedFile = `${(0, crypto_1.randomUUID)()}${ext}`;
        const absDir = (0, path_1.join)(process.cwd(), baseDir, 'issues', String(issueId));
        (0, fs_1.mkdirSync)(absDir, { recursive: true });
        const absPath = (0, path_1.join)(absDir, storedFile);
        (0, fs_1.writeFileSync)(absPath, file.buffer);
        const storedPath = (0, path_1.join)('issues', String(issueId), storedFile).replace(/\\/g, '/');
        const saved = await this.attachmentRepository.save(this.attachmentRepository.create({
            issue: { id: issueId },
            uploadedBy,
            storedPath,
            originalName: (file.originalname || storedFile).slice(0, 250),
            mimeType: file.mimetype,
            sizeBytes: file.size,
            uploadedAt: new Date(),
        }));
        return {
            id: saved.id,
            originalName: saved.originalName,
            mimeType: saved.mimeType,
            sizeBytes: saved.sizeBytes,
            downloadPath: `/issue/file/${saved.id}/download`,
        };
    }
    async streamAttachment(attachmentId, viewer) {
        const att = await this.attachmentRepository.findOne({
            where: { id: attachmentId },
            relations: ['issue'],
        });
        if (!att) {
            throw new common_1.NotFoundException('Attachment not found');
        }
        await this.assertIssueAccessible(att.issue.id, viewer);
        const base = this.configService.get('UPLOAD_DIR', 'uploads');
        const full = (0, path_1.join)(process.cwd(), base, att.storedPath);
        if (!(0, fs_1.existsSync)(full)) {
            throw new common_1.NotFoundException('File no longer on disk');
        }
        const stream = (0, fs_1.createReadStream)(full);
        return new common_1.StreamableFile(stream, {
            type: att.mimeType,
            disposition: `attachment; filename="${encodeURIComponent(att.originalName)}"`,
        });
    }
    async updateStatus(issueId, dto, actor) {
        if (actor.role !== role_enum_1.Role.TECHNICIAN) {
            throw new common_1.ForbiddenException('Only technicians can update issue status here');
        }
        const result = await this.dataSource.transaction(async (manager) => {
            await this.assertTechnicianAssigned(manager, issueId, actor.id);
            const issue = await manager.findOne(issue_entity_1.Issue, {
                where: { id: issueId },
                relations: ['currentStatus'],
                lock: { mode: 'pessimistic_write' },
            });
            if (!issue) {
                throw new common_1.NotFoundException('Issue not found');
            }
            const current = issue.currentStatus.name;
            const next = dto.status;
            if (next === issue_status_enum_1.IssueStatus.RESOLVED) {
                const details = dto.resolutionDetails?.trim();
                if (!details) {
                    throw new common_1.BadRequestException('resolutionDetails is required when status is resolved');
                }
            }
            if (!(0, issue_status_rules_1.isValidTechnicianStatusTransition)(current, next)) {
                throw new common_1.BadRequestException(`Invalid transition: cannot move from "${current}" to "${next}" (expected assigned→in_progress or in_progress→resolved)`);
            }
            if (next === issue_status_enum_1.IssueStatus.RESOLVED) {
                const existing = await manager.findOne(resolution_entity_1.Resolution, {
                    where: { issue: { id: issueId } },
                });
                if (existing) {
                    throw new common_1.BadRequestException('This issue is already resolved');
                }
            }
            const nextStatusEntity = await this.statusService.findByName(next);
            if (!nextStatusEntity) {
                throw new common_1.NotFoundException(`Status "${next}" is not configured`);
            }
            issue.currentStatus = nextStatusEntity;
            await manager.save(issue_entity_1.Issue, issue);
            if (next === issue_status_enum_1.IssueStatus.RESOLVED) {
                await manager.save(resolution_entity_1.Resolution, manager.create(resolution_entity_1.Resolution, {
                    issue,
                    resolutionDetails: dto.resolutionDetails.trim(),
                    dateResolved: new Date(),
                    resolvedBy: actor,
                }));
            }
            await manager.save(issue_status_history_entity_1.IssueStatusHistory, manager.create(issue_status_history_entity_1.IssueStatusHistory, {
                issue,
                status: nextStatusEntity,
                changedBy: actor,
                changedAt: new Date(),
            }));
            await manager.save(audit_log_entity_1.AuditLog, manager.create(audit_log_entity_1.AuditLog, {
                user: actor,
                actionPerformed: 'update_issue_status',
                entityName: 'Issue',
                entityId: issue.id,
                timestamp: new Date(),
            }));
            const fresh = await manager.findOne(issue_entity_1.Issue, { where: { id: issueId } });
            return this.mergeResolutionWithManager(manager, fresh);
        });
        const meta = await this.issueRepository.findOne({
            where: { id: issueId },
            select: ['id', 'reporterEmail'],
        });
        void this.notificationService.notifyIssueEvent({
            type: `status_${dto.status}`,
            issueId,
            summary: `Issue #${issueId} is now "${dto.status}".`,
            reporterEmail: meta?.reporterEmail ?? null,
        });
        return result;
    }
    async closeIssue(issueId, actor) {
        if (actor.role !== role_enum_1.Role.ADMIN && actor.role !== role_enum_1.Role.SUPERVISOR) {
            throw new common_1.ForbiddenException('Only supervisors or admins can close issues');
        }
        const closed = await this.dataSource.transaction(async (manager) => {
            const issue = await manager.findOne(issue_entity_1.Issue, {
                where: { id: issueId },
                relations: ['currentStatus'],
                lock: { mode: 'pessimistic_write' },
            });
            if (!issue) {
                throw new common_1.NotFoundException('Issue not found');
            }
            if (!(0, issue_status_rules_1.canCloseIssueFromStatus)(issue.currentStatus.name)) {
                throw new common_1.BadRequestException(`Issue must be resolved before closing (current: "${issue.currentStatus.name}")`);
            }
            const closedStatus = await this.statusService.findByName(issue_status_enum_1.IssueStatus.CLOSED);
            if (!closedStatus) {
                throw new common_1.NotFoundException('Closed status is missing');
            }
            issue.currentStatus = closedStatus;
            await manager.save(issue_entity_1.Issue, issue);
            await manager.save(issue_status_history_entity_1.IssueStatusHistory, manager.create(issue_status_history_entity_1.IssueStatusHistory, {
                issue,
                status: closedStatus,
                changedBy: actor,
                changedAt: new Date(),
            }));
            await manager.save(audit_log_entity_1.AuditLog, manager.create(audit_log_entity_1.AuditLog, {
                user: actor,
                actionPerformed: 'close_issue',
                entityName: 'Issue',
                entityId: issue.id,
                timestamp: new Date(),
            }));
            const fresh = await manager.findOne(issue_entity_1.Issue, { where: { id: issueId } });
            return this.mergeResolutionWithManager(manager, fresh);
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
        });
        return closed;
    }
    async assertTechnicianAssignedRead(issueId, technicianId) {
        const latest = await this.assignmentRepository.findOne({
            where: { issue: { id: issueId } },
            relations: ['assignedTo'],
            order: { assignmentDate: 'DESC' },
        });
        if (!latest || latest.assignedTo.id !== technicianId) {
            throw new common_1.ForbiddenException('You are not the assigned technician for this issue');
        }
    }
    async assertTechnicianAssigned(manager, issueId, technicianId) {
        const latest = await manager.findOne(assignment_entity_1.Assignment, {
            where: { issue: { id: issueId } },
            relations: ['assignedTo'],
            order: { assignmentDate: 'DESC' },
        });
        if (!latest || latest.assignedTo.id !== technicianId) {
            throw new common_1.ForbiddenException('You are not the assigned technician for this issue');
        }
    }
    async attachResolution(issue) {
        const resolution = await this.resolutionRepository.findOne({
            where: { issue: { id: issue.id } },
            relations: ['resolvedBy'],
        });
        return Object.assign(issue, { resolution: resolution ?? null });
    }
    async mergeResolutionWithManager(manager, issue) {
        const resolution = await manager.findOne(resolution_entity_1.Resolution, {
            where: { issue: { id: issue.id } },
            relations: ['resolvedBy'],
        });
        return Object.assign(issue, { resolution: resolution ?? null });
    }
};
exports.IssueService = IssueService;
exports.IssueService = IssueService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(issue_entity_1.Issue)),
    __param(1, (0, typeorm_1.InjectRepository)(location_entity_1.Location)),
    __param(2, (0, typeorm_1.InjectRepository)(issue_status_history_entity_1.IssueStatusHistory)),
    __param(3, (0, typeorm_1.InjectRepository)(audit_log_entity_1.AuditLog)),
    __param(4, (0, typeorm_1.InjectRepository)(assignment_entity_1.Assignment)),
    __param(5, (0, typeorm_1.InjectRepository)(resolution_entity_1.Resolution)),
    __param(6, (0, typeorm_1.InjectRepository)(issue_attachment_entity_1.IssueAttachment)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        status_service_1.StatusService,
        typeorm_2.DataSource,
        config_1.ConfigService,
        notification_service_1.NotificationService])
], IssueService);
//# sourceMappingURL=issue.service.js.map