import { AuditService } from './audit.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
export declare class AuditController {
    private readonly auditService;
    constructor(auditService: AuditService);
    findAll(query: PaginationQueryDto): Promise<{
        items: import("./audit-log.entity").AuditLog[];
        total: number;
        skip: number;
        take: number;
    }>;
}
