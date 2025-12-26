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
import { NotificationFrequency } from '../enums/notification-frequency.enum';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';

/**
 * Saved Search Entity
 *
 * Stores user-defined search criteria for quick access and notifications
 *
 * @entity saved_searches
 */
@Entity('saved_searches')
@Index('IDX_saved_searches_user', ['userId'])
@Index('IDX_saved_searches_organization', ['organizationId'])
@Index('IDX_saved_searches_public', ['isPublic'])
@Index('IDX_saved_searches_last_executed', ['lastExecuted'])
export class SavedSearch {
  /**
   * Unique identifier for the saved search (UUID v4)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * User ID who created the saved search
   */
  @Column({
    type: 'uuid',
    name: 'user_id',
    nullable: false,
  })
  userId!: string;

  /**
   * Organization ID the saved search belongs to
   */
  @Column({
    type: 'uuid',
    name: 'organization_id',
    nullable: false,
  })
  organizationId!: string;

  /**
   * Name of the saved search
   */
  @Column({
    type: 'varchar',
    length: 200,
    nullable: false,
  })
  name!: string;

  /**
   * Description of the saved search
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  /**
   * Search criteria stored as JSONB
   */
  @Column({
    type: 'jsonb',
    nullable: false,
    default: {},
  })
  criteria!: Record<string, any>;

  /**
   * Sort field for results
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    default: 'relevance',
    name: 'sort_by',
  })
  sortBy?: string;

  /**
   * Sort order (asc or desc)
   */
  @Column({
    type: 'varchar',
    length: 10,
    nullable: true,
    default: 'desc',
    name: 'sort_order',
  })
  sortOrder?: string;

  /**
   * Columns to display in results
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    default: [],
  })
  columns?: string[];

  /**
   * Whether the saved search is public
   */
  @Column({
    type: 'boolean',
    default: false,
    nullable: false,
    name: 'is_public',
  })
  isPublic!: boolean;

  /**
   * User IDs the search is shared with
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    default: [],
    name: 'shared_with_users',
  })
  sharedWithUsers?: string[];

  /**
   * Role IDs the search is shared with
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    default: [],
    name: 'shared_with_roles',
  })
  sharedWithRoles?: string[];

  /**
   * Whether notifications are enabled
   */
  @Column({
    type: 'boolean',
    default: false,
    nullable: false,
    name: 'enable_notifications',
  })
  enableNotifications!: boolean;

  /**
   * Notification frequency
   */
  @Column({
    type: 'enum',
    enum: NotificationFrequency,
    default: NotificationFrequency.DAILY,
    nullable: true,
    name: 'notification_frequency',
  })
  notificationFrequency?: NotificationFrequency;

  /**
   * Last notification sent timestamp
   */
  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'last_notification_sent',
  })
  lastNotificationSent?: Date;

  /**
   * Number of times the search has been executed
   */
  @Column({
    type: 'integer',
    default: 0,
    nullable: false,
    name: 'execution_count',
  })
  executionCount!: number;

  /**
   * Last execution timestamp
   */
  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'last_executed',
  })
  lastExecuted?: Date;

  /**
   * Average result count
   */
  @Column({
    type: 'integer',
    nullable: true,
    name: 'average_result_count',
  })
  averageResultCount?: number;

  /**
   * Tags for categorization
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    default: [],
  })
  tags?: string[];

  /**
   * Color for UI display
   */
  @Column({
    type: 'varchar',
    length: 7,
    nullable: true,
  })
  color?: string;

  /**
   * Icon for UI display
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  icon?: string;

  /**
   * Timestamp when the saved search was created
   */
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  /**
   * Timestamp when the saved search was last updated
   */
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;

  // ==================== RELATIONSHIPS ====================

  /**
   * User who created the saved search
   */
  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  createdBy?: User;

  /**
   * Organization the saved search belongs to
   */
  @ManyToOne(() => Organization, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization?: Organization;
}