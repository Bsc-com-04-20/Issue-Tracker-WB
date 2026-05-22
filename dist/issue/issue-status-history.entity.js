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
exports.IssueStatusHistory = void 0;
const typeorm_1 = require("typeorm");
const issue_entity_1 = require("./issue.entity");
const status_entity_1 = require("../status/status.entity");
const user_entity_1 = require("../user/user.entity");
let IssueStatusHistory = class IssueStatusHistory {
    id;
    issue;
    status;
    changedBy;
    changedAt;
};
exports.IssueStatusHistory = IssueStatusHistory;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], IssueStatusHistory.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => issue_entity_1.Issue, { eager: true }),
    __metadata("design:type", issue_entity_1.Issue)
], IssueStatusHistory.prototype, "issue", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => status_entity_1.Status, { eager: true }),
    __metadata("design:type", status_entity_1.Status)
], IssueStatusHistory.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { eager: true }),
    __metadata("design:type", user_entity_1.User)
], IssueStatusHistory.prototype, "changedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime' }),
    __metadata("design:type", Date)
], IssueStatusHistory.prototype, "changedAt", void 0);
exports.IssueStatusHistory = IssueStatusHistory = __decorate([
    (0, typeorm_1.Entity)('issue_status_history')
], IssueStatusHistory);
//# sourceMappingURL=issue-status-history.entity.js.map