import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ScheduleOfValues } from './schedule-of-values.entity';
import { CostCode } from './cost-code.entity';
import { PaymentApplicationItem } from './payment-application-item.entity';

/**
 * ScheduleOfValuesItem Entity
 *
 * Represents a single line item within a Schedule of Values.
 * Each line item defines the scheduled value (budgeted amount) for a specific
 * scope of work, mapped to a cost code.
 *
 * Features:
 * - Sequential line numbering for AIA G703 form
 * - Mapped to cost codes for budget tracking
 * - Scheduled value defines total billable amount
 * - Used as baseline for payment application line items
 *
 * @entity schedule_of_values_items
 */
@Entity('schedule_of_values_items')
@Index('IDX_sov_items_sov', ['sovId'])
@Index('IDX_sov_items_cost_code', ['costCodeId'])
@Index('IDX_sov_items_line_number', ['sovId', 'lineNumber'], { unique: true })
export class ScheduleOfValuesItem {
  /**
   * Unique identifier for the SOV item (UUID v4)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Schedule of Values ID
   */
  @Column({
    type: 'uuid',
    name: 'sov_id',
    nullable: false,
  })
  sovId!: string;

  /**
   * Cost code ID
   * Maps this line item to a specific cost code for budget tracking
   */
  @Column({
    type: 'uuid',
    name: 'cost_code_id',
    nullable: false,
  })
  costCodeId!: string;

  /**
   * Line number (sequential, 1-based)
   * Used for ordering and reference on AIA G703 form
   */
  @Column({
    type: 'integer',
    name: 'line_number',
    nullable: false,
  })
  lineNumber!: number;

  /**
   * Description of work
   * Detailed description of this scope of work
   */
  @Column({
    type: 'text',
    nullable: false,
  })
  description!: string;

  /**
   * Scheduled value
   * The total contracted amount for this line item
   * This is the maximum billable amount across all payment applications
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'scheduled_value',
    nullable: false,
  })
  scheduledValue!: number;

  /**
   * Timestamp when the item was created
   */
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
  })
  createdAt!: Date;

  /**
   * Timestamp when the item was last updated
   */
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp with time zone',
  })
  updatedAt!: Date;

  // ==================== RELATIONSHIPS ====================

  /**
   * Schedule of Values relationship
   */
  @ManyToOne(() => ScheduleOfValues, (sov) => sov.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sov_id' })
  sov!: ScheduleOfValues;

  /**
   * Cost code relationship
   */
  @ManyToOne(() => CostCode, { nullable: false })
  @JoinColumn({ name: 'cost_code_id' })
  costCode!: CostCode;

  /**
   * Payment application items
   * All payment application line items that reference this SOV item
   */
  @OneToMany(() => PaymentApplicationItem, (payAppItem) => payAppItem.sovItem)
  paymentApplicationItems?: PaymentApplicationItem[];
}
