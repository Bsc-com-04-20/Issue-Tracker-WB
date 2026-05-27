import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IssueController } from './issue.controller';
import { IssueService } from './issue.service';
import { Issue } from './issue.entity';
import { Location } from '../location/location.entity';
import { IssueStatusHistory } from './issue-status-history.entity';
import { AuditLog } from '../audit/audit-log.entity';
import { Resolution } from './resolution.entity';
import { Assignment } from '../assignment/assignment.entity';
import { IssueAttachment } from './issue-attachment.entity';
import { StatusModule } from '../status/status.module';
import { UserModule } from '../user/user.module';
import { MeterLookupModule } from '../meter/meter-lookup.module';
import { IssueAdminController } from './issue-admin.controller';
import { SlaRulesService } from '../sla/sla-rules.service';
import { AssignmentModule } from '../assignment/assignment.module';
import { PublicIntakeAssignmentService } from './public-intake-assignment.service';
import { User } from '../user/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Issue,
      Location,
      IssueStatusHistory,
      AuditLog,
      Assignment,
      Resolution,
      IssueAttachment,
      User,
    ]),
    StatusModule,
    UserModule,
    MeterLookupModule,
    AssignmentModule,
  ],
  controllers: [IssueController, IssueAdminController],
  providers: [IssueService, SlaRulesService, PublicIntakeAssignmentService],
})
export class IssueModule {}
