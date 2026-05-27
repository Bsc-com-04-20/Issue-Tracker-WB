import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, HttpException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { Role } from '../common/enums/role.enum';
import { RefreshToken } from './refresh-token.entity';

describe('AuthService (unit)', () => {
  let service: AuthService;
  let userService: {
    findByEmailForLogin: jest.Mock;
    resetLoginSecurity: jest.Mock;
    applyFailedLoginAttempt: jest.Mock;
  };
  let jwtService: { signAsync: jest.Mock };
  let refreshRepo: {
    save: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    userService = {
      findByEmailForLogin: jest.fn(),
      resetLoginSecurity: jest.fn(),
      applyFailedLoginAttempt: jest.fn(),
    };
    jwtService = { signAsync: jest.fn().mockResolvedValue('jwt-access') };
    refreshRepo = {
      save: jest.fn().mockResolvedValue({}),
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      createQueryBuilder: jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      })),
    };
    configService = {
      get: jest.fn((key: string, def?: unknown) => {
        const map: Record<string, unknown> = {
          LOGIN_MAX_FAILED_ATTEMPTS: 5,
          LOGIN_LOCKOUT_MINUTES: 15,
          JWT_REFRESH_EXPIRES_IN_DAYS: 7,
          JWT_ACCESS_EXPIRES_IN_SECONDS: 86400,
        };
        return map[key] ?? def;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshRepo },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('login returns tokens when credentials match', async () => {
    const hash = await bcrypt.hash('secret123', 4);
    userService.findByEmailForLogin.mockResolvedValue({
      id: 1,
      name: 'A',
      email: 'a@test.local',
      role: Role.ADMIN,
      department: null,
      isActive: true,
      passwordHash: hash,
      lockoutUntil: null,
    });

    const out = await service.login({
      email: 'a@test.local',
      password: 'secret123',
    });

    expect(out.accessToken).toBe('jwt-access');
    expect(typeof out.refreshToken).toBe('string');
    expect(out.refreshToken.length).toBeGreaterThan(20);
    expect(out.user).toMatchObject({
      id: 1,
      email: 'a@test.local',
      role: Role.ADMIN,
    });
    expect(userService.resetLoginSecurity).toHaveBeenCalledWith(1);
    expect(refreshRepo.save).toHaveBeenCalled();
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 1,
      email: 'a@test.local',
      role: Role.ADMIN,
      department: null,
    });
  });

  it('login throws when user missing', async () => {
    userService.findByEmailForLogin.mockResolvedValue(null);
    await expect(
      service.login({ email: 'x@y.z', password: 'any' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('login throws when password wrong and records failed attempt', async () => {
    const hash = await bcrypt.hash('right', 4);
    userService.findByEmailForLogin.mockResolvedValue({
      id: 1,
      email: 'a@test.local',
      isActive: true,
      passwordHash: hash,
      lockoutUntil: null,
    });
    await expect(
      service.login({ email: 'a@test.local', password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(userService.applyFailedLoginAttempt).toHaveBeenCalledWith(1, 5, 15);
  });

  it('login throws when account is disabled after password matches', async () => {
    const hash = await bcrypt.hash('ok', 4);
    userService.findByEmailForLogin.mockResolvedValue({
      id: 1,
      name: 'X',
      email: 'a@test.local',
      role: Role.INTAKE_OFFICER,
      isActive: false,
      passwordHash: hash,
      lockoutUntil: null,
    });
    await expect(
      service.login({ email: 'a@test.local', password: 'ok' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('login throws when lockout active', async () => {
    const future = new Date();
    future.setHours(future.getHours() + 1);
    userService.findByEmailForLogin.mockResolvedValue({
      id: 1,
      email: 'a@test.local',
      lockoutUntil: future,
    });
    await expect(
      service.login({ email: 'a@test.local', password: 'any' }),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('refresh returns new access token when refresh valid', async () => {
    refreshRepo.findOne.mockResolvedValue({
      tokenHash: 'x',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 3600_000),
      user: {
        id: 2,
        email: 'b@test.local',
        role: Role.TECHNICIAN,
        department: null,
        isActive: true,
      },
    });
    const out = await service.refresh('some-raw-token');
    expect(out.accessToken).toBe('jwt-access');
    expect(jwtService.signAsync).toHaveBeenLastCalledWith({
      sub: 2,
      email: 'b@test.local',
      role: Role.TECHNICIAN,
      department: null,
    });
  });
});
