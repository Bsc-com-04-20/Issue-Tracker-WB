import { Role } from '../../common/enums/role.enum';
export declare class CreateUserDto {
    name: string;
    email: string;
    phone: string;
    role: Role;
    department?: string;
    password: string;
}
