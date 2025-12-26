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
 * Daily Material Entity
 * Tracks material deliveries and installations each day
 */
@Entity('daily_materials')
export class DailyMaterial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'dailyReportId' })
  dailyReportId: string;

  @ManyToOne(() => DailyReport, (report) => report.materials, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'dailyReportId' })
  dailyReport: DailyReport;

  @Column({ type: 'varchar', length: 255, name: 'materialName' })
  materialName: string;

  @Column({ type: 'decimal', precision: 12, scale: 3 })
  quantity: number;

  @Column({ type: 'varchar', length: 50 })
  unit: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  supplier: string | null;

  @Column({ type: 'varchar', length: 100, name: 'deliveryTicket', nullable: true })
  deliveryTicket: string | null;

  @Column({ type: 'boolean', name: 'isDelivery', default: false })
  isDelivery: boolean;

  @Column({ type: 'boolean', name: 'isInstalled', default: false })
  isInstalled: boolean;

  @Column({ type: 'varchar', length: 255, name: 'storageLocation', nullable: true })
  storageLocation: string | null;

  @Column({ type: 'varchar', length: 50, name: 'costCode', nullable: true })
  costCode: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
