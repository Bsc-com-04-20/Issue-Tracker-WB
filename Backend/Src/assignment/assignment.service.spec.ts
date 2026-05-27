import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AssignmentService } from './assignment.service';
import { Assignment } from './assignment.entity';
import { Issue } from '../issue/issue.entity';
import { User } from '../user/user.entity';
import { StatusService } from '../status/status.service';
import { NotificationService } from '../notification/notification.service';
import { ConfigService } from '@nestjs/config';

describe('AssignmentService', () => {
  let service: AssignmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentService,
        { provide: getRepositoryToken(Assignment), useValue: { find: jest.fn() } },
        {
          provide: getRepositoryToken(Issue),
          useValue: {
            findOne: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue({
              innerJoin: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getCount: jest.fn().mockResolvedValue(0),
            }),
          },
        },
        { provide: getRepositoryToken(User), useValue: {} },
        {
          provide: StatusService,
          useValue: { findByName: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: { transaction: jest.fn() },
        },
        {
          provide: NotificationService,
          useValue: { notifyIssueEvent: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((_k: string, def?: string) => def ?? '12'),
          },
        },
      ],
    }).compile();

    service = module.get<AssignmentService>(AssignmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
