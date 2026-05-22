"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const user_service_1 = require("./user.service");
const create_user_dto_1 = require("./dto/create-user.dto");
const update_user_dto_1 = require("./dto/update-user.dto");
const update_user_password_dto_1 = require("./dto/update-user-password.dto");
const pagination_query_dto_1 = require("../common/dto/pagination-query.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const role_enum_1 = require("../common/enums/role.enum");
const swagger_constants_1 = require("../common/swagger.constants");
let UserController = class UserController {
    userService;
    constructor(userService) {
        this.userService = userService;
    }
    bootstrapAdmin() {
        return this.userService.bootstrapAdmin();
    }
    health() {
        return { ok: true };
    }
    listTechnicians() {
        return this.userService.findActiveTechnicians();
    }
    findAll(query) {
        const skip = query.skip ?? 0;
        const take = query.take ?? 50;
        return this.userService.findAll(skip, take);
    }
    findOne(id) {
        return this.userService.findOneSafe(id);
    }
    update(id, dto) {
        return this.userService.update(id, dto);
    }
    updatePassword(id, dto) {
        return this.userService.updatePassword(id, dto.newPassword);
    }
    create(createUserDto) {
        return this.userService.create(createUserDto);
    }
};
exports.UserController = UserController;
__decorate([
    (0, common_1.Post)('bootstrap-admin'),
    (0, swagger_1.ApiOperation)({
        summary: 'Create default admin if database is empty (dev convenience)',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UserController.prototype, "bootstrapAdmin", null);
__decorate([
    (0, common_1.Get)('health'),
    (0, swagger_1.ApiOperation)({ summary: 'Simple health check' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UserController.prototype, "health", null);
__decorate([
    (0, common_1.Get)('technicians'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.SUPERVISOR),
    (0, swagger_1.ApiBearerAuth)(swagger_constants_1.SWAGGER_JWT_AUTH),
    (0, swagger_1.ApiOperation)({
        summary: 'List active technicians (assignment / dispatch pickers)',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UserController.prototype, "listTechnicians", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiBearerAuth)(swagger_constants_1.SWAGGER_JWT_AUTH),
    (0, swagger_1.ApiOperation)({ summary: 'List users (paginated)' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_query_dto_1.PaginationQueryDto]),
    __metadata("design:returntype", void 0)
], UserController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiBearerAuth)(swagger_constants_1.SWAGGER_JWT_AUTH),
    (0, swagger_1.ApiOperation)({ summary: 'Get user by id' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], UserController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiBearerAuth)(swagger_constants_1.SWAGGER_JWT_AUTH),
    (0, swagger_1.ApiOperation)({ summary: 'Update user profile / role / active flag' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_user_dto_1.UpdateUserDto]),
    __metadata("design:returntype", void 0)
], UserController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/password'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiBearerAuth)(swagger_constants_1.SWAGGER_JWT_AUTH),
    (0, swagger_1.ApiOperation)({ summary: 'Set user password (admin reset)' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_user_password_dto_1.UpdateUserPasswordDto]),
    __metadata("design:returntype", void 0)
], UserController.prototype, "updatePassword", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiBearerAuth)(swagger_constants_1.SWAGGER_JWT_AUTH),
    (0, swagger_1.ApiOperation)({ summary: 'Create user (admin only)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_user_dto_1.CreateUserDto]),
    __metadata("design:returntype", void 0)
], UserController.prototype, "create", null);
exports.UserController = UserController = __decorate([
    (0, swagger_1.ApiTags)('users'),
    (0, common_1.Controller)('user'),
    __metadata("design:paramtypes", [user_service_1.UserService])
], UserController);
//# sourceMappingURL=user.controller.js.map