import { Request } from 'express';
import { IssueService } from './issue.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueStatusDto } from './dto/update-issue-status.dto';
import { DuplicateHintsQueryDto } from './dto/duplicate-hints.query.dto';
import { ListIssuesQueryDto } from './dto/list-issues.query.dto';
import { JwtUser } from '../common/interfaces/jwt-user.interface';
import { UserService } from '../user/user.service';
export declare class IssueController {
    private readonly issueService;
    private readonly userService;
    constructor(issueService: IssueService, userService: UserService);
    findAll(query: ListIssuesQueryDto): Promise<{
        items: import("./issue.entity").Issue[];
        total: number;
        skip: number;
        take: number;
    }>;
    possibleDuplicates(query: DuplicateHintsQueryDto): Promise<import("./issue.entity").Issue[]>;
    downloadAttachment(attachmentId: number, request: Request & {
        user: JwtUser;
    }): Promise<import("@nestjs/common").StreamableFile>;
    listAttachments(id: number, request: Request & {
        user: JwtUser;
    }): Promise<{
        id: number;
        originalName: string;
        mimeType: string;
        sizeBytes: number;
        uploadedAt: Date;
        downloadPath: string;
    }[]>;
    uploadAttachment(id: number, file: Express.Multer.File | undefined, request: Request & {
        user: JwtUser;
    }): Promise<{
        id: number;
        originalName: string;
        mimeType: string;
        sizeBytes: number;
        downloadPath: string;
    }>;
    findOne(id: number, request: Request & {
        user: JwtUser;
    }): Promise<import("./issue.service").IssueWithResolution>;
    updateStatus(id: number, dto: UpdateIssueStatusDto, request: Request & {
        user: JwtUser;
    }): Promise<import("./issue.service").IssueWithResolution>;
    close(id: number, request: Request & {
        user: JwtUser;
    }): Promise<import("./issue.service").IssueWithResolution>;
    create(createIssueDto: CreateIssueDto, request: Request & {
        user: JwtUser;
    }): Promise<import("./issue.entity").Issue>;
}
