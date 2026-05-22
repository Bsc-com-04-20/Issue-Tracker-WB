"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const dotenv_1 = require("dotenv");
const user_entity_1 = require("../user/user.entity");
const issue_entity_1 = require("../issue/issue.entity");
const location_entity_1 = require("../location/location.entity");
const status_entity_1 = require("../status/status.entity");
const assignment_entity_1 = require("../assignment/assignment.entity");
const audit_log_entity_1 = require("../audit/audit-log.entity");
const issue_status_history_entity_1 = require("../issue/issue-status-history.entity");
const resolution_entity_1 = require("../issue/resolution.entity");
const refresh_token_entity_1 = require("../auth/refresh-token.entity");
const issue_attachment_entity_1 = require("../issue/issue-attachment.entity");
const _1730128000000_production_hardening_1 = require("../migrations/1730128000000-production-hardening");
(0, dotenv_1.config)();
exports.default = new typeorm_1.DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME || 'issue_tracking_system',
    entities: [
        user_entity_1.User,
        issue_entity_1.Issue,
        location_entity_1.Location,
        status_entity_1.Status,
        assignment_entity_1.Assignment,
        audit_log_entity_1.AuditLog,
        issue_status_history_entity_1.IssueStatusHistory,
        resolution_entity_1.Resolution,
        refresh_token_entity_1.RefreshToken,
        issue_attachment_entity_1.IssueAttachment,
    ],
    migrations: [_1730128000000_production_hardening_1.ProductionHardening1730128000000],
    synchronize: false,
    logging: process.env.LOG_TYPEORM === 'true',
});
//# sourceMappingURL=data-source.js.map