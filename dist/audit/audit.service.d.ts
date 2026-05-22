import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
export declare class AuditService {
    private readonly auditRepository;
    constructor(auditRepository: Repository<AuditLog>);
    findAll(skip: number, take: number): Promise<{
        items: AuditLog[];
        total: number;
        skip: number;
        take: number;
    }>;
}
