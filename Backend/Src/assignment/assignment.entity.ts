import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Issue } from '../issue/issue.entity';
import { User } from '../user/user.entity';

@Entity('assignments')
export class Assignment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Issue, { eager: true })
  issue: Issue;

  @ManyToOne(() => User, { eager: true })
  assignedTo: User;

  @ManyToOne(() => User, { eager: true })
  assignedBy: User;

  @Column({ type: 'datetime' })
  assignmentDate: Date;

  @Column({ type: 'varchar', length: 20 })
  priorityLevel: string;
}
