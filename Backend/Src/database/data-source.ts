import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import { User } from '../user/user.entity';
import { Issue } from '../issue/issue.entity';
import { Location } from '../location/location.entity';
import { Status } from '../status/status.entity';
import { Assignment } from '../assignment/assignment.entity';
import { AuditLog } from '../audit/audit-log.entity';
import { IssueStatusHistory } from '../issue/issue-status-history.entity';
import { Resolution } from '../issue/resolution.entity';
import { RefreshToken } from '../auth/refresh-token.entity';
import { IssueAttachment } from '../issue/issue-attachment.entity';
import { ProductionHardening1730128000000 } from '../migrations/1730128000000-production-hardening';
import { WaterBoardWorkflow1732200000000 } from '../migrations/1732200000000-water-board-workflow';
import { ExpandWaterBoardRoles1732300000000 } from '../migrations/1732300000000-expand-water-board-roles';
import { AddDepartmentSpecialistRoles1740000000000 } from '../migrations/1740000000000-add-department-specialist-roles';
import { StreamlineWaterBoardRoles1741000000000 } from '../migrations/1741000000000-streamline-water-board-roles';
import { EnsureStreamlinedUserRoles1741000000001 } from '../migrations/1741000000001-ensure-streamlined-user-roles';
import { OperationalIntelligenceFields1742000000000 } from '../migrations/1742000000000-operational-intelligence-fields';
import { ExtendedOperationsSla1743000000000 } from '../migrations/1743000000000-extended-operations-sla';

config();

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME || 'issue_tracking_system',
  entities: [
    User,
    Issue,
    Location,
    Status,
    Assignment,
    AuditLog,
    IssueStatusHistory,
    Resolution,
    RefreshToken,
    IssueAttachment,
  ],
  migrations: [
    ProductionHardening1730128000000,
    WaterBoardWorkflow1732200000000,
    ExpandWaterBoardRoles1732300000000,
    AddDepartmentSpecialistRoles1740000000000,
    StreamlineWaterBoardRoles1741000000000,
    EnsureStreamlinedUserRoles1741000000001,
    OperationalIntelligenceFields1742000000000,
    ExtendedOperationsSla1743000000000,
  ],
  synchronize: false,
  logging: process.env.LOG_TYPEORM === 'true',
});
