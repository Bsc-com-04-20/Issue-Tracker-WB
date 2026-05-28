import { Test, TestingModule } from '@nestjs/testing';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('ReportController', () => {
  let controller: ReportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportController],
      providers: [
        {
          provide: ReportService,
          useValue: {
            getSummary: jest.fn().mockResolvedValue({}),
            getResolutionStats: jest.fn().mockResolvedValue({}),
            getIssuesByMonth: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ReportController>(ReportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
