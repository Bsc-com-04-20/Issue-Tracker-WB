import { StreamableFile } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { Issue } from './issue.entity';
import { IssueAttachment } from './issue-attachment.entity';
import { Location } from '../location/location.entity';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueStatusDto } from './dto/update-issue-status.dto';
import { User } from '../user/user.entity';
import { StatusService } from '../status/status.service';
import { IssueStatusHistory } from './issue-status-history.entity';
import { AuditLog } from '../audit/audit-log.entity';
import { Assignment } from '../assignment/assignment.entity';
import { Resolution } from './resolution.entity';
import { JwtUser } from '../common/interfaces/jwt-user.interface';
import { NotificationService } from '../notification/notification.service';
export type IssueWithResolution = Issue & {
    resolution?: Resolution | null;
};
export declare class IssueService {
    private readonly issueRepository;
    private readonly locationRepository;
    private readonly historyRepository;
    private readonly auditRepository;
    private readonly assignmentRepository;
    private readonly resolutionRepository;
    private readonly attachmentRepository;
    private readonly statusService;
    private readonly dataSource;
    private readonly configService;
    private readonly notificationService;
    constructor(issueRepository: Repository<Issue>, locationRepository: Repository<Location>, historyRepository: Repository<IssueStatusHistory>, auditRepository: Repository<AuditLog>, assignmentRepository: Repository<Assignment>, resolutionRepository: Repository<Resolution>, attachmentRepository: Repository<IssueAttachment>, statusService: StatusService, dataSource: DataSource, configService: ConfigService, notificationService: NotificationService);
    create(createIssueDto: CreateIssueDto, createdBy: User): Promise<Issue>;
    findAllForStaffPaginated(skip: number, take: number, statusName?: string): Promise<{
        items: Issue[];
        total: number;
        skip: number;
        take: number;
    }>;
    findPossibleDuplicateHints(params: {
        reporterPhone?: string;
        latitude?: number;
        longitude?: number;
        days: number;
    }): Promise<Issue[]>;
    assertIssueAccessible(issueId: number, viewer: JwtUser): Promise<Issue>;
    findOneForViewer(issueId: number, viewer: JwtUser): Promise<IssueWithResolution>;
    listAttachments(issueId: number, viewer: JwtUser): Promise<{
        id: number;
        originalName: string;
        mimeType: string;
        sizeBytes: number;
        uploadedAt: Date;
        downloadPath: string;
    }[]>;
    addAttachment(issueId: number, file: Express.Multer.File, uploadedBy: User, viewer: JwtUser): Promise<{
        id: number;
        originalName: string;
        mimeType: string;
        sizeBytes: number;
        downloadPath: string;
    }>;
    streamAttachment(attachmentId: number, viewer: JwtUser): Promise<StreamableFile>;
    updateStatus(issueId: number, dto: UpdateIssueStatusDto, actor: User): Promise<IssueWithResolution>;
    closeIssue(issueId: number, actor: User): Promise<IssueWithResolution>;
    private assertTechnicianAssignedRead;
    private assertTechnicianAssigned;
    private attachResolution;
    private mergeResolutionWithManager;
}
