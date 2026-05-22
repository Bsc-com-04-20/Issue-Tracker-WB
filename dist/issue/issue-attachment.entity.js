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
exports.IssueAttachment = void 0;
const typeorm_1 = require("typeorm");
const issue_entity_1 = require("./issue.entity");
const user_entity_1 = require("../user/user.entity");
let IssueAttachment = class IssueAttachment {
    id;
    issue;
    storedPath;
    originalName;
    mimeType;
    sizeBytes;
    uploadedAt;
    uploadedBy;
};
exports.IssueAttachment = IssueAttachment;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], IssueAttachment.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => issue_entity_1.Issue, { onDelete: 'CASCADE' }),
    __metadata("design:type", issue_entity_1.Issue)
], IssueAttachment.prototype, "issue", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 500 }),
    __metadata("design:type", String)
], IssueAttachment.prototype, "storedPath", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], IssueAttachment.prototype, "originalName", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 120 }),
    __metadata("design:type", String)
], IssueAttachment.prototype, "mimeType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], IssueAttachment.prototype, "sizeBytes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime' }),
    __metadata("design:type", Date)
], IssueAttachment.prototype, "uploadedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    __metadata("design:type", user_entity_1.User)
], IssueAttachment.prototype, "uploadedBy", void 0);
exports.IssueAttachment = IssueAttachment = __decorate([
    (0, typeorm_1.Entity)('issue_attachments')
], IssueAttachment);
//# sourceMappingURL=issue-attachment.entity.js.map