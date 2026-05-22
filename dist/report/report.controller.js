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
exports.ReportController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const report_service_1 = require("./report.service");
const report_date_range_query_dto_1 = require("./dto/report-date-range.query.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const role_enum_1 = require("../common/enums/role.enum");
const swagger_constants_1 = require("../common/swagger.constants");
let ReportController = class ReportController {
    reportService;
    constructor(reportService) {
        this.reportService = reportService;
    }
    getSummary(query) {
        return this.reportService.getSummary(query);
    }
    getResolutionStats(query) {
        return this.reportService.getResolutionStats(query);
    }
    getIssuesByMonth(query) {
        return this.reportService.getIssuesByMonth(query);
    }
};
exports.ReportController = ReportController;
__decorate([
    (0, common_1.Get)('summary'),
    (0, swagger_1.ApiOperation)({
        summary: 'Issue volume breakdown by status, severity, channel, and service area',
    }),
    __param(0, (0, common_1.Query)(new common_1.ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
    }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [report_date_range_query_dto_1.ReportDateRangeQueryDto]),
    __metadata("design:returntype", void 0)
], ReportController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)('resolution-stats'),
    (0, swagger_1.ApiOperation)({
        summary: 'Resolved issue count and average hours from report date to resolution (MySQL)',
    }),
    __param(0, (0, common_1.Query)(new common_1.ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
    }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [report_date_range_query_dto_1.ResolutionReportDateRangeQueryDto]),
    __metadata("design:returntype", void 0)
], ReportController.prototype, "getResolutionStats", null);
__decorate([
    (0, common_1.Get)('issues-by-month'),
    (0, swagger_1.ApiOperation)({
        summary: 'Monthly issue counts for trend charts (by dateReported)',
    }),
    __param(0, (0, common_1.Query)(new common_1.ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
    }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [report_date_range_query_dto_1.ReportDateRangeQueryDto]),
    __metadata("design:returntype", void 0)
], ReportController.prototype, "getIssuesByMonth", null);
exports.ReportController = ReportController = __decorate([
    (0, swagger_1.ApiTags)('reports'),
    (0, common_1.Controller)('report'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.SUPERVISOR),
    (0, swagger_1.ApiBearerAuth)(swagger_constants_1.SWAGGER_JWT_AUTH),
    __metadata("design:paramtypes", [report_service_1.ReportService])
], ReportController);
//# sourceMappingURL=report.controller.js.map