import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './user.entity';
export type SafeUser = Omit<User, 'passwordHash'>;
export declare class UserService {
    private readonly userRepository;
    constructor(userRepository: Repository<User>);
    create(createUserDto: CreateUserDto): Promise<SafeUser>;
    findByEmailForLogin(email: string): Promise<User | null>;
    findById(id: number): Promise<User | null>;
    findAll(skip: number, take: number): Promise<{
        items: SafeUser[];
        total: number;
    }>;
    findActiveTechnicians(): Promise<Pick<SafeUser, 'id' | 'name' | 'email'>[]>;
    findOneSafe(id: number): Promise<SafeUser>;
    update(id: number, dto: UpdateUserDto): Promise<SafeUser>;
    updatePassword(id: number, newPassword: string): Promise<SafeUser>;
    bootstrapAdmin(): Promise<SafeUser>;
    applyFailedLoginAttempt(userId: number, maxAttempts: number, lockoutMinutes: number): Promise<void>;
    resetLoginSecurity(userId: number): Promise<void>;
    private toSafeUser;
}
