import { Issue } from './issue.entity';
import { User } from '../user/user.entity';
export declare class Resolution {
    id: number;
    issue: Issue;
    resolutionDetails: string;
    dateResolved: Date;
    resolvedBy: User;
}
