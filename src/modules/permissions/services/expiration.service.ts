/**
 * Expiration Service
 *
 * Handles time-based expiration of project memberships including:
 * - Expiration checking and validation
 * - Renewal request workflow
 * - Notification tracking
 * - Expiration statistics
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThan, IsNull, Not } from 'typeorm';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { InheritanceService } from './inheritance.service';
import {
  ExpirationCheckResult,
  ExpirationStatus,
  RenewalRequest,
  RenewalDecision,
  RenewalStatus,
  ExpirationWarning,
  ExpirationStats,
  ExpirationExtension,
  ExpirationRemoval,
  NotificationBatchResult,
} from '../types/expiration.types';

/**
 * Expiration Service
 *
 * Provides methods for managing time-based access expiration
 */
@Injectable()
export class ExpirationService {
  private readonly logger = new Logger(ExpirationService.name);

  constructor(
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,
    private readonly inheritanceService: InheritanceService,
  ) {}

  /**
   * Check if user's project membership has expired
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @returns true if membership is expired
   */
  async isExpired(userId: string, projectId: string): Promise<boolean> {
    const result = await this.checkExpiration(userId, projectId);
    return result.isExpired;
  }

  /**
   * Check if membership is expiring soon
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @param daysAhead - Number of days to look ahead (default: 7)
   * @returns true if membership expires within the specified days
   */
  async isExpiringSoon(
    userId: string,
    projectId: string,
    daysAhead: number = 7,
  ): Promise<boolean> {
    const result = await this.checkExpiration(userId, projectId);

    if (result.status === ExpirationStatus.NO_EXPIRATION) {
      return false;
    }

    if (result.isExpired) {
      return false; // Already expired
    }

    return (
      result.daysUntilExpiration !== undefined &&
      result.daysUntilExpiration <= daysAhead
    );
  }

  /**
   * Get detailed expiration check for a membership
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @returns Detailed expiration check result
   */
  async checkExpiration(
    userId: string,
    projectId: string,
  ): Promise<ExpirationCheckResult> {
    // Check if user has inherited role (never expires)
    const roleResult = await this.inheritanceService.getEffectiveRole(
      userId,
      projectId,
    );

    if (roleResult.isInherited) {
      this.logger.debug(
        `User ${userId} has inherited role, no expiration applies`,
      );
      return {
        isExpired: false,
        status: ExpirationStatus.NO_EXPIRATION,
      };
    }

    // Get explicit project membership
    const membership = await this.projectMemberRepo.findOne({
      where: { userId, projectId },
    });

    if (!membership) {
      throw new NotFoundException(
        `User ${userId} is not a member of project ${projectId}`,
      );
    }

    // Check if membership has expiration date
    if (!membership.expiresAt) {
      return {
        isExpired: false,
        status: ExpirationStatus.NO_EXPIRATION,
      };
    }

    const now = new Date();
    const expiresAt = membership.expiresAt;
    const isExpired = expiresAt < now;

    if (isExpired) {
      return {
        isExpired: true,
        expiresAt,
        daysUntilExpiration: 0,
        status: ExpirationStatus.EXPIRED,
      };
    }

    // Calculate days until expiration
    const msUntilExpiration = expiresAt.getTime() - now.getTime();
    const daysUntilExpiration = Math.ceil(
      msUntilExpiration / (1000 * 60 * 60 * 24),
    );

    const status =
      daysUntilExpiration <= 7
        ? ExpirationStatus.EXPIRING_SOON
        : ExpirationStatus.ACTIVE;

    return {
      isExpired: false,
      expiresAt,
      daysUntilExpiration,
      status,
    };
  }

  /**
   * Get all memberships expiring within specified days
   *
   * @param projectId - Project ID
   * @param daysAhead - Number of days to look ahead
   * @returns Array of expiring memberships
   */
  async getExpiringMemberships(
    projectId: string,
    daysAhead: number = 7,
  ): Promise<ProjectMember[]> {
    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return this.projectMemberRepo.find({
      where: {
        projectId,
        expiresAt: Not(IsNull()) && LessThanOrEqual(futureDate),
      },
      relations: ['user', 'project'],
      order: {
        expiresAt: 'ASC',
      },
    });
  }

  /**
   * Get all expired memberships
   *
   * @param projectId - Project ID
   * @returns Array of expired memberships
   */
  async getExpiredMemberships(projectId: string): Promise<ProjectMember[]> {
    const now = new Date();

    return this.projectMemberRepo.find({
      where: {
        projectId,
        expiresAt: Not(IsNull()) && LessThanOrEqual(now),
      },
      relations: ['user', 'project'],
      order: {
        expiresAt: 'DESC',
      },
    });
  }

  /**
   * Extend expiration date for a membership
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @param newExpiresAt - New expiration date
   * @param reason - Reason for extension
   * @param extendedBy - User ID who is extending
   * @returns Updated membership
   */
  async extendExpiration(
    userId: string,
    projectId: string,
    newExpiresAt: Date,
    reason: string,
    extendedBy: string,
  ): Promise<ProjectMember> {
    const membership = await this.projectMemberRepo.findOne({
      where: { userId, projectId },
    });

    if (!membership) {
      throw new NotFoundException(
        `Membership not found for user ${userId} in project ${projectId}`,
      );
    }

    const now = new Date();

    // Validate new expiration date is in the future
    if (newExpiresAt <= now) {
      throw new Error('New expiration date must be in the future');
    }

    this.logger.log(
      `Extending expiration for user ${userId} in project ${projectId} to ${newExpiresAt.toISOString()}`,
    );

    // Update expiration
    membership.expiresAt = newExpiresAt;
    membership.expirationReason = reason;

    // Reset notification timestamps since expiration changed
    membership.expirationWarningNotifiedAt = undefined;
    membership.expirationFinalNotifiedAt = undefined;
    membership.expiredNotifiedAt = undefined;

    // If there was a pending renewal, mark it as approved
    if (membership.renewalRequested && membership.renewalStatus === 'pending') {
      membership.renewalStatus = 'approved';
      membership.renewalProcessedBy = extendedBy;
      membership.renewalProcessedAt = now;
    }

    return this.projectMemberRepo.save(membership);
  }

  /**
   * Remove expiration from membership (make permanent)
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @param removedBy - User ID who is removing expiration
   * @param reason - Reason for removal
   * @returns Updated membership
   */
  async removeExpiration(
    userId: string,
    projectId: string,
    removedBy: string,
    reason?: string,
  ): Promise<ProjectMember> {
    const membership = await this.projectMemberRepo.findOne({
      where: { userId, projectId },
    });

    if (!membership) {
      throw new NotFoundException(
        `Membership not found for user ${userId} in project ${projectId}`,
      );
    }

    this.logger.log(
      `Removing expiration for user ${userId} in project ${projectId}`,
    );

    // Remove expiration
    membership.expiresAt = undefined;
    membership.expirationReason = undefined;

    // Clear notification timestamps
    membership.expirationWarningNotifiedAt = undefined;
    membership.expirationFinalNotifiedAt = undefined;
    membership.expiredNotifiedAt = undefined;

    // If there was a pending renewal, mark it as approved
    if (membership.renewalRequested && membership.renewalStatus === 'pending') {
      membership.renewalStatus = 'approved';
      membership.renewalProcessedBy = removedBy;
      membership.renewalProcessedAt = new Date();
      membership.renewalReason = reason || 'Expiration removed - access made permanent';
    }

    return this.projectMemberRepo.save(membership);
  }

  /**
   * Request renewal of expiring membership
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @param requestedBy - User ID making the request (usually same as userId)
   * @param reason - Reason for renewal request
   * @returns Updated membership
   */
  async requestRenewal(
    userId: string,
    projectId: string,
    requestedBy: string,
    reason: string,
  ): Promise<ProjectMember> {
    const membership = await this.projectMemberRepo.findOne({
      where: { userId, projectId },
    });

    if (!membership) {
      throw new NotFoundException(
        `Membership not found for user ${userId} in project ${projectId}`,
      );
    }

    if (!membership.expiresAt) {
      throw new Error('Cannot request renewal for membership without expiration');
    }

    if (membership.renewalRequested && membership.renewalStatus === 'pending') {
      throw new Error('Renewal request already pending');
    }

    this.logger.log(
      `Renewal requested for user ${userId} in project ${projectId}`,
    );

    // Set renewal request
    membership.renewalRequested = true;
    membership.renewalRequestedAt = new Date();
    membership.renewalRequestedBy = requestedBy;
    membership.renewalReason = reason;
    membership.renewalStatus = 'pending';

    // Clear previous processing info
    membership.renewalProcessedBy = undefined;
    membership.renewalProcessedAt = undefined;

    return this.projectMemberRepo.save(membership);
  }

  /**
   * Process renewal request (approve or deny)
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @param approved - Whether to approve or deny
   * @param processedBy - User ID processing the request
   * @param reason - Reason for decision
   * @param newExpiresAt - New expiration date if approved
   * @returns Updated membership
   */
  async processRenewal(
    userId: string,
    projectId: string,
    approved: boolean,
    processedBy: string,
    reason?: string,
    newExpiresAt?: Date,
  ): Promise<ProjectMember> {
    const membership = await this.projectMemberRepo.findOne({
      where: { userId, projectId },
    });

    if (!membership) {
      throw new NotFoundException(
        `Membership not found for user ${userId} in project ${projectId}`,
      );
    }

    if (!membership.renewalRequested) {
      throw new Error('No renewal request to process');
    }

    if (membership.renewalStatus !== 'pending') {
      throw new Error(`Renewal request already ${membership.renewalStatus}`);
    }

    const now = new Date();

    this.logger.log(
      `Processing renewal for user ${userId} in project ${projectId}: ${approved ? 'APPROVED' : 'DENIED'}`,
    );

    // Update renewal status
    membership.renewalStatus = approved ? 'approved' : 'denied';
    membership.renewalProcessedBy = processedBy;
    membership.renewalProcessedAt = now;

    // If approved, extend expiration
    if (approved) {
      if (newExpiresAt) {
        if (newExpiresAt <= now) {
          throw new Error('New expiration date must be in the future');
        }
        membership.expiresAt = newExpiresAt;

        // Reset notification timestamps
        membership.expirationWarningNotifiedAt = undefined;
        membership.expirationFinalNotifiedAt = undefined;
        membership.expiredNotifiedAt = undefined;
      } else {
        throw new Error('New expiration date required for approval');
      }
    }

    return this.projectMemberRepo.save(membership);
  }

  /**
   * Get pending renewal requests for a project
   *
   * @param projectId - Project ID
   * @returns Array of memberships with pending renewals
   */
  async getPendingRenewals(projectId: string): Promise<ProjectMember[]> {
    return this.projectMemberRepo.find({
      where: {
        projectId,
        renewalRequested: true,
        renewalStatus: 'pending',
      },
      relations: ['user', 'project'],
      order: {
        renewalRequestedAt: 'ASC',
      },
    });
  }

  /**
   * Get memberships requiring notification
   *
   * @param projectId - Project ID
   * @returns Array of expiration warnings to send
   */
  async getMembershipsRequiringNotification(
    projectId: string,
  ): Promise<ExpirationWarning[]> {
    const now = new Date();
    const warnings: ExpirationWarning[] = [];

    // Get all memberships with expiration
    const memberships = await this.projectMemberRepo.find({
      where: {
        projectId,
        expiresAt: Not(IsNull()),
      },
      relations: ['user', 'project'],
    });

    for (const membership of memberships) {
      if (!membership.expiresAt) continue;

      const daysUntilExpiration = Math.ceil(
        (membership.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Check if expired and not yet notified
      if (daysUntilExpiration <= 0 && !membership.expiredNotifiedAt) {
        warnings.push({
          type: 'expired',
          daysUntilExpiration: 0,
          membership,
          shouldNotify: true,
          lastNotifiedAt: membership.expiredNotifiedAt,
        });
        continue;
      }

      // Check for 1-day warning
      if (
        daysUntilExpiration <= 1 &&
        daysUntilExpiration > 0 &&
        !membership.expirationFinalNotifiedAt
      ) {
        warnings.push({
          type: 'final',
          daysUntilExpiration,
          membership,
          shouldNotify: true,
          lastNotifiedAt: membership.expirationFinalNotifiedAt,
        });
        continue;
      }

      // Check for 7-day warning
      if (
        daysUntilExpiration <= 7 &&
        daysUntilExpiration > 1 &&
        !membership.expirationWarningNotifiedAt
      ) {
        warnings.push({
          type: 'warning',
          daysUntilExpiration,
          membership,
          shouldNotify: true,
          lastNotifiedAt: membership.expirationWarningNotifiedAt,
        });
      }
    }

    return warnings;
  }

  /**
   * Mark notification as sent
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @param notificationType - Type of notification
   * @returns Updated membership
   */
  async markNotificationSent(
    userId: string,
    projectId: string,
    notificationType: 'warning' | 'final' | 'expired',
  ): Promise<ProjectMember> {
    const membership = await this.projectMemberRepo.findOne({
      where: { userId, projectId },
    });

    if (!membership) {
      throw new NotFoundException(
        `Membership not found for user ${userId} in project ${projectId}`,
      );
    }

    const now = new Date();

    switch (notificationType) {
      case 'warning':
        membership.expirationWarningNotifiedAt = now;
        break;
      case 'final':
        membership.expirationFinalNotifiedAt = now;
        break;
      case 'expired':
        membership.expiredNotifiedAt = now;
        break;
    }

    return this.projectMemberRepo.save(membership);
  }

  /**
   * Get expiration statistics for a project
   *
   * @param projectId - Project ID
   * @returns Expiration statistics
   */
  async getExpirationStats(projectId: string): Promise<ExpirationStats> {
    const now = new Date();
    const date7DaysOut = new Date(now);
    date7DaysOut.setDate(date7DaysOut.getDate() + 7);
    const date1DayOut = new Date(now);
    date1DayOut.setDate(date1DayOut.getDate() + 1);

    // Get all memberships
    const allMemberships = await this.projectMemberRepo.find({
      where: { projectId },
      relations: ['user', 'project'],
    });

    // Get expired
    const expired = await this.projectMemberRepo.find({
      where: {
        projectId,
        expiresAt: Not(IsNull()) && LessThanOrEqual(now),
      },
      relations: ['user', 'project'],
    });

    // Get expiring soon (7 days)
    const expiringSoon7Days = await this.projectMemberRepo.find({
      where: {
        projectId,
        expiresAt: Not(IsNull()) && MoreThan(now) && LessThanOrEqual(date7DaysOut),
      },
      relations: ['user', 'project'],
    });

    // Get expiring very soon (1 day)
    const expiringSoon1Day = await this.projectMemberRepo.find({
      where: {
        projectId,
        expiresAt: Not(IsNull()) && MoreThan(now) && LessThanOrEqual(date1DayOut),
      },
      relations: ['user', 'project'],
    });

    // Get pending renewals
    const pendingRenewals = await this.projectMemberRepo.find({
      where: {
        projectId,
        renewalRequested: true,
        renewalStatus: 'pending',
      },
      relations: ['user', 'project'],
    });

    // Get recent renewals (last 30 days)
    const recentDate = new Date(now);
    recentDate.setDate(recentDate.getDate() - 30);
    const recentRenewals = await this.projectMemberRepo.find({
      where: {
        projectId,
        renewalProcessedAt: MoreThan(recentDate),
      },
      relations: ['user', 'project'],
      order: {
        renewalProcessedAt: 'DESC',
      },
    });

    // Count by renewal status
    const approvedRenewals = allMemberships.filter(
      (m) => m.renewalStatus === 'approved',
    ).length;
    const deniedRenewals = allMemberships.filter(
      (m) => m.renewalStatus === 'denied',
    ).length;

    // Count memberships with and without expiration
    const withExpiration = allMemberships.filter((m) => m.expiresAt).length;
    const withoutExpiration = allMemberships.length - withExpiration;

    return {
      totalMemberships: allMemberships.length,
      expiredCount: expired.length,
      expiringSoonCount: expiringSoon7Days.length,
      activeWithExpirationCount: withExpiration - expired.length,
      noExpirationCount: withoutExpiration,
      pendingRenewalsCount: pendingRenewals.length,
      approvedRenewalsCount: approvedRenewals,
      deniedRenewalsCount: deniedRenewals,
      expiringMemberships: {
        expired,
        expiringSoon7Days,
        expiringSoon1Day,
      },
      renewalRequests: {
        pending: pendingRenewals,
        recent: recentRenewals,
      },
    };
  }
}
