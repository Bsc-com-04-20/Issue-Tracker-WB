"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IssueModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const issue_controller_1 = require("./issue.controller");
const issue_service_1 = require("./issue.service");
const issue_entity_1 = require("./issue.entity");
const location_entity_1 = require("../location/location.entity");
const issue_status_history_entity_1 = require("./issue-status-history.entity");
const audit_log_entity_1 = require("../audit/audit-log.entity");
const resolution_entity_1 = require("./resolution.entity");
const assignment_entity_1 = require("../assignment/assignment.entity");
const issue_attachment_entity_1 = require("./issue-attachment.entity");
const status_module_1 = require("../status/status.module");
const user_module_1 = require("../user/user.module");
let IssueModule = class IssueModule {
};
exports.IssueModule = IssueModule;
exports.IssueModule = IssueModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                issue_entity_1.Issue,
                location_entity_1.Location,
                issue_status_history_entity_1.IssueStatusHistory,
                audit_log_entity_1.AuditLog,
                assignment_entity_1.Assignment,
                resolution_entity_1.Resolution,
                issue_attachment_entity_1.IssueAttachment,
            ]),
            status_module_1.StatusModule,
            user_module_1.UserModule,
        ],
        controllers: [issue_controller_1.IssueController],
        providers: [issue_service_1.IssueService],
    })
], IssueModule);
//# sourceMappingURL=issue.module.js.map