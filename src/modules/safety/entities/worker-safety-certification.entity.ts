import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { WorkerProfile } from '../../time-attendance/entities/worker-profile.entity';
import { SafetyCertification } from './safety-certification.entity';
import { User } from '../../users/entities/user.entity';
import { CertificationStatus } from '../enums/safety.enum';

/**
 * Worker Safety Certification Entity
 * Tracks safety certifications for individual workers with expiration tracking
 */
@Entity('worker_safety_certifications')
@Index(['workerId', 'certificationId'], { unique: true })
@Index(['workerId'])
@Index(['certificationId'])
@Index(['status'])
@Index(['expirationDate'])
export class WorkerSafetyCertification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workerId: string;

  @ManyToOne(() => WorkerProfile)
  @JoinColumn({ name: 'workerId' })
  worker: WorkerProfile;

  @Column({ type: 'uuid' })
  certificationId: string;

  @ManyToOne(() => SafetyCertification, (cert) => cert.workerCertifications)
  @JoinColumn({ name: 'certificationId' })
  certification: SafetyCertification;

  @Column({ type: 'varchar', length: 200, nullable: true })
  certificationNumber: string | null;

  @Column({ type: 'date' })
  issueDate: Date;

  @Column({ type: 'date', nullable: true })
  expirationDate: Date | null;

  @Column({
    type: 'enum',
    enum: CertificationStatus,
    default: CertificationStatus.ACTIVE,
  })
  status: CertificationStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  issuingOrganization: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  instructorName: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  certificateUrl: string | null;

  @Column({ type: 'jsonb', nullable: true })
  attachments: Array<{
    id: string;
    filename: string;
    url: string;
    size: number;
    mimeType: string;
  }> | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'date', nullable: true })
  renewalDate: Date | null;

  @Column({ type: 'boolean', default: false })
  renewalNotificationSent: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  renewalNotificationSentAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  verifiedById: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'verifiedById' })
  verifiedBy: User | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  verifiedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @Column({ type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  // Helper methods
  isExpired(): boolean {
    if (!this.expirationDate) {
      return false;
    }
    return new Date() > new Date(this.expirationDate);
  }

  isExpiringSoon(daysThreshold: number = 30): boolean {
    if (!this.expirationDate) {
      return false;
    }
    const daysUntilExpiration = Math.floor(
      (new Date(this.expirationDate).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiration >= 0 && daysUntilExpiration <= daysThreshold;
  }

  updateStatus(): void {
    if (this.isExpired()) {
      this.status = CertificationStatus.EXPIRED;
    } else if (this.isExpiringSoon()) {
      this.status = CertificationStatus.EXPIRING_SOON;
    } else {
      this.status = CertificationStatus.ACTIVE;
    }
  }
}
