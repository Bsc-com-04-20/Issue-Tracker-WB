"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidTechnicianStatusTransition = isValidTechnicianStatusTransition;
exports.canCloseIssueFromStatus = canCloseIssueFromStatus;
const issue_status_enum_1 = require("../common/enums/issue-status.enum");
function isValidTechnicianStatusTransition(from, to) {
    return ((from === issue_status_enum_1.IssueStatus.ASSIGNED && to === issue_status_enum_1.IssueStatus.IN_PROGRESS) ||
        (from === issue_status_enum_1.IssueStatus.IN_PROGRESS && to === issue_status_enum_1.IssueStatus.RESOLVED));
}
function canCloseIssueFromStatus(current) {
    return current === issue_status_enum_1.IssueStatus.RESOLVED;
}
//# sourceMappingURL=issue-status.rules.js.map