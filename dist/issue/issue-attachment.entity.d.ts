import { Issue } from './issue.entity';
import { User } from '../user/user.entity';
export declare class IssueAttachment {
    id: number;
    issue: Issue;
    storedPath: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedAt: Date;
    uploadedBy: User;
}
