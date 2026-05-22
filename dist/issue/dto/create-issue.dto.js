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
exports.CreateIssueDto = exports.LocationInputDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class LocationInputDto {
    latitude;
    longitude;
    addressDescription;
    serviceArea;
}
exports.LocationInputDto = LocationInputDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: -13.9626 }),
    (0, class_validator_1.IsLatitude)(),
    __metadata("design:type", Number)
], LocationInputDto.prototype, "latitude", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 33.7741 }),
    (0, class_validator_1.IsLongitude)(),
    __metadata("design:type", Number)
], LocationInputDto.prototype, "longitude", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Area 25, near main road' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LocationInputDto.prototype, "addressDescription", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Lilongwe North' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LocationInputDto.prototype, "serviceArea", void 0);
class CreateIssueDto {
    description;
    severityLevel;
    reportChannel;
    dateReported;
    reporterName;
    reporterPhone;
    reporterAffiliation;
    reporterEmail;
    location;
}
exports.CreateIssueDto = CreateIssueDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Pipe burst at junction' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateIssueDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'high' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateIssueDto.prototype, "severityLevel", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'phone' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateIssueDto.prototype, "reportChannel", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-03-28T10:00:00.000Z' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateIssueDto.prototype, "dateReported", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'John Banda' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateIssueDto.prototype, "reporterName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '+265991111111' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateIssueDto.prototype, "reporterPhone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Community committee' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateIssueDto.prototype, "reporterAffiliation", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'reporter@example.com',
        description: 'Optional — used for email notifications on status updates',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateIssueDto.prototype, "reporterEmail", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: LocationInputDto }),
    (0, class_validator_1.IsDefined)({ message: 'location is required (coordinates and address)' }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => LocationInputDto),
    __metadata("design:type", LocationInputDto)
], CreateIssueDto.prototype, "location", void 0);
//# sourceMappingURL=create-issue.dto.js.map