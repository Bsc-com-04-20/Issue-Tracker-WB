import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { Issue } from '../issue/issue.entity';
import { Role } from '../common/enums/role.enum';
import { JwtUser } from '../common/interfaces/jwt-user.interface';
import { staffAssignedDepartmentListScope } from '../auth/role-access';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  findAll(
    skip: number,
    take: number,
    viewer?: JwtUser,
  ): Promise<{ items: AuditLog[]; total: number; skip: number; take: number }> {
    if (viewer?.role === Role.DEPARTMENT_OFFICER) {
      const scope = staffAssignedDepartmentListScope(
        viewer.role,
        viewer.department,
      );
      const departments = scope?.length ? scope : ['billing_department'];
      return this.auditRepository
        .createQueryBuilder('a')
        .innerJoin(Issue, 'issue', 'issue.id = a.entityId')
        .where('a.entityName = :ename', { ename: 'Issue' })
        .andWhere('issue.assignedDepartment IN (:...departments)', {
          departments,
        })
        .orderBy('a.timestamp', 'DESC')
        .skip(skip)
        .take(take)
        .getManyAndCount()
        .then(([items, total]) => ({ items, total, skip, take }));
    }

    return this.auditRepository
      .findAndCount({
        order: { timestamp: 'DESC' },
        skip,
        take,
      })
      .then(([items, total]) => ({ items, total, skip, take }));
  }
}
