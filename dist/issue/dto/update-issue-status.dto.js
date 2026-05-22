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
exports.UpdateIssueStatusDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const issue_status_enum_1 = require("../../common/enums/issue-status.enum");
class UpdateIssueStatusDto {
    status;
    resolutionDetails;
}
exports.UpdateIssueStatusDto = UpdateIssueStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: [issue_status_enum_1.IssueStatus.IN_PROGRESS, issue_status_enum_1.IssueStatus.RESOLVED] }),
    (0, class_validator_1.IsIn)([issue_status_enum_1.IssueStatus.IN_PROGRESS, issue_status_enum_1.IssueStatus.RESOLVED]),
    __metadata("design:type", String)
], UpdateIssueStatusDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Required when status is resolved',
        example: 'Replaced damaged section of pipe; pressure test OK.',
    }),
    (0, class_validator_1.ValidateIf)((o) => o.status === issue_status_enum_1.IssueStatus.RESOLVED),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateIssueStatusDto.prototype, "resolutionDetails", void 0);
//# sourceMappingURL=update-issue-status.dto.js.map