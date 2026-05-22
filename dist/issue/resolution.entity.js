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
exports.Resolution = void 0;
const typeorm_1 = require("typeorm");
const issue_entity_1 = require("./issue.entity");
const user_entity_1 = require("../user/user.entity");
let Resolution = class Resolution {
    id;
    issue;
    resolutionDetails;
    dateResolved;
    resolvedBy;
};
exports.Resolution = Resolution;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Resolution.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => issue_entity_1.Issue, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'issueId' }),
    __metadata("design:type", issue_entity_1.Issue)
], Resolution.prototype, "issue", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", String)
], Resolution.prototype, "resolutionDetails", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime' }),
    __metadata("design:type", Date)
], Resolution.prototype, "dateResolved", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { eager: true }),
    __metadata("design:type", user_entity_1.User)
], Resolution.prototype, "resolvedBy", void 0);
exports.Resolution = Resolution = __decorate([
    (0, typeorm_1.Entity)('resolutions')
], Resolution);
//# sourceMappingURL=resolution.entity.js.map