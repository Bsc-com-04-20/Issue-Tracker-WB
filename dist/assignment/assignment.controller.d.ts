import { Request } from 'express';
import { AssignmentService } from './assignment.service';
import { AssignIssueDto } from './dto/assign-issue.dto';
import { JwtUser } from '../common/interfaces/jwt-user.interface';
export declare class AssignmentController {
    private readonly assignmentService;
    constructor(assignmentService: AssignmentService);
    assign(dto: AssignIssueDto, request: Request & {
        user: JwtUser;
    }): Promise<import("./assignment.entity").Assignment>;
    listMine(request: Request & {
        user: JwtUser;
    }): Promise<import("./assignment.entity").Assignment[]>;
}
