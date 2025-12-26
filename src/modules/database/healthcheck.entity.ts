import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('healthcheck')
export class HealthCheck {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ name: 'checked_at' })
  checkedAt!: Date;

  @Column({ type: 'varchar', length: 50 })
  status!: string;
}
