import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../user/user.entity';
import { Location } from '../location/location.entity';
import { Status } from '../status/status.entity';

@Entity('issues')
export class Issue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  description: string;

  @Column({ length: 20 })
  severityLevel: string;

  @Column({ type: 'varchar', length: 50, default: 'water_supply' })
  issueCategory: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  issueSubcategory: string | null;

  @Column({ type: 'varchar', length: 50, default: 'operations_department' })
  assignedDepartment: string;

  @Column({ type: 'varchar', length: 20, default: 'normal' })
  urgencyLevel: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  accountNumber: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  affectedScope: string | null;

  @Column({ type: 'json', nullable: true })
  issueAttributes: Record<string, string | number> | null;

  @Column({ length: 50 })
  reportChannel: string;

  @Column({ type: 'datetime' })
  dateReported: Date;

  @Column({ length: 120 })
  reporterName: string;

  @Column({ length: 20 })
  reporterPhone: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  reporterAffiliation: string | null;

  @Column({ type: 'varchar', length: 190, nullable: true, name: 'reporter_email' })
  reporterEmail: string | null;

  @ManyToOne(() => User, { eager: true, nullable: true })
  createdBy: User | null;

  @ManyToOne(() => Location, { eager: true, cascade: ['insert'] })
  location: Location;

  @ManyToOne(() => Status, { eager: true })
  currentStatus: Status;

  /** Server-filled premise context from meter / CIS lookup (not reporter-edited). */
  @Column({ type: 'json', nullable: true })
  premiseSnapshot: Record<string, unknown> | null;

  /** Customer acknowledgement after field resolution: pending → confirmed | disputed */
  @Column({ type: 'varchar', length: 20, nullable: true })
  customerResolutionFeedback: string | null;

  @Column({ type: 'text', nullable: true })
  customerResolutionComment: string | null;

  @Column({ type: 'datetime', nullable: true })
  customerResolutionAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  slaFirstResponseDueAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  slaResolutionDueAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  slaBreachedAt: Date | null;

  @Column({ type: 'int', default: 0 })
  slaEscalationLevel: number;
}
