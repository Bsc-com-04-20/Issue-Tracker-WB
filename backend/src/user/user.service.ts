import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './user.entity';
import { Role } from '../common/enums/role.enum';

export type SafeUser = Omit<User, 'passwordHash'>;

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<SafeUser> {
    const existing = await this.userRepository.findOne({
      where: { email: createUserDto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const user = this.userRepository.create({
      ...createUserDto,
      email: createUserDto.email.toLowerCase(),
      passwordHash: await bcrypt.hash(createUserDto.password, 10),
      department: createUserDto.department ?? null,
      isActive: true,
      failedLoginAttempts: 0,
      lockoutUntil: null,
    });

    const saved = await this.userRepository.save(user);
    return this.toSafeUser(saved);
  }

  /** Loads password hash for login; caller must enforce isActive after password check. */
  findByEmailForLogin(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: email.toLowerCase() })
      .getOne();
  }

  findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  findAll(skip: number, take: number): Promise<{ items: SafeUser[]; total: number }> {
    return this.userRepository
      .findAndCount({
        order: { id: 'ASC' },
        skip,
        take,
      })
      .then(([items, total]) => ({
        items: items.map((u) => this.toSafeUser(u)),
        total,
      }));
  }

  /** For assignment UI (admin / supervisor). */
  async findActiveTechnicians(): Promise<
    Pick<SafeUser, 'id' | 'name' | 'email'>[]
  > {
    const rows = await this.userRepository.find({
      where: { role: Role.TECHNICIAN, isActive: true },
      order: { name: 'ASC' },
      select: ['id', 'name', 'email'],
    });
    return rows.map((u) => ({ id: u.id, name: u.name, email: u.email }));
  }

  /** Technicians with optional home base for GIS-style proximity sorting. */
  async findActiveTechniciansWithHomeBase(): Promise<
    Array<{
      id: number;
      name: string;
      email: string;
      department: string | null;
      homeBaseLatitude: number | null;
      homeBaseLongitude: number | null;
    }>
  > {
    const rows = await this.userRepository.find({
      where: { role: Role.TECHNICIAN, isActive: true },
      order: { name: 'ASC' },
      select: [
        'id',
        'name',
        'email',
        'department',
        'homeBaseLatitude',
        'homeBaseLongitude',
      ],
    });
    return rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      department: u.department?.trim() ?? null,
      homeBaseLatitude:
        u.homeBaseLatitude != null ? Number(u.homeBaseLatitude) : null,
      homeBaseLongitude:
        u.homeBaseLongitude != null ? Number(u.homeBaseLongitude) : null,
    }));
  }

  /** Distinct emails for active supervisor accounts (escalation routing). */
  async findActiveSupervisorEmails(): Promise<string[]> {
    const rows = await this.userRepository.find({
      where: { role: Role.SUPERVISOR, isActive: true },
      select: ['email'],
    });
    const seen = new Set<string>();
    const out: string[] = [];
    for (const r of rows) {
      const raw = r.email?.trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(raw);
    }
    return out;
  }

  async findOneSafe(id: number): Promise<SafeUser> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toSafeUser(user);
  }

  async update(id: number, dto: UpdateUserDto): Promise<SafeUser> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.email !== undefined) {
      const nextEmail = dto.email.toLowerCase();
      if (nextEmail !== user.email) {
        const taken = await this.userRepository.findOne({
          where: { email: nextEmail },
        });
        if (taken) {
          throw new ConflictException('Email already exists');
        }
        user.email = nextEmail;
      }
    }
    if (dto.name !== undefined) {
      user.name = dto.name;
    }
    if (dto.phone !== undefined) {
      user.phone = dto.phone;
    }
    if (dto.role !== undefined) {
      user.role = dto.role;
    }
    if (dto.department !== undefined) {
      user.department = dto.department;
    }
    if (dto.isActive !== undefined) {
      user.isActive = dto.isActive;
    }
    if (dto.homeBaseLatitude !== undefined) {
      user.homeBaseLatitude =
        dto.homeBaseLatitude === null ? null : Number(dto.homeBaseLatitude);
    }
    if (dto.homeBaseLongitude !== undefined) {
      user.homeBaseLongitude =
        dto.homeBaseLongitude === null ? null : Number(dto.homeBaseLongitude);
    }

    const saved = await this.userRepository.save(user);
    return this.toSafeUser(saved);
  }

  async updatePassword(id: number, newPassword: string): Promise<SafeUser> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id })
      .getOne();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    const saved = await this.userRepository.save(user);
    return this.toSafeUser(saved);
  }

  async bootstrapAdmin(): Promise<SafeUser> {
    const totalUsers = await this.userRepository.count();
    if (totalUsers > 0) {
      const admin = await this.userRepository.findOne({
        where: { role: Role.ADMIN },
      });
      if (admin) {
        return this.toSafeUser(admin);
      }
    }

    const admin = this.userRepository.create({
      name: 'System Admin',
      email: 'admin@local.dev',
      phone: '0000000000',
      role: Role.ADMIN,
      department: 'IT',
      isActive: true,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      passwordHash: await bcrypt.hash('admin123', 10),
    });
    const saved = await this.userRepository.save(admin);
    return this.toSafeUser(saved);
  }

  async applyFailedLoginAttempt(
    userId: number,
    maxAttempts: number,
    lockoutMinutes: number,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return;
    }
    user.failedLoginAttempts = (user.failedLoginAttempts ?? 0) + 1;
    if (user.failedLoginAttempts >= maxAttempts) {
      const until = new Date();
      until.setMinutes(until.getMinutes() + lockoutMinutes);
      user.lockoutUntil = until;
    }
    await this.userRepository.save(user);
  }

  async resetLoginSecurity(userId: number): Promise<void> {
    await this.userRepository.update(
      { id: userId },
      { failedLoginAttempts: 0, lockoutUntil: null },
    );
  }

  private toSafeUser(user: User): SafeUser {
    const { passwordHash: _p, ...rest } = user;
    return rest;
  }
}
