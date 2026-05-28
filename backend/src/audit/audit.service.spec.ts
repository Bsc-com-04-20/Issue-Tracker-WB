import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { AuditLog } from './audit-log.entity';

describe('AuditService', () => {
  let service: AuditService;
  const findAndCount = jest.fn();

  beforeEach(async () => {
    findAndCount.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: {
            findAndCount,
          },
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findAll returns paginated shape', async () => {
    findAndCount.mockResolvedValue([[], 0]);
    const out = await service.findAll(10, 20);
    expect(out).toEqual({ items: [], total: 0, skip: 10, take: 20 });
    expect(findAndCount).toHaveBeenCalledWith({
      order: { timestamp: 'DESC' },
      skip: 10,
      take: 20,
    });
  });
});
