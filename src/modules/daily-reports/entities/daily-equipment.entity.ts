import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  RelationId,
} from 'typeorm';
import { DailyReport } from './daily-report.entity';

/**
 * Daily Equipment Entity
 * Tracks equipment usage on site each day
 */
@Entity('daily_equipment')
export class DailyEquipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'dailyReportId' })
  dailyReportId: string;

  @ManyToOne(() => DailyReport, (report) => report.equipment, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'dailyReportId' })
  dailyReport: DailyReport;

  @Column({ type: 'varchar', length: 255, name: 'equipmentName' })
  equipmentName: string;

  @Column({ type: 'varchar', length: 100, name: 'equipmentId', nullable: true })
  equipmentId: string | null;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, name: 'hoursUsed' })
  hoursUsed: number;

  @Column({
    type: 'decimal',
    precision: 6,
    scale: 2,
    name: 'idleHours',
    default: 0,
  })
  idleHours: number;

  @Column({ type: 'varchar', length: 255, name: 'operatorName', nullable: true })
  operatorName: string | null;

  @Column({ type: 'varchar', length: 255, name: 'rentalCompany', nullable: true })
  rentalCompany: string | null;

  @Column({ type: 'boolean', name: 'isRental', default: false })
  isRental: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', length: 50, name: 'costCode', nullable: true })
  costCode: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
