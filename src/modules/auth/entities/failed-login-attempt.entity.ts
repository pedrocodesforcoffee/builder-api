import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Failed Login Attempt Entity
 *
 * Tracks failed login attempts for rate limiting and security monitoring.
 * Used to implement account lockout and detect brute force attacks.
 *
 * Security features:
 * - Tracks attempts by email and IP address
 * - Enables progressive delays and lockouts
 * - Provides data for security auditing
 * - Auto-cleanup of old records via TTL
 *
 * @entity failed_login_attempts
 */
@Entity('failed_login_attempts')
@Index('IDX_failed_login_email_ip', ['email', 'ipAddress'])
export class FailedLoginAttempt {
  /**
   * Unique identifier for the failed attempt record
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Email address used in the failed login attempt
   * Stored in lowercase for consistency
   */
  @Column({
    type: 'varchar',
    length: 255,
    transformer: {
      to: (value: string) => value?.toLowerCase(),
      from: (value: string) => value,
    },
  })
  @Index('IDX_failed_login_email')
  email!: string;

  /**
   * IP address from which the attempt was made
   * Used to detect distributed attacks and implement IP-based rate limiting
   */
  @Column({
    type: 'varchar',
    length: 45,
    name: 'ip_address',
  })
  @Index('IDX_failed_login_ip_address')
  ipAddress!: string;

  /**
   * User agent string from the failed attempt
   * Helps identify automated attack tools
   */
  @Column({
    type: 'text',
    nullable: true,
    name: 'user_agent',
  })
  userAgent?: string;

  /**
   * Timestamp when the attempt occurred
   * Indexed for efficient querying of recent attempts
   */
  @CreateDateColumn({
    name: 'attempted_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  @Index('IDX_failed_login_attempted_at')
  attemptedAt!: Date;

  /**
   * Additional context or reason for the failure (optional)
   * e.g., "invalid_password", "user_not_found", "account_locked"
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  reason?: string;
}
