import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Issue } from './issue.entity';
import { User } from '../user/user.entity';

@Entity('issue_attachments')
export class IssueAttachment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Issue, { onDelete: 'CASCADE' })
  issue: Issue;

  @Column({ length: 500 })
  storedPath: string;

  @Column({ length: 255 })
  originalName: string;

  @Column({ length: 120 })
  mimeType: string;

  @Column({ type: 'int' })
  sizeBytes: number;

  @Column({ type: 'datetime' })
  uploadedAt: Date;

  @ManyToOne(() => User)
  uploadedBy: User;
}
