import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../user/user.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { eager: true, nullable: true })
  user: User | null;

  @Column({ length: 120 })
  actionPerformed: string;

  @Column({ length: 80 })
  entityName: string;

  @Column()
  entityId: number;

  @Column({ type: 'datetime' })
  timestamp: Date;
}
