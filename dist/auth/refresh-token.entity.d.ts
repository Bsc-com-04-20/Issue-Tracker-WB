import { User } from '../user/user.entity';
export declare class RefreshToken {
    id: number;
    user: User;
    tokenHash: string;
    expiresAt: Date;
    revokedAt: Date | null;
}
