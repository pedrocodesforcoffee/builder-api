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
import { PaymentApplication } from './payment-application.entity';
import { ScheduleOfValuesItem } from './schedule-of-values-item.entity';

/**
 * PaymentApplicationItem Entity
 *
 * Represents a single line item within a payment application (AIA G703).
 * Each line item tracks work completed and materials stored for a specific
 * scope of work during the billing period.
 *
 * Features:
 * - References SOV item for scheduled value baseline
 * - Tracks work completed this period
 * - Tracks materials stored this period
 * - Calculates cumulative totals from prior pay apps
 * - Calculates percent complete and balance to finish
 *
 * @entity payment_application_items
 */
@Entity('payment_application_items')
@Index('IDX_pay_app_items_pay_app', ['paymentApplicationId'])
@Index('IDX_pay_app_items_sov_item', ['sovItemId'])
@Index('IDX_pay_app_items_line_number', [
  'paymentApplicationId',
  'lineNumber',
], { unique: true })
export class PaymentApplicationItem {
  /**
   * Unique identifier for the payment application item (UUID v4)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Payment Application ID
   */
  @Column({
    type: 'uuid',
    name: 'payment_application_id',
    nullable: false,
  })
  paymentApplicationId!: string;

  /**
   * Schedule of Values Item ID
   * References the SOV item this pay app item is billing against
   */
  @Column({
    type: 'uuid',
    name: 'sov_item_id',
    nullable: false,
  })
  sovItemId!: string;

  // ==================== LINE ITEM DETAILS ====================

  /**
   * Line number (from SOV item, 1-based)
   * Used for ordering and reference on AIA G703 form
   */
  @Column({
    type: 'integer',
    name: 'line_number',
    nullable: false,
  })
  lineNumber!: number;

  /**
   * Description of work (from SOV item)
   * Copied from SOV item for convenience
   */
  @Column({
    type: 'text',
    nullable: false,
  })
  description!: string;

  /**
   * Scheduled value (from SOV item)
   * Copied from SOV item for convenience and performance
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'scheduled_value',
    nullable: false,
  })
  scheduledValue!: number;

  // ==================== PROGRESS THIS PERIOD ====================

  /**
   * Work completed this period
   * The value of work completed during this billing period
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'work_completed_this_period',
    nullable: false,
    default: 0,
  })
  workCompletedThisPeriod!: number;

  /**
   * Materials stored this period
   * The value of materials delivered and stored on-site during this period
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'materials_stored_this_period',
    nullable: false,
    default: 0,
  })
  materialsStoredThisPeriod!: number;

  // ==================== CUMULATIVE TOTALS ====================

  /**
   * Total work completed (cumulative)
   * Sum of work completed from all prior pay apps + this period
   * Calculated when pay app is created/updated
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'total_work_completed',
    nullable: false,
    default: 0,
  })
  totalWorkCompleted!: number;

  /**
   * Total materials stored (cumulative)
   * Sum of materials stored from all prior pay apps + this period
   * Calculated when pay app is created/updated
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'total_materials_stored',
    nullable: false,
    default: 0,
  })
  totalMaterialsStored!: number;

  /**
   * Total completed and stored (cumulative)
   * Sum of total work completed + total materials stored
   * This is the main value used for billing
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'total_completed_and_stored',
    nullable: false,
    default: 0,
  })
  totalCompletedAndStored!: number;

  // ==================== CALCULATED FIELDS ====================

  /**
   * Percent complete
   * Calculated as: (totalCompletedAndStored / scheduledValue) × 100
   */
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'percent_complete',
    nullable: false,
    default: 0,
  })
  percentComplete!: number;

  /**
   * Balance to finish
   * Calculated as: scheduledValue - totalCompletedAndStored
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'balance_to_finish',
    nullable: false,
    default: 0,
  })
  balanceToFinish!: number;

  // ==================== TIMESTAMPS ====================

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
   * Payment Application relationship
   */
  @ManyToOne(() => PaymentApplication, (payApp) => payApp.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'payment_application_id' })
  paymentApplication!: PaymentApplication;

  /**
   * Schedule of Values Item relationship
   */
  @ManyToOne(() => ScheduleOfValuesItem, (sovItem) => sovItem.paymentApplicationItems, {
    nullable: false,
  })
  @JoinColumn({ name: 'sov_item_id' })
  sovItem!: ScheduleOfValuesItem;
}
