import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { IssueService } from './issue.service';
import { Issue } from './issue.entity';
import { Location } from '../location/location.entity';
import { IssueStatusHistory } from './issue-status-history.entity';
import { AuditLog } from '../audit/audit-log.entity';
import { Assignment } from '../assignment/assignment.entity';
import { Resolution } from './resolution.entity';
import { IssueAttachment } from './issue-attachment.entity';
import { StatusService } from '../status/status.service';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from '../notification/notification.service';
import { MeterLookupService } from '../meter/meter-lookup.service';
import { MeterVerificationService } from '../meter/meter-verification.service';
import { SlaRulesService } from '../sla/sla-rules.service';
import { UserService } from '../user/user.service';
import { User } from '../user/user.entity';
import { AssignmentService } from '../assignment/assignment.service';
import { PublicIntakeAssignmentService } from './public-intake-assignment.service';

describe('IssueService', () => {
  let service: IssueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IssueService,
        { provide: getRepositoryToken(Issue), useValue: {} },
        { provide: getRepositoryToken(Location), useValue: {} },
        { provide: getRepositoryToken(IssueStatusHistory), useValue: {} },
        { provide: getRepositoryToken(AuditLog), useValue: {} },
        {
          provide: getRepositoryToken(Assignment),
          useValue: { manager: {} },
        },
        { provide: getRepositoryToken(Resolution), useValue: {} },
        { provide: getRepositoryToken(IssueAttachment), useValue: {} },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: StatusService, useValue: {} },
        { provide: DataSource, useValue: { transaction: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        {
          provide: NotificationService,
          useValue: { notifyIssueEvent: jest.fn() },
        },
        {
          provide: MeterLookupService,
          useValue: {
            lookup: jest.fn().mockReturnValue({ found: false, meterNumber: '' }),
            normalizeMeterNumber: jest.fn((s: string) => s.trim().toUpperCase()),
          },
        },
        {
          provide: MeterVerificationService,
          useValue: {
            assertConsumedForPublicCreate: jest.fn(),
            start: jest.fn(),
            confirm: jest.fn(),
          },
        },
        {
          provide: SlaRulesService,
          useValue: {
            resolve: jest.fn().mockReturnValue({
              firstResponseHours: 4,
              resolutionHours: 48,
            }),
            addHours: jest.fn((d: Date, h: number) => {
              const x = new Date(d.getTime());
              x.setTime(x.getTime() + h * 3600000);
              return x;
            }),
            readMergeJson: jest.fn().mockReturnValue({}),
            reloadMergeFile: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            findActiveTechniciansWithHomeBase: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: AssignmentService,
          useValue: {
            countActiveWorkloadForTechnician: jest.fn().mockResolvedValue(0),
          },
        },
        {
          provide: PublicIntakeAssignmentService,
          useValue: {
            tryAutoAssign: jest.fn(),
            onModuleInit: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<IssueService>(IssueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
