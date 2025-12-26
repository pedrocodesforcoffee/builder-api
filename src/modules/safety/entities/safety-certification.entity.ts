import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { WorkerSafetyCertification } from './worker-safety-certification.entity';
import { CertificationType } from '../enums/safety.enum';

/**
 * Safety Certification Entity
 * Library of certification types/templates available for workers
 */
@Entity('safety_certifications')
@Index(['certificationType'])
@Index(['isActive'])
export class SafetyCertification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: CertificationType,
  })
  certificationType: CertificationType;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  issuingOrganization: string | null;

  @Column({ type: 'int', nullable: true })
  validityPeriodMonths: number | null;

  @Column({ type: 'boolean', default: true })
  requiresRenewal: boolean;

  @Column({ type: 'int', nullable: true })
  renewalReminderDays: number | null;

  @Column({ type: 'jsonb', nullable: true })
  requirements: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  documentTemplates: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
  }> | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @Column({ type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  // Relations
  @OneToMany(
    () => WorkerSafetyCertification,
    (workerCert) => workerCert.certification
  )
  workerCertifications: WorkerSafetyCertification[];
}
