import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('system_settings')
export class SystemSetting {
  @PrimaryColumn()
  key!: string; // Definite assignment assertion

  @Column({ type: 'json' })
  value!: any; // Definite assignment assertion

  @Column({ nullable: true })
  description?: string; // Optional property for nullable column

  @UpdateDateColumn()
  updatedAt!: Date; // Definite assignment assertion
}