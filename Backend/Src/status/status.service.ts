import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { IssueStatus } from '../common/enums/issue-status.enum';
import { Status } from './status.entity';

@Injectable()
export class StatusService implements OnModuleInit {
  constructor(
    @InjectRepository(Status)
    private readonly statusRepository: Repository<Status>,
  ) {}

  async onModuleInit(): Promise<void> {
    const values = Object.values(IssueStatus);
    const existing = await this.statusRepository.find({
      where: { name: In(values) },
    });
    const existingNames = new Set(existing.map((item) => item.name));

    const missing = values.filter((name) => !existingNames.has(name));
    if (missing.length === 0) {
      return;
    }

    await this.statusRepository.insert(missing.map((name) => ({ name })));
  }

  findByName(name: IssueStatus): Promise<Status | null> {
    return this.statusRepository.findOne({ where: { name } });
  }
}
