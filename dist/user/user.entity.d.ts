import { Role } from '../common/enums/role.enum';
export declare class User {
    id: number;
    name: string;
    email: string;
    phone: string;
    role: Role;
    department: string | null;
    isActive: boolean;
    failedLoginAttempts: number;
    lockoutUntil: Date | null;
    passwordHash: string;
}
