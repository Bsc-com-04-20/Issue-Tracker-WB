import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from '../common/enums/role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  name: string;

  @Column({ unique: true, length: 190 })
  email: string;

  @Column({ length: 20 })
  phone: string;

  @Column({ type: 'enum', enum: Role })
  role: Role;

  @Column({ type: 'varchar', length: 120, nullable: true })
  department: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0, name: 'failed_login_attempts' })
  failedLoginAttempts: number;

  @Column({ type: 'datetime', nullable: true, name: 'lockout_until' })
  lockoutUntil: Date | null;

  /** Optional home / depot coordinates for dispatch proximity sorting (technicians). */
  @Column({ type: 'double', nullable: true })
  homeBaseLatitude: number | null;

  @Column({ type: 'double', nullable: true })
  homeBaseLongitude: number | null;

  @Column({ type: 'varchar', length: 255, select: false })
  passwordHash: string;
}
