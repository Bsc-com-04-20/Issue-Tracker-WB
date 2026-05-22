import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { UserService } from '../user/user.service';
import { LoginDto } from './dto/login.dto';
import { RefreshToken } from './refresh-token.entity';
export declare class AuthService {
    private readonly userService;
    private readonly jwtService;
    private readonly configService;
    private readonly refreshTokenRepository;
    constructor(userService: UserService, jwtService: JwtService, configService: ConfigService, refreshTokenRepository: Repository<RefreshToken>);
    private hashRefreshToken;
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
    refresh(refreshTokenRaw: string): Promise<{
        accessToken: string;
        expiresIn: number;
    }>;
    logout(refreshTokenRaw: string): Promise<{
        ok: true;
    }>;
}
