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
exports.IssueController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const swagger_1 = require("@nestjs/swagger");
const issue_service_1 = require("./issue.service");
const create_issue_dto_1 = require("./dto/create-issue.dto");
const update_issue_status_dto_1 = require("./dto/update-issue-status.dto");
const duplicate_hints_query_dto_1 = require("./dto/duplicate-hints.query.dto");
const list_issues_query_dto_1 = require("./dto/list-issues.query.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const role_enum_1 = require("../common/enums/role.enum");
const user_service_1 = require("../user/user.service");
const swagger_constants_1 = require("../common/swagger.constants");
const uploadStorage = (0, multer_1.memoryStorage)();
const uploadLimitBytes = 25 * 1024 * 1024;
let IssueController = class IssueController {
    issueService;
    userService;
    constructor(issueService, userService) {
        this.issueService = issueService;
        this.userService = userService;
    }
    findAll(query) {
        const skip = query.skip ?? 0;
        const take = query.take ?? 50;
        return this.issueService.findAllForStaffPaginated(skip, take, query.status);
    }
    possibleDuplicates(query) {
        return this.issueService.findPossibleDuplicateHints({
            reporterPhone: query.reporterPhone,
            latitude: query.latitude,
            longitude: query.longitude,
            days: query.days ?? 14,
        });
    }
    downloadAttachment(attachmentId, request) {
        return this.issueService.streamAttachment(attachmentId, request.user);
    }
    listAttachments(id, request) {
        return this.issueService.listAttachments(id, request.user);
    }
    async uploadAttachment(id, file, request) {
        if (!file?.buffer) {
            throw new common_1.BadRequestException('file is required');
        }
        const actor = await this.userService.findById(request.user.sub);
        if (!actor) {
            throw new common_1.UnauthorizedException('Authenticated user not found');
        }
        return this.issueService.addAttachment(id, file, actor, request.user);
    }
    findOne(id, request) {
        return this.issueService.findOneForViewer(id, request.user);
    }
    async updateStatus(id, dto, request) {
        const actor = await this.userService.findById(request.user.sub);
        if (!actor) {
            throw new common_1.UnauthorizedException('Authenticated user not found');
        }
        return this.issueService.updateStatus(id, dto, actor);
    }
    async close(id, request) {
        const actor = await this.userService.findById(request.user.sub);
        if (!actor) {
            throw new common_1.UnauthorizedException('Authenticated user not found');
        }
        return this.issueService.closeIssue(id, actor);
    }
    async create(createIssueDto, request) {
        const currentUser = await this.userService.findById(request.user.sub);
        if (!currentUser) {
            throw new common_1.UnauthorizedException('Authenticated user not found');
        }
        return this.issueService.create(createIssueDto, currentUser);
    }
};
exports.IssueController = IssueController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.SUPERVISOR, role_enum_1.Role.OFFICER),
    (0, swagger_1.ApiBearerAuth)(swagger_constants_1.SWAGGER_JWT_AUTH),
    (0, swagger_1.ApiOperation)({
        summary: 'List issues (paginated, newest first; optional status filter)',
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_issues_query_dto_1.ListIssuesQueryDto]),
    __metadata("design:returntype", void 0)
], IssueController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('possible-duplicates'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.SUPERVISOR, role_enum_1.Role.OFFICER),
    (0, swagger_1.ApiBearerAuth)(swagger_constants_1.SWAGGER_JWT_AUTH),
    (0, swagger_1.ApiOperation)({
        summary: 'Open issues that may be duplicates (same phone and/or near coordinates, excluding closed)',
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [duplicate_hints_query_dto_1.DuplicateHintsQueryDto]),
    __metadata("design:returntype", void 0)
], IssueController.prototype, "possibleDuplicates", null);
__decorate([
    (0, common_1.Get)('file/:attachmentId/download'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(swagger_constants_1.SWAGGER_JWT_AUTH),
    (0, swagger_1.ApiOperation)({
        summary: 'Download an attachment (staff or assigned technician)',
    }),
    __param(0, (0, common_1.Param)('attachmentId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], IssueController.prototype, "downloadAttachment", null);
__decorate([
    (0, common_1.Get)(':id/attachments'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(swagger_constants_1.SWAGGER_JWT_AUTH),
    (0, swagger_1.ApiOperation)({ summary: 'List attachments for an issue' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], IssueController.prototype, "listAttachments", null);
__decorate([
    (0, common_1.Post)(':id/attachments'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(swagger_constants_1.SWAGGER_JWT_AUTH),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: { file: { type: 'string', format: 'binary' } },
        },
    }),
    (0, swagger_1.ApiOperation)({
        summary: 'Upload JPEG, PNG, WebP, or PDF (size limit from MAX_UPLOAD_MB)',
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: uploadStorage,
        limits: { fileSize: uploadLimitBytes },
    })),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", Promise)
], IssueController.prototype, "uploadAttachment", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(swagger_constants_1.SWAGGER_JWT_AUTH),
    (0, swagger_1.ApiOperation)({
        summary: 'Get issue by id (admin/supervisor/officer: any; technician: only if assigned)',
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], IssueController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.TECHNICIAN),
    (0, swagger_1.ApiBearerAuth)(swagger_constants_1.SWAGGER_JWT_AUTH),
    (0, swagger_1.ApiOperation)({
        summary: 'Update status: assigned→in_progress, or in_progress→resolved (with resolution details)',
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_issue_status_dto_1.UpdateIssueStatusDto, Object]),
    __metadata("design:returntype", Promise)
], IssueController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)(':id/close'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.SUPERVISOR),
    (0, swagger_1.ApiBearerAuth)(swagger_constants_1.SWAGGER_JWT_AUTH),
    (0, swagger_1.ApiOperation)({ summary: 'Close a resolved issue' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], IssueController.prototype, "close", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.OFFICER, role_enum_1.Role.SUPERVISOR),
    (0, swagger_1.ApiBearerAuth)(swagger_constants_1.SWAGGER_JWT_AUTH),
    (0, swagger_1.ApiOperation)({
        summary: 'Create issue on behalf of a reporter (staff only)',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_issue_dto_1.CreateIssueDto, Object]),
    __metadata("design:returntype", Promise)
], IssueController.prototype, "create", null);
exports.IssueController = IssueController = __decorate([
    (0, swagger_1.ApiTags)('issues'),
    (0, common_1.Controller)('issue'),
    __metadata("design:paramtypes", [issue_service_1.IssueService,
        user_service_1.UserService])
], IssueController);
//# sourceMappingURL=issue.controller.js.map