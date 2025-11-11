/**
 * Audit Service
 *
 * Handles audit logging for permission denials and security events
 */

import { Injectable, Logger } from '@nestjs/common';
import { AuditLogEntry } from '../interfaces/guard.interface';

/**
 * Audit Service
 *
 * Logs permission denials and security-related events
 * In production, this would write to a dedicated audit log database/service
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  // In-memory storage for development (replace with database in production)
  private auditLog: AuditLogEntry[] = [];
  private readonly MAX_LOG_SIZE = 10000;

  /**
   * Log a permission denial
   *
   * @param entry - Audit log entry
   */
  async logPermissionDenial(entry: AuditLogEntry): Promise<void> {
    try {
      // Add to in-memory log
      this.auditLog.push(entry);

      // Trim log if too large
      if (this.auditLog.length > this.MAX_LOG_SIZE) {
        this.auditLog = this.auditLog.slice(-this.MAX_LOG_SIZE);
      }

      // Log to console for visibility
      this.logger.warn(
        `Permission denied: ${entry.action} for user ${entry.userId} on project ${entry.projectId}`,
        {
          reason: entry.reason,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          message: entry.message,
        },
      );

      // In production, you would:
      // 1. Write to audit log database
      // 2. Send to SIEM system
      // 3. Trigger alerts for security team
      // 4. Maintain compliance records
    } catch (error) {
      this.logger.error('Failed to log audit entry:', error);
    }
  }

  /**
   * Get recent audit log entries
   *
   * @param limit - Maximum number of entries to return
   * @returns Recent audit log entries
   */
  async getRecentEntries(limit: number = 100): Promise<AuditLogEntry[]> {
    return this.auditLog.slice(-limit);
  }

  /**
   * Get audit log entries for a user
   *
   * @param userId - User ID
   * @param limit - Maximum number of entries to return
   * @returns User's audit log entries
   */
  async getUserEntries(
    userId: string,
    limit: number = 100,
  ): Promise<AuditLogEntry[]> {
    return this.auditLog
      .filter((entry) => entry.userId === userId)
      .slice(-limit);
  }

  /**
   * Get audit log entries for a project
   *
   * @param projectId - Project ID
   * @param limit - Maximum number of entries to return
   * @returns Project's audit log entries
   */
  async getProjectEntries(
    projectId: string,
    limit: number = 100,
  ): Promise<AuditLogEntry[]> {
    return this.auditLog
      .filter((entry) => entry.projectId === projectId)
      .slice(-limit);
  }

  /**
   * Clear audit log (for testing only)
   */
  async clearLog(): Promise<void> {
    this.auditLog = [];
    this.logger.debug('Audit log cleared');
  }

  /**
   * Get audit log statistics
   *
   * @returns Audit log statistics
   */
  async getStatistics(): Promise<{
    totalEntries: number;
    entriesByReason: Record<string, number>;
    entriesByAction: Record<string, number>;
  }> {
    const entriesByReason: Record<string, number> = {};
    const entriesByAction: Record<string, number> = {};

    for (const entry of this.auditLog) {
      entriesByReason[entry.reason] =
        (entriesByReason[entry.reason] || 0) + 1;
      entriesByAction[entry.action] = (entriesByAction[entry.action] || 0) + 1;
    }

    return {
      totalEntries: this.auditLog.length,
      entriesByReason,
      entriesByAction,
    };
  }
}
