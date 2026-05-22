"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto_1 = require("crypto");
const bcrypt = __importStar(require("bcrypt"));
const user_service_1 = require("../user/user.service");
const refresh_token_entity_1 = require("./refresh-token.entity");
let AuthService = class AuthService {
    userService;
    jwtService;
    configService;
    refreshTokenRepository;
    constructor(userService, jwtService, configService, refreshTokenRepository) {
        this.userService = userService;
        this.jwtService = jwtService;
        this.configService = configService;
        this.refreshTokenRepository = refreshTokenRepository;
    }
    hashRefreshToken(raw) {
        return (0, crypto_1.createHash)('sha256').update(raw).digest('hex');
    }
    async login(loginDto) {
        const maxFailed = this.configService.get('LOGIN_MAX_FAILED_ATTEMPTS', 5);
        const lockoutMin = this.configService.get('LOGIN_LOCKOUT_MINUTES', 15);
        const user = await this.userService.findByEmailForLogin(loginDto.email);
        if (user?.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
            throw new common_1.HttpException('Account temporarily locked due to failed sign-in attempts. Try again later.', common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
        if (!isPasswordValid) {
            await this.userService.applyFailedLoginAttempt(user.id, maxFailed, lockoutMin);
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (!user.isActive) {
            throw new common_1.UnauthorizedException('Account is disabled');
        }
        await this.userService.resetLoginSecurity(user.id);
        const accessToken = await this.jwtService.signAsync({
            sub: user.id,
            email: user.email,
            role: user.role,
        });
        const rawRefresh = (0, crypto_1.randomBytes)(48).toString('base64url');
        const tokenHash = this.hashRefreshToken(rawRefresh);
        const refreshDays = this.configService.get('JWT_REFRESH_EXPIRES_IN_DAYS', 7);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + refreshDays);
        await this.refreshTokenRepository.save(this.refreshTokenRepository.create({
            user,
            tokenHash,
            expiresAt,
            revokedAt: null,
        }));
        return {
            accessToken,
            refreshToken: rawRefresh,
            expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN_SECONDS', 86400),
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        };
    }
    async refresh(refreshTokenRaw) {
        const tokenHash = this.hashRefreshToken(refreshTokenRaw);
        const row = await this.refreshTokenRepository.findOne({
            where: { tokenHash },
            relations: ['user'],
        });
        if (!row ||
            row.revokedAt ||
            new Date(row.expiresAt) <= new Date() ||
            !row.user.isActive) {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
        const accessToken = await this.jwtService.signAsync({
            sub: row.user.id,
            email: row.user.email,
            role: row.user.role,
        });
        return {
            accessToken,
            expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN_SECONDS', 86400),
        };
    }
    async logout(refreshTokenRaw) {
        const tokenHash = this.hashRefreshToken(refreshTokenRaw);
        await this.refreshTokenRepository
            .createQueryBuilder()
            .update(refresh_token_entity_1.RefreshToken)
            .set({ revokedAt: new Date() })
            .where('tokenHash = :h', { h: tokenHash })
            .andWhere('revokedAt IS NULL')
            .execute();
        return { ok: true };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, typeorm_1.InjectRepository)(refresh_token_entity_1.RefreshToken)),
    __metadata("design:paramtypes", [user_service_1.UserService,
        jwt_1.JwtService,
        config_1.ConfigService,
        typeorm_2.Repository])
], AuthService);
//# sourceMappingURL=auth.service.js.map