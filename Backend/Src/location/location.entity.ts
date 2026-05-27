import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('locations')
export class Location {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('decimal', { precision: 10, scale: 7 })
  latitude: number;

  @Column('decimal', { precision: 10, scale: 7 })
  longitude: number;

  @Column({ length: 255 })
  addressDescription: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  serviceArea: string | null;
}
