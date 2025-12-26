import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Refresh Token Entity
 *
 * Stores hashed refresh tokens for JWT authentication with token rotation support.
 * Allows users to obtain new access tokens without re-authenticating.
 *
 * Security features:
 * - Tokens are hashed before storage (SHA-256)
 * - Token rotation on every use (prevents token reuse)
 * - Token family tracking for reuse detection
 * - Grace period for network reliability
 * - Includes expiration date for automatic cleanup
 * - Tracks IP and user agent for security auditing
 * - Supports token revocation with reason
 * - Automatic cleanup via ON DELETE CASCADE
 *
 * @entity refresh_tokens
 */
@Entity('refresh_tokens')
export class RefreshToken {
  /**
   * Unique identifier for the refresh token record
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Token family ID - groups related tokens together
   * All tokens in a family are revoked if reuse is detected
   */
  @Column({ name: 'family_id', type: 'uuid' })
  @Index('IDX_refresh_tokens_family_id')
  familyId!: string;

  /**
   * User who owns this refresh token
   * Cascade delete: tokens are removed when user is deleted
   */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  /**
   * Foreign key to the user
   */
  @Column({ name: 'user_id', type: 'uuid' })
  @Index('IDX_refresh_tokens_user_id')
  userId!: string;

  /**
   * Hashed refresh token (SHA-256)
   * NEVER store plain tokens - always hash before saving
   */
  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
    name: 'token_hash',
  })
  @Index('IDX_refresh_tokens_token_hash', { unique: true })
  tokenHash!: string;

  /**
   * Previous token hash in the family chain
   * Used for grace period handling (network reliability)
   */
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'previous_token_hash',
  })
  @Index('IDX_refresh_tokens_previous_token')
  previousTokenHash?: string;

  /**
   * Token generation number within the family
   * Incremented with each rotation
   */
  @Column({
    type: 'integer',
    default: 1,
    nullable: false,
  })
  generation!: number;

  /**
   * Token expiration date
   * Typically 7 days from creation
   */
  @Column({
    type: 'timestamp',
    name: 'expires_at',
  })
  @Index('IDX_refresh_tokens_expires_at')
  expiresAt!: Date;

  /**
   * IP address from which the token was created
   * Used for security auditing and anomaly detection
   */
  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
    name: 'ip_address',
  })
  ipAddress?: string;

  /**
   * User agent string from token creation request
   * Helps identify the device/browser for security monitoring
   */
  @Column({
    type: 'text',
    nullable: true,
    name: 'user_agent',
  })
  userAgent?: string;

  /**
   * Optional device fingerprint/ID
   * Used for device-specific security checks
   */
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'device_id',
  })
  deviceId?: string;

  /**
   * Timestamp when the token was created
   */
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  /**
   * Timestamp when the token was used for refresh
   * Used to detect token reuse attacks
   */
  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'used_at',
  })
  usedAt?: Date;

  /**
   * Timestamp when the token was revoked (if applicable)
   * Null means the token is still valid
   */
  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'revoked_at',
  })
  revokedAt?: Date;

  /**
   * Reason for token revocation
   * Examples: 'logout', 'token_reuse', 'manual', 'expired', 'user_inactive'
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    name: 'revoke_reason',
  })
  revokeReason?: string;

  /**
   * Check if the refresh token has expired
   */
  isExpired(): boolean {
    return this.expiresAt < new Date();
  }

  /**
   * Check if the refresh token has been revoked
   */
  isRevoked(): boolean {
    return this.revokedAt !== null && this.revokedAt !== undefined;
  }

  /**
   * Check if the refresh token is valid (not expired and not revoked)
   */
  isValid(): boolean {
    return !this.isExpired() && !this.isRevoked();
  }

  /**
   * Check if token was recently used (within grace period)
   * @param gracePeriodMs Grace period in milliseconds (default: 2 minutes)
   */
  isWithinGracePeriod(gracePeriodMs: number = 2 * 60 * 1000): boolean {
    if (!this.usedAt) {
      return false;
    }
    const timeSinceUse = Date.now() - this.usedAt.getTime();
    return timeSinceUse <= gracePeriodMs;
  }

  /**
   * Check if token has been used (rotated)
   */
  hasBeenUsed(): boolean {
    return this.usedAt !== null && this.usedAt !== undefined;
  }
}
