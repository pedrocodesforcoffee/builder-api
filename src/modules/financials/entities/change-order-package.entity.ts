import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { ChangeOrderPackageItem } from './change-order-package-item.entity';
import { CoPackageStatus } from '../enums/co-package-status.enum';

/**
 * ChangeOrderPackage Entity
 *
 * Represents a package of multiple change orders grouped for batch processing.
 * Used to submit and approve multiple PCOs/OCOs/CCOs together.
 *
 * Features:
 * - 3-state workflow: DRAFT → SUBMITTED → APPROVED
 * - Total amount calculation from package items
 * - Package numbering per project
 *
 * @entity change_order_packages
 */
@Entity('change_order_packages')
@Index('IDX_co_package_project', ['projectId'])
@Index('IDX_co_package_number', ['projectId', 'packageNumber'], {
  unique: true,
})
export class ChangeOrderPackage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'project_id', nullable: false })
  projectId!: string;

  // ==================== PACKAGE DETAILS ====================

  @Column({
    type: 'varchar',
    length: 50,
    name: 'package_number',
    nullable: false,
  })
  packageNumber!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // ==================== STATUS ====================

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    default: CoPackageStatus.DRAFT,
  })
  status!: CoPackageStatus;

  // ==================== FINANCIAL SUMMARY ====================

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'total_amount',
    nullable: false,
    default: 0,
  })
  totalAmount!: number;

  // ==================== WORKFLOW ====================

  @Column({ type: 'timestamp with time zone', name: 'submitted_at', nullable: true })
  submittedAt?: Date;

  @Column({ type: 'timestamp with time zone', name: 'approved_at', nullable: true })
  approvedAt?: Date;

  // ==================== AUDIT ====================

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @Column({ type: 'uuid', name: 'created_by_id', nullable: false })
  createdById!: string;

  // ==================== RELATIONSHIPS ====================

  @ManyToOne(() => Project, { nullable: false })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy!: User;

  @OneToMany(() => ChangeOrderPackageItem, (item) => item.package)
  items?: ChangeOrderPackageItem[];
}
