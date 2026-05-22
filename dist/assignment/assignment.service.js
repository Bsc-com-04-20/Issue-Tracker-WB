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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignmentService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const assignment_entity_1 = require("./assignment.entity");
const issue_entity_1 = require("../issue/issue.entity");
const user_entity_1 = require("../user/user.entity");
const role_enum_1 = require("../common/enums/role.enum");
const issue_status_enum_1 = require("../common/enums/issue-status.enum");
const status_service_1 = require("../status/status.service");
const issue_status_history_entity_1 = require("../issue/issue-status-history.entity");
const audit_log_entity_1 = require("../audit/audit-log.entity");
const notification_service_1 = require("../notification/notification.service");
let AssignmentService = class AssignmentService {
    assignmentRepository;
    issueRepository;
    userRepository;
    statusService;
    dataSource;
    notificationService;
    constructor(assignmentRepository, issueRepository, userRepository, statusService, dataSource, notificationService) {
        this.assignmentRepository = assignmentRepository;
        this.issueRepository = issueRepository;
        this.userRepository = userRepository;
        this.statusService = statusService;
        this.dataSource = dataSource;
        this.notificationService = notificationService;
    }
    async assign(dto, assignedByUserId) {
        const assignedStatus = await this.statusService.findByName(issue_status_enum_1.IssueStatus.ASSIGNED);
        if (!assignedStatus) {
            throw new common_1.NotFoundException('Assigned status is missing from database');
        }
        const assignedBy = await this.userRepository.findOne({
            where: { id: assignedByUserId },
        });
        if (!assignedBy) {
            throw new common_1.NotFoundException('Assigning user not found');
        }
        const assignee = await this.userRepository.findOne({
            where: { id: dto.assignedToUserId },
        });
        if (!assignee) {
            throw new common_1.NotFoundException('Assignee user not found');
        }
        if (assignee.role !== role_enum_1.Role.TECHNICIAN) {
            throw new common_1.BadRequestException('Issues can only be assigned to users with role technician');
        }
        let assignmentKind = 'assigned';
        const savedAssignment = await this.dataSource.transaction(async (manager) => {
            const issue = await manager.findOne(issue_entity_1.Issue, {
                where: { id: dto.issueId },
                relations: ['currentStatus'],
                lock: { mode: 'pessimistic_write' },
            });
            if (!issue) {
                throw new common_1.NotFoundException('Issue not found');
            }
            const statusName = issue.currentStatus.name;
            if (statusName === issue_status_enum_1.IssueStatus.REPORTED) {
                assignmentKind = 'assigned';
                issue.currentStatus = assignedStatus;
                await manager.save(issue_entity_1.Issue, issue);
                const assignment = manager.create(assignment_entity_1.Assignment, {
                    issue,
                    assignedTo: assignee,
                    assignedBy,
                    assignmentDate: new Date(),
                    priorityLevel: dto.priorityLevel,
                });
                const saved = await manager.save(assignment_entity_1.Assignment, assignment);
                await manager.save(issue_status_history_entity_1.IssueStatusHistory, manager.create(issue_status_history_entity_1.IssueStatusHistory, {
                    issue,
                    status: assignedStatus,
                    changedBy: assignedBy,
                    changedAt: new Date(),
                }));
                await manager.save(audit_log_entity_1.AuditLog, manager.create(audit_log_entity_1.AuditLog, {
                    user: assignedBy,
                    actionPerformed: 'assign_issue',
                    entityName: 'Assignment',
                    entityId: saved.id,
                    timestamp: new Date(),
                }));
                return saved;
            }
            if (statusName === issue_status_enum_1.IssueStatus.ASSIGNED) {
                assignmentKind = 'reassigned';
                const latest = await manager.findOne(assignment_entity_1.Assignment, {
                    where: { issue: { id: dto.issueId } },
                    relations: ['assignedTo'],
                    order: { assignmentDate: 'DESC' },
                });
                if (!latest) {
                    throw new common_1.BadRequestException('Issue is assigned but has no assignment record');
                }
                if (latest.assignedTo.id === assignee.id) {
                    throw new common_1.BadRequestException('Issue is already assigned to this technician');
                }
                const assignment = manager.create(assignment_entity_1.Assignment, {
                    issue,
                    assignedTo: assignee,
                    assignedBy,
                    assignmentDate: new Date(),
                    priorityLevel: dto.priorityLevel,
                });
                const saved = await manager.save(assignment_entity_1.Assignment, assignment);
                await manager.save(audit_log_entity_1.AuditLog, manager.create(audit_log_entity_1.AuditLog, {
                    user: assignedBy,
                    actionPerformed: 'reassign_issue',
                    entityName: 'Assignment',
                    entityId: saved.id,
                    timestamp: new Date(),
                }));
                return saved;
            }
            throw new common_1.BadRequestException(`Issue can only be assigned from "${issue_status_enum_1.IssueStatus.REPORTED}" or reassigned while "${issue_status_enum_1.IssueStatus.ASSIGNED}" (current: "${statusName}")`);
        });
        const meta = await this.issueRepository.findOne({
            where: { id: dto.issueId },
            select: ['id', 'reporterEmail'],
        });
        void this.notificationService.notifyIssueEvent({
            type: assignmentKind,
            issueId: dto.issueId,
            summary: assignmentKind === 'reassigned'
                ? `Issue #${dto.issueId} was reassigned.`
                : `Issue #${dto.issueId} has been assigned for field follow-up.`,
            reporterEmail: meta?.reporterEmail ?? null,
        });
        return savedAssignment;
    }
    findForTechnician(technicianId) {
        return this.assignmentRepository.find({
            where: { assignedTo: { id: technicianId } },
            order: { assignmentDate: 'DESC' },
        });
    }
};
exports.AssignmentService = AssignmentService;
exports.AssignmentService = AssignmentService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(assignment_entity_1.Assignment)),
    __param(1, (0, typeorm_1.InjectRepository)(issue_entity_1.Issue)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        status_service_1.StatusService,
        typeorm_2.DataSource,
        notification_service_1.NotificationService])
], AssignmentService);
//# sourceMappingURL=assignment.service.js.map