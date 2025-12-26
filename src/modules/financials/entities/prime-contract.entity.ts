import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { PrimeContractStatus } from '../enums/prime-contract-status.enum';

/**
 * PrimeContract Entity
 *
 * Represents the main contract between the owner/client and the contractor (you).
 * Also known as the "Owner Contract" in construction management.
 *
 * The prime contract defines:
 * - The original contract amount
 * - Current contract amount (after approved change orders)
 * - Contract dates and schedule
 * - Billing terms and retention
 *
 * Features:
 * - Tracks original vs current contract value
 * - Supports change orders (via approved change orders)
 * - Tracks retention percentage for billing
 * - Status workflow (draft → active → complete → closed)
 * - Contract dates and duration tracking
 *
 * @entity prime_contracts
 */
@Entity('prime_contracts')
@Index('IDX_prime_contracts_project', ['projectId'])
@Index('IDX_prime_contracts_number', ['projectId', 'number'], { unique: true })
@Index('IDX_prime_contracts_status', ['status'])
export class PrimeContract {
  // ==================== CORE FIELDS ====================

  /**
   * Unique identifier for the prime contract (UUID v4)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Project ID
   * The project this prime contract belongs to
   */
  @Column({
    type: 'uuid',
    name: 'project_id',
    nullable: false,
  })
  projectId!: string;

  /**
   * Contract number
   * Unique identifier for this contract within the project
   *
   * Examples:
   * - "PC-001"
   * - "2024-001"
   * - "MAIN-CONTRACT"
   */
  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  number!: string;

  /**
   * Alias for number field (for backward compatibility)
   */
  get contractNumber(): string {
    return this.number;
  }

  /**
   * Contract title/name
   *
   * Examples:
   * - "Main Construction Contract"
   * - "Phase 1 - Foundation Work"
   */
  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  title!: string;

  /**
   * Contract description (optional)
   * Additional details about the scope and terms
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  /**
   * Contract status
   * Lifecycle state of the contract
   *
   * - DRAFT: Contract being negotiated/drafted
   * - ACTIVE: Contract is signed and work is ongoing
   * - COMPLETE: All work complete, final billing may be pending
   * - CLOSED: Contract fully closed out
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    default: PrimeContractStatus.DRAFT,
  })
  status!: PrimeContractStatus;

  // ==================== FINANCIAL FIELDS ====================

  /**
   * Original contract amount
   * The initial contract value before any change orders
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'original_amount',
    nullable: false,
  })
  originalAmount!: number;

  /**
   * Current contract amount
   * The current contract value including approved change orders
   * Should be updated when change orders are approved
   *
   * Formula: originalAmount + sum(approved change orders)
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'current_amount',
    nullable: false,
  })
  currentAmount!: number;

  /**
   * Retention percentage
   * Percentage of each billing that is held back until project completion
   *
   * Common values:
   * - 5% (typical for private projects)
   * - 10% (common for public projects)
   * - 0% (no retention)
   */
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'retention_percentage',
    nullable: false,
    default: 5.0,
  })
  retentionPercentage!: number;

  // ==================== DATE FIELDS ====================

  /**
   * Contract start date
   * Date when work under this contract begins
   */
  @Column({
    type: 'date',
    name: 'start_date',
    nullable: true,
  })
  startDate?: Date;

  /**
   * Contract end date
   * Originally scheduled completion date
   */
  @Column({
    type: 'date',
    name: 'end_date',
    nullable: true,
  })
  endDate?: Date;

  /**
   * Actual completion date
   * Date when work was actually completed
   */
  @Column({
    type: 'date',
    name: 'completion_date',
    nullable: true,
  })
  completionDate?: Date;

  // ==================== AUDIT FIELDS ====================

  /**
   * Timestamp when the contract was created
   */
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
  })
  createdAt!: Date;

  /**
   * Timestamp when the contract was last updated
   */
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp with time zone',
  })
  updatedAt!: Date;

  // ==================== RELATIONSHIPS ====================

  /**
   * Project relationship
   * Links to the project this contract belongs to
   */
  @ManyToOne(() => Project, { nullable: false })
  @JoinColumn({ name: 'project_id' })
  project!: Project;
}
