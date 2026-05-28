import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Assignment } from './assignment.entity';
import { AssignIssueDto } from './dto/assign-issue.dto';
import { Issue } from '../issue/issue.entity';
import { User } from '../user/user.entity';
import { Role } from '../common/enums/role.enum';
import { staffAssignedDepartmentListScope } from '../auth/role-access';
import { IssueStatus } from '../common/enums/issue-status.enum';
import { StatusService } from '../status/status.service';
import { IssueStatusHistory } from '../issue/issue-status-history.entity';
import { AuditLog } from '../audit/audit-log.entity';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class AssignmentService {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly statusService: StatusService,
    private readonly dataSource: DataSource,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
  ) {}

  async assign(
    dto: AssignIssueDto,
    assignedByUserId: number,
  ): Promise<Assignment> {
    const assignedStatus = await this.statusService.findByName(
      IssueStatus.ASSIGNED,
    );
    if (!assignedStatus) {
      throw new NotFoundException('Assigned status is missing from database');
    }

    const assignedBy = await this.userRepository.findOne({
      where: { id: assignedByUserId },
    });
    if (!assignedBy) {
      throw new NotFoundException('Assigning user not found');
    }

    const assignee = await this.userRepository.findOne({
      where: { id: dto.assignedToUserId },
    });
    if (!assignee) {
      throw new NotFoundException('Assignee user not found');
    }
    if (assignee.role !== Role.TECHNICIAN) {
      throw new BadRequestException(
        'Issues can only be assigned to users with role technician',
      );
    }

    const maxCap = Number(
      this.configService.get<string>(
        'MAX_ACTIVE_ASSIGNMENTS_PER_TECHNICIAN',
        '12',
      ),
    );
    if (Number.isFinite(maxCap) && maxCap > 0) {
      const active = await this.countActiveWorkloadForTechnician(assignee.id);
      if (active >= maxCap) {
        throw new BadRequestException(
          `This technician already has ${active} active field assignments (limit ${maxCap}). Choose another technician or reassign work to balance load.`,
        );
      }
    }

    let assignmentKind = 'assigned';

    const savedAssignment = await this.dataSource.transaction(
      async (manager) => {
        const issue = await manager.findOne(Issue, {
          where: { id: dto.issueId },
          relations: ['currentStatus'],
          lock: { mode: 'pessimistic_write' },
        });

        if (!issue) {
          throw new NotFoundException('Issue not found');
        }

        if (assignedBy.role === Role.DEPARTMENT_OFFICER) {
          const scope = staffAssignedDepartmentListScope(
            assignedBy.role,
            assignedBy.department,
          );
          if (
            !scope ||
            !scope.includes((issue.assignedDepartment ?? '').trim())
          ) {
            throw new ForbiddenException(
              'Department officers may only assign issues routed to their unit',
            );
          }
        }

        const statusName = issue.currentStatus.name;

        if (statusName === IssueStatus.REPORTED) {
          assignmentKind = 'assigned';
          issue.currentStatus = assignedStatus;
          await manager.save(Issue, issue);

          const assignment = manager.create(Assignment, {
            issue,
            assignedTo: assignee,
            assignedBy,
            assignmentDate: new Date(),
            priorityLevel: dto.priorityLevel,
          });
          const saved = await manager.save(Assignment, assignment);

          await manager.save(
            IssueStatusHistory,
            manager.create(IssueStatusHistory, {
              issue,
              status: assignedStatus,
              changedBy: assignedBy,
              changedAt: new Date(),
            }),
          );

          await manager.save(
            AuditLog,
            manager.create(AuditLog, {
              user: assignedBy,
              actionPerformed: 'assign_issue',
              entityName: 'Assignment',
              entityId: saved.id,
              timestamp: new Date(),
            }),
          );

          return saved;
        }

        if (statusName === IssueStatus.ASSIGNED) {
          assignmentKind = 'reassigned';
          const latest = await manager.findOne(Assignment, {
            where: { issue: { id: dto.issueId } },
            relations: ['assignedTo'],
            order: { assignmentDate: 'DESC' },
          });
          if (!latest) {
            throw new BadRequestException(
              'Issue is assigned but has no assignment record',
            );
          }
          if (latest.assignedTo.id === assignee.id) {
            throw new BadRequestException(
              'Issue is already assigned to this technician',
            );
          }

          const assignment = manager.create(Assignment, {
            issue,
            assignedTo: assignee,
            assignedBy,
            assignmentDate: new Date(),
            priorityLevel: dto.priorityLevel,
          });
          const saved = await manager.save(Assignment, assignment);

          await manager.save(
            AuditLog,
            manager.create(AuditLog, {
              user: assignedBy,
              actionPerformed: 'reassign_issue',
              entityName: 'Assignment',
              entityId: saved.id,
              timestamp: new Date(),
            }),
          );

          return saved;
        }

        throw new BadRequestException(
          `Issue can only be assigned from "${IssueStatus.REPORTED}" or reassigned while "${IssueStatus.ASSIGNED}" (current: "${statusName}")`,
        );
      },
    );

    const meta = await this.issueRepository.findOne({
      where: { id: dto.issueId },
      select: ['id', 'reporterEmail', 'reporterPhone'],
    });
    void this.notificationService.notifyIssueEvent({
      type: assignmentKind,
      issueId: dto.issueId,
      summary:
        assignmentKind === 'reassigned'
          ? `Issue #${dto.issueId} was reassigned.`
          : `Issue #${dto.issueId} has been assigned for field follow-up.`,
      reporterEmail: meta?.reporterEmail ?? null,
      reporterPhone: meta?.reporterPhone ?? null,
    });

    return savedAssignment;
  }

  findForTechnician(technicianId: number): Promise<Assignment[]> {
    return this.assignmentRepository.find({
      where: { assignedTo: { id: technicianId } },
      order: { assignmentDate: 'DESC' },
    });
  }

  /**
   * Issues currently in assigned or in_progress where this technician holds the latest assignment row.
   */
  async countActiveWorkloadForTechnician(technicianId: number): Promise<number> {
    return this.issueRepository
      .createQueryBuilder('issue')
      .innerJoin('issue.currentStatus', 'st')
      .innerJoin(
        'assignments',
        'a',
        'a.issueId = issue.id AND a.id = (SELECT MAX(ax.id) FROM assignments ax WHERE ax.issueId = issue.id)',
      )
      .where('a.assignedToId = :tid', { tid: technicianId })
      .andWhere('st.name IN (:...sns)', {
        sns: [IssueStatus.ASSIGNED, IssueStatus.IN_PROGRESS],
      })
      .getCount();
  }
}
