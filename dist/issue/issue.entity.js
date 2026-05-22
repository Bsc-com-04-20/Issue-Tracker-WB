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
exports.Issue = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../user/user.entity");
const location_entity_1 = require("../location/location.entity");
const status_entity_1 = require("../status/status.entity");
let Issue = class Issue {
    id;
    description;
    severityLevel;
    reportChannel;
    dateReported;
    reporterName;
    reporterPhone;
    reporterAffiliation;
    reporterEmail;
    createdBy;
    location;
    currentStatus;
};
exports.Issue = Issue;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Issue.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", String)
], Issue.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20 }),
    __metadata("design:type", String)
], Issue.prototype, "severityLevel", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50 }),
    __metadata("design:type", String)
], Issue.prototype, "reportChannel", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime' }),
    __metadata("design:type", Date)
], Issue.prototype, "dateReported", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 120 }),
    __metadata("design:type", String)
], Issue.prototype, "reporterName", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20 }),
    __metadata("design:type", String)
], Issue.prototype, "reporterPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 120, nullable: true }),
    __metadata("design:type", Object)
], Issue.prototype, "reporterAffiliation", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 190, nullable: true, name: 'reporter_email' }),
    __metadata("design:type", Object)
], Issue.prototype, "reporterEmail", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { eager: true }),
    __metadata("design:type", user_entity_1.User)
], Issue.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => location_entity_1.Location, { eager: true, cascade: ['insert'] }),
    __metadata("design:type", location_entity_1.Location)
], Issue.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => status_entity_1.Status, { eager: true }),
    __metadata("design:type", status_entity_1.Status)
], Issue.prototype, "currentStatus", void 0);
exports.Issue = Issue = __decorate([
    (0, typeorm_1.Entity)('issues')
], Issue);
//# sourceMappingURL=issue.entity.js.map