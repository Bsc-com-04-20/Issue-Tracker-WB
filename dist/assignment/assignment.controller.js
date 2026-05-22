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
exports.AssignmentController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const assignment_service_1 = require("./assignment.service");
const assign_issue_dto_1 = require("./dto/assign-issue.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const role_enum_1 = require("../common/enums/role.enum");
const swagger_constants_1 = require("../common/swagger.constants");
let AssignmentController = class AssignmentController {
    assignmentService;
    constructor(assignmentService) {
        this.assignmentService = assignmentService;
    }
    assign(dto, request) {
        return this.assignmentService.assign(dto, request.user.sub);
    }
    listMine(request) {
        return this.assignmentService.findForTechnician(request.user.sub);
    }
};
exports.AssignmentController = AssignmentController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.SUPERVISOR),
    (0, swagger_1.ApiBearerAuth)(swagger_constants_1.SWAGGER_JWT_AUTH),
    (0, swagger_1.ApiOperation)({
        summary: 'Assign from reported→assigned, or reassign while assigned (new assignment row; audit reassign_issue)',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [assign_issue_dto_1.AssignIssueDto, Object]),
    __metadata("design:returntype", void 0)
], AssignmentController.prototype, "assign", null);
__decorate([
    (0, common_1.Get)('mine'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.TECHNICIAN),
    (0, swagger_1.ApiBearerAuth)(swagger_constants_1.SWAGGER_JWT_AUTH),
    (0, swagger_1.ApiOperation)({ summary: 'List assignments for the logged-in technician' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AssignmentController.prototype, "listMine", null);
exports.AssignmentController = AssignmentController = __decorate([
    (0, swagger_1.ApiTags)('assignments'),
    (0, common_1.Controller)('assignment'),
    __metadata("design:paramtypes", [assignment_service_1.AssignmentService])
], AssignmentController);
//# sourceMappingURL=assignment.controller.js.map