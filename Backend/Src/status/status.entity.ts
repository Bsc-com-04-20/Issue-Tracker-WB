import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { IssueStatus } from '../common/enums/issue-status.enum';

@Entity('statuses')
export class Status {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: IssueStatus, unique: true })
  name: IssueStatus;
}
