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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResolutionReportDateRangeQueryDto = exports.ReportDateRangeQueryDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class ReportDateRangeQueryDto {
    from;
    to;
}
exports.ReportDateRangeQueryDto = ReportDateRangeQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: '2026-03-01T00:00:00.000Z',
        description: 'Include issues with dateReported >= from (ISO 8601)',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ReportDateRangeQueryDto.prototype, "from", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: '2026-03-31T23:59:59.999Z',
        description: 'Include issues with dateReported <= to (ISO 8601)',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ReportDateRangeQueryDto.prototype, "to", void 0);
class ResolutionReportDateRangeQueryDto {
    from;
    to;
}
exports.ResolutionReportDateRangeQueryDto = ResolutionReportDateRangeQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: '2026-03-01T00:00:00.000Z',
        description: 'Filter resolutions with dateResolved >= from',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ResolutionReportDateRangeQueryDto.prototype, "from", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: '2026-03-31T23:59:59.999Z',
        description: 'Filter resolutions with dateResolved <= to',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ResolutionReportDateRangeQueryDto.prototype, "to", void 0);
//# sourceMappingURL=report-date-range.query.dto.js.map