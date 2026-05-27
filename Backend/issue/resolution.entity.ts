import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Issue } from './issue.entity';
import { User } from '../user/user.entity';

@Entity('resolutions')
export class Resolution {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Issue, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'issueId' })
  issue: Issue;

  @Column('text')
  resolutionDetails: string;

  @Column({ type: 'datetime' })
  dateResolved: Date;

  @ManyToOne(() => User, { eager: true })
  resolvedBy: User;
}
