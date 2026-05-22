import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserPasswordDto } from './dto/update-user-password.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    bootstrapAdmin(): Promise<import("./user.service").SafeUser>;
    health(): {
        ok: boolean;
    };
    listTechnicians(): Promise<Pick<import("./user.service").SafeUser, "name" | "email" | "id">[]>;
    findAll(query: PaginationQueryDto): Promise<{
        items: import("./user.service").SafeUser[];
        total: number;
    }>;
    findOne(id: number): Promise<import("./user.service").SafeUser>;
    update(id: number, dto: UpdateUserDto): Promise<import("./user.service").SafeUser>;
    updatePassword(id: number, dto: UpdateUserPasswordDto): Promise<import("./user.service").SafeUser>;
    create(createUserDto: CreateUserDto): Promise<import("./user.service").SafeUser>;
}
