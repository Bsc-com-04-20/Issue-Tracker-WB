import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReportService } from './report.service';
import { Issue } from '../issue/issue.entity';
import { Resolution } from '../issue/resolution.entity';

function makeQueryBuilder() {
  const qb = {
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(0),
    getRawMany: jest.fn().mockResolvedValue([]),
    getRawOne: jest.fn().mockResolvedValue({ avgHours: null }),
  };
  return qb;
}

describe('ReportService', () => {
  let service: ReportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        {
          provide: getRepositoryToken(Issue),
          useValue: {
            createQueryBuilder: jest.fn(() => makeQueryBuilder()),
          },
        },
        {
          provide: getRepositoryToken(Resolution),
          useValue: {
            createQueryBuilder: jest.fn(() => makeQueryBuilder()),
          },
        },
      ],
    }).compile();

    service = module.get<ReportService>(ReportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getSummary returns structure', async () => {
    const res = await service.getSummary({});
    expect(res.totals).toHaveProperty('issues');
    expect(res).toHaveProperty('byStatus');
    expect(res).toHaveProperty('bySeverity');
  });
});
