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
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcrypt"));
const user_entity_1 = require("./user.entity");
const role_enum_1 = require("../common/enums/role.enum");
let UserService = class UserService {
    userRepository;
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    async create(createUserDto) {
        const existing = await this.userRepository.findOne({
            where: { email: createUserDto.email.toLowerCase() },
        });
        if (existing) {
            throw new common_1.ConflictException('Email already exists');
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
    findByEmailForLogin(email) {
        return this.userRepository
            .createQueryBuilder('user')
            .addSelect('user.passwordHash')
            .where('user.email = :email', { email: email.toLowerCase() })
            .getOne();
    }
    findById(id) {
        return this.userRepository.findOne({ where: { id } });
    }
    findAll(skip, take) {
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
    async findActiveTechnicians() {
        const rows = await this.userRepository.find({
            where: { role: role_enum_1.Role.TECHNICIAN, isActive: true },
            order: { name: 'ASC' },
            select: ['id', 'name', 'email'],
        });
        return rows.map((u) => ({ id: u.id, name: u.name, email: u.email }));
    }
    async findOneSafe(id) {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return this.toSafeUser(user);
    }
    async update(id, dto) {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (dto.email !== undefined) {
            const nextEmail = dto.email.toLowerCase();
            if (nextEmail !== user.email) {
                const taken = await this.userRepository.findOne({
                    where: { email: nextEmail },
                });
                if (taken) {
                    throw new common_1.ConflictException('Email already exists');
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
        const saved = await this.userRepository.save(user);
        return this.toSafeUser(saved);
    }
    async updatePassword(id, newPassword) {
        const user = await this.userRepository
            .createQueryBuilder('user')
            .addSelect('user.passwordHash')
            .where('user.id = :id', { id })
            .getOne();
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        user.passwordHash = await bcrypt.hash(newPassword, 10);
        const saved = await this.userRepository.save(user);
        return this.toSafeUser(saved);
    }
    async bootstrapAdmin() {
        const totalUsers = await this.userRepository.count();
        if (totalUsers > 0) {
            const admin = await this.userRepository.findOne({
                where: { role: role_enum_1.Role.ADMIN },
            });
            if (admin) {
                return this.toSafeUser(admin);
            }
        }
        const admin = this.userRepository.create({
            name: 'System Admin',
            email: 'admin@local.dev',
            phone: '0000000000',
            role: role_enum_1.Role.ADMIN,
            department: 'IT',
            isActive: true,
            failedLoginAttempts: 0,
            lockoutUntil: null,
            passwordHash: await bcrypt.hash('admin123', 10),
        });
        const saved = await this.userRepository.save(admin);
        return this.toSafeUser(saved);
    }
    async applyFailedLoginAttempt(userId, maxAttempts, lockoutMinutes) {
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
    async resetLoginSecurity(userId) {
        await this.userRepository.update({ id: userId }, { failedLoginAttempts: 0, lockoutUntil: null });
    }
    toSafeUser(user) {
        const { passwordHash: _p, ...rest } = user;
        return rest;
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], UserService);
//# sourceMappingURL=user.service.js.map