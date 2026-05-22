import { DataSource, Repository } from 'typeorm';
import { Assignment } from './assignment.entity';
import { AssignIssueDto } from './dto/assign-issue.dto';
import { Issue } from '../issue/issue.entity';
import { User } from '../user/user.entity';
import { StatusService } from '../status/status.service';
import { NotificationService } from '../notification/notification.service';
export declare class AssignmentService {
    private readonly assignmentRepository;
    private readonly issueRepository;
    private readonly userRepository;
    private readonly statusService;
    private readonly dataSource;
    private readonly notificationService;
    constructor(assignmentRepository: Repository<Assignment>, issueRepository: Repository<Issue>, userRepository: Repository<User>, statusService: StatusService, dataSource: DataSource, notificationService: NotificationService);
    assign(dto: AssignIssueDto, assignedByUserId: number): Promise<Assignment>;
    findForTechnician(technicianId: number): Promise<Assignment[]>;
}
