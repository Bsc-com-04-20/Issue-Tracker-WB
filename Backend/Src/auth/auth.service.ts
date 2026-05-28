import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { LoginDto } from './dto/login.dto';
import { RefreshToken } from './refresh-token.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  private hashRefreshToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  async login(loginDto: LoginDto) {
    const maxFailed = this.configService.get<number>(
      'LOGIN_MAX_FAILED_ATTEMPTS',
      5,
    );
    const lockoutMin = this.configService.get<number>(
      'LOGIN_LOCKOUT_MINUTES',
      15,
    );

    const user = await this.userService.findByEmailForLogin(loginDto.email);

    if (user?.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
      throw new HttpException(
        'Account temporarily locked due to failed sign-in attempts. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      await this.userService.applyFailedLoginAttempt(
        user.id,
        maxFailed,
        lockoutMin,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    await this.userService.resetLoginSecurity(user.id);

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      department: user.department ?? null,
    });

    const rawRefresh = randomBytes(48).toString('base64url');
    const tokenHash = this.hashRefreshToken(rawRefresh);
    const refreshDays = this.configService.get<number>(
      'JWT_REFRESH_EXPIRES_IN_DAYS',
      7,
    );
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshDays);

    await this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({
        user,
        tokenHash,
        expiresAt,
        revokedAt: null,
      }),
    );

    return {
      accessToken,
      refreshToken: rawRefresh,
      expiresIn: this.configService.get<number>(
        'JWT_ACCESS_EXPIRES_IN_SECONDS',
        86400,
      ),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department ?? null,
      },
    };
  }

  async refresh(refreshTokenRaw: string) {
    const tokenHash = this.hashRefreshToken(refreshTokenRaw);
    const row = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
      relations: ['user'],
    });
    if (
      !row ||
      row.revokedAt ||
      new Date(row.expiresAt) <= new Date() ||
      !row.user.isActive
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: row.user.id,
      email: row.user.email,
      role: row.user.role,
      department: row.user.department ?? null,
    });

    return {
      accessToken,
      expiresIn: this.configService.get<number>(
        'JWT_ACCESS_EXPIRES_IN_SECONDS',
        86400,
      ),
    };
  }

  async logout(refreshTokenRaw: string): Promise<{ ok: true }> {
    const tokenHash = this.hashRefreshToken(refreshTokenRaw);
    await this.refreshTokenRepository
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: new Date() })
      .where('tokenHash = :h', { h: tokenHash })
      .andWhere('revokedAt IS NULL')
      .execute();
    return { ok: true };
  }
}
