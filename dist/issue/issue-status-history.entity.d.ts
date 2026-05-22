import { Issue } from './issue.entity';
import { Status } from '../status/status.entity';
import { User } from '../user/user.entity';
export declare class IssueStatusHistory {
    id: number;
    issue: Issue;
    status: Status;
    changedBy: User;
    changedAt: Date;
}
