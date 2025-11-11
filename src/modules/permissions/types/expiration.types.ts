/**
 * Expiration Types
 *
 * Types for time-based access expiration and renewal workflows
 */

import { ProjectMember } from '../../projects/entities/project-member.entity';

/**
 * Expiration Status
 */
export enum ExpirationStatus {
  ACTIVE = 'active',
  EXPIRING_SOON = 'expiring_soon',
  EXPIRED = 'expired',
  NO_EXPIRATION = 'no_expiration',
}

/**
 * Renewal Status
 */
export enum RenewalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DENIED = 'denied',
}

/**
 * Expiration Check Result
 */
export interface ExpirationCheckResult {
  isExpired: boolean;
  expiresAt?: Date;
  daysUntilExpiration?: number;
  status: ExpirationStatus;
}

/**
 * Renewal Request
 */
export interface RenewalRequest {
  userId: string;
  projectId: string;
  requestedBy: string;
  requestedAt: Date;
  reason?: string;
  currentExpiresAt?: Date;
}

/**
 * Renewal Decision
 */
export interface RenewalDecision {
  userId: string;
  projectId: string;
  approved: boolean;
  processedBy: string;
  processedAt: Date;
  reason?: string;
  newExpiresAt?: Date;
}

/**
 * Expiration Warning
 */
export interface ExpirationWarning {
  type: 'warning' | 'final' | 'expired';
  daysUntilExpiration: number;
  membership: ProjectMember;
  shouldNotify: boolean;
  lastNotifiedAt?: Date;
}

/**
 * Expiration Statistics
 */
export interface ExpirationStats {
  totalMemberships: number;
  expiredCount: number;
  expiringSoonCount: number;
  activeWithExpirationCount: number;
  noExpirationCount: number;
  pendingRenewalsCount: number;
  approvedRenewalsCount: number;
  deniedRenewalsCount: number;
  expiringMemberships: {
    expired: ProjectMember[];
    expiringSoon7Days: ProjectMember[];
    expiringSoon1Day: ProjectMember[];
  };
  renewalRequests: {
    pending: ProjectMember[];
    recent: ProjectMember[];
  };
}

/**
 * Expiration Extension
 */
export interface ExpirationExtension {
  userId: string;
  projectId: string;
  newExpiresAt: Date;
  reason?: string;
  extendedBy: string;
  extendedAt: Date;
}

/**
 * Expiration Removal
 */
export interface ExpirationRemoval {
  userId: string;
  projectId: string;
  removedBy: string;
  removedAt: Date;
  reason?: string;
  previousExpiresAt?: Date;
}

/**
 * Notification Batch Result
 */
export interface NotificationBatchResult {
  warningNotifications: number;
  finalNotifications: number;
  expiredNotifications: number;
  errors: Array<{
    userId: string;
    projectId: string;
    error: string;
  }>;
}
