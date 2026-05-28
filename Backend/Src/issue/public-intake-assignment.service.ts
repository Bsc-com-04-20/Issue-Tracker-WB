import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AssignmentService } from '../assignment/assignment.service';
import { Role } from '../common/enums/role.enum';
import { IssueStatus } from '../common/enums/issue-status.enum';
import { User } from '../user/user.entity';
import { Issue } from './issue.entity';
import { ISSUE_CLASSIFICATION } from './issue-classification';
import type { PublicAssignmentSummaryDto } from './dto/public-issue-create-result.dto';
import { haversineDistanceKm } from '../geo/haversine-km';

const ZOMBA_LAT = -15.384;
const ZOMBA_LNG = 35.3175;

@Injectable()
export class PublicIntakeAssignmentService implements OnModuleInit {
  private readonly logger = new Logger(PublicIntakeAssignmentService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly assignmentService: AssignmentService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureDemoDispatchUsers();
  }

  async tryAutoAssign(issue: Issue): Promise<PublicAssignmentSummaryDto | null> {
    if (!issue?.id) {
      return null;
    }
    const assigner = await this.findDispatchAssigner();
    if (!assigner) {
      this.logger.warn('No dispatch assigner user; skipping public auto-assignment');
      return null;
    }

    const tech = await this.pickTechnician(issue);
    if (!tech) {
      this.logger.warn('No active technician available for public auto-assignment');
      return null;
    }

    const priorityLevel = this.mapUrgencyToAssignmentPriority(issue.urgencyLevel);
    try {
      await this.assignmentService.assign(
        {
          issueId: issue.id,
          assignedToUserId: tech.id,
          priorityLevel,
        },
        assigner.id,
      );
    } catch (err) {
      this.logger.warn(
        `Auto-assign failed for issue #${issue.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }

    const dept =
      ISSUE_CLASSIFICATION[issue.issueCategory]?.label ??
      issue.assignedDepartment.replace(/_/g, ' ');

    return {
      assigned: true,
      assigneeName: tech.name,
      assigneePhone: tech.phone?.trim() || null,
      estimatedResponseHours: this.estimateResponseHours(issue.urgencyLevel),
      departmentLabel: dept,
      currentStatus: IssueStatus.ASSIGNED,
    };
  }

  private async ensureDemoDispatchUsers(): Promise<void> {
    const techCount = await this.userRepository.count({
      where: { role: Role.TECHNICIAN, isActive: true },
    });
    if (techCount > 0) {
      return;
    }

    const passwordHash = await bcrypt.hash('tech123', 10);
    const peter = this.userRepository.create({
      name: 'Peter Mbewe',
      email: 'peter.mbewe@waterboard.local',
      phone: '+265991000003',
      role: Role.TECHNICIAN,
      department: 'operations_department',
      isActive: true,
      homeBaseLatitude: ZOMBA_LAT,
      homeBaseLongitude: ZOMBA_LNG,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      passwordHash,
    });
    await this.userRepository.save(peter);
    this.logger.log('Seeded demo technician Peter Mbewe for public auto-assignment');
  }

  private async findDispatchAssigner(): Promise<User | null> {
    const supervisor = await this.userRepository.findOne({
      where: { role: Role.SUPERVISOR, isActive: true },
      order: { id: 'ASC' },
    });
    if (supervisor) {
      return supervisor;
    }
    return this.userRepository.findOne({
      where: { role: Role.ADMIN, isActive: true },
      order: { id: 'ASC' },
    });
  }

  private async pickTechnician(issue: Issue): Promise<User | null> {
    const techs = await this.userRepository.find({
      where: { role: Role.TECHNICIAN, isActive: true },
      order: { name: 'ASC' },
    });
    if (techs.length === 0) {
      return null;
    }

    const lat =
      issue.location?.latitude != null ? Number(issue.location.latitude) : null;
    const lng =
      issue.location?.longitude != null ? Number(issue.location.longitude) : null;

    const district = this.extractDistrictFromPremise(issue.premiseSnapshot);

    const preferredName =
      district?.toUpperCase() === 'ZOMBA' ? 'Peter Mbewe' : null;
    if (preferredName) {
      const named = techs.find(
        (t) => t.name.trim().toLowerCase() === preferredName.toLowerCase(),
      );
      if (named) {
        return named;
      }
    }

    const ranked = await Promise.all(
      techs.map(async (t) => {
        let distanceKm: number | null = null;
        if (
          lat != null &&
          lng != null &&
          t.homeBaseLatitude != null &&
          t.homeBaseLongitude != null
        ) {
          distanceKm = haversineDistanceKm(
            lat,
            lng,
            Number(t.homeBaseLatitude),
            Number(t.homeBaseLongitude),
          );
        }
        const workload = await this.assignmentService.countActiveWorkloadForTechnician(
          t.id,
        );
        return { tech: t, distanceKm, workload };
      }),
    );

    ranked.sort((a, b) => {
      if (a.workload !== b.workload) {
        return a.workload - b.workload;
      }
      if (a.distanceKm == null && b.distanceKm == null) {
        return a.tech.name.localeCompare(b.tech.name);
      }
      if (a.distanceKm == null) {
        return 1;
      }
      if (b.distanceKm == null) {
        return -1;
      }
      return a.distanceKm - b.distanceKm;
    });

    return ranked[0]?.tech ?? null;
  }

  private extractDistrictFromPremise(
    snapshot: Record<string, unknown> | null | undefined,
  ): string | null {
    if (!snapshot || typeof snapshot !== 'object') {
      return null;
    }
    const d = snapshot.district;
    return typeof d === 'string' ? d : null;
  }

  private mapUrgencyToAssignmentPriority(urgency: string): string {
    const u = urgency?.trim().toLowerCase();
    if (u === 'critical' || u === 'urgent') {
      return 'high';
    }
    if (u === 'high') {
      return 'medium';
    }
    return 'normal';
  }

  private estimateResponseHours(urgency: string): number {
    const u = urgency?.trim().toLowerCase();
    if (u === 'critical') {
      return 1;
    }
    if (u === 'urgent') {
      return 2;
    }
    if (u === 'high') {
      return 4;
    }
    return 8;
  }
}
