import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenBodyDto } from './dto/refresh-token.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        user: {
            id: number;
            name: string;
            email: string;
            role: import("../common/enums/role.enum").Role;
        };
    }>;
    refresh(body: RefreshTokenBodyDto): Promise<{
        accessToken: string;
        expiresIn: number;
    }>;
    logout(body: RefreshTokenBodyDto): Promise<{
        ok: true;
    }>;
}
