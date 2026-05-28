import { Test, TestingModule } from '@nestjs/testing';
import { IssueController } from './issue.controller';
import { IssueService } from './issue.service';
import { UserService } from '../user/user.service';

describe('IssueController', () => {
  let controller: IssueController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IssueController],
      providers: [
        {
          provide: IssueService,
          useValue: {
            findAllForStaffPaginated: jest.fn(),
            findPossibleDuplicateHints: jest.fn(),
            findOneForViewer: jest.fn(),
            listAttachments: jest.fn(),
            addAttachment: jest.fn(),
            streamAttachment: jest.fn(),
            updateStatus: jest.fn(),
            closeIssue: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: { findById: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<IssueController>(IssueController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
