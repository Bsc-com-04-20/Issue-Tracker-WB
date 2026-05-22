import { Issue } from '../issue/issue.entity';
import { User } from '../user/user.entity';
export declare class Assignment {
    id: number;
    issue: Issue;
    assignedTo: User;
    assignedBy: User;
    assignmentDate: Date;
    priorityLevel: string;
}
