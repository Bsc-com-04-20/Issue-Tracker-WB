import { User } from '../user/user.entity';
export declare class AuditLog {
    id: number;
    user: User;
    actionPerformed: string;
    entityName: string;
    entityId: number;
    timestamp: Date;
}
