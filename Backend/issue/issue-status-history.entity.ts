import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Issue } from './issue.entity';
import { Status } from '../status/status.entity';
import { User } from '../user/user.entity';

@Entity('issue_status_history')
export class IssueStatusHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Issue, { eager: true })
  issue: Issue;

  @ManyToOne(() => Status, { eager: true })
  status: Status;

  @ManyToOne(() => User, { eager: true, nullable: true })
  changedBy: User | null;

  @Column({ type: 'datetime' })
  changedAt: Date;
}
