import { Role } from '../../common/enums/role.enum';
export declare class UpdateUserDto {
    name?: string;
    email?: string;
    phone?: string;
    role?: Role;
    department?: string | null;
    isActive?: boolean;
}
