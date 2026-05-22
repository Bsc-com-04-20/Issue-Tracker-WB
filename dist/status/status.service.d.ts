import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { IssueStatus } from '../common/enums/issue-status.enum';
import { Status } from './status.entity';
export declare class StatusService implements OnModuleInit {
    private readonly statusRepository;
    constructor(statusRepository: Repository<Status>);
    onModuleInit(): Promise<void>;
    findByName(name: IssueStatus): Promise<Status | null>;
}
