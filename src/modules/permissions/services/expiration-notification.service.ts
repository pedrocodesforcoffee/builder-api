/**
 * Expiration Notification Service
 *
 * Handles sending notifications for expiring project memberships:
 * - 7-day warning
 * - 1-day final warning
 * - Expiration notification
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { User } from '../../users/entities/user.entity';
import { Project } from '../../projects/entities/project.entity';
import { ExpirationService } from './expiration.service';
import { NotificationBatchResult, ExpirationWarning } from '../types/expiration.types';

/**
 * Email template data for expiration notifications
 */
interface ExpirationEmailData {
  userName: string;
  userEmail: string;
  projectName: string;
  projectId: string;
  expiresAt: Date;
  daysUntilExpiration: number;
  role: string;
  renewalUrl?: string;
}

/**
 * Expiration Notification Service
 *
 * Sends email notifications for expiring memberships
 */
@Injectable()
export class ExpirationNotificationService {
  private readonly logger = new Logger(ExpirationNotificationService.name);

  constructor(
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly expirationService: ExpirationService,
  ) {}

  /**
   * Process all expiration notifications for a project
   * This should be called by a scheduled job (e.g., daily cron)
   *
   * @param projectId - Project ID
   * @returns Notification batch result
   */
  async processExpirationNotifications(
    projectId: string,
  ): Promise<NotificationBatchResult> {
    this.logger.log(
      `Processing expiration notifications for project ${projectId}`,
    );

    const warnings =
      await this.expirationService.getMembershipsRequiringNotification(
        projectId,
      );

    const result: NotificationBatchResult = {
      warningNotifications: 0,
      finalNotifications: 0,
      expiredNotifications: 0,
      errors: [],
    };

    for (const warning of warnings) {
      try {
        await this.sendExpirationNotification(warning);

        // Mark notification as sent
        await this.expirationService.markNotificationSent(
          warning.membership.userId,
          projectId,
          warning.type,
        );

        // Increment counters
        switch (warning.type) {
          case 'warning':
            result.warningNotifications++;
            break;
          case 'final':
            result.finalNotifications++;
            break;
          case 'expired':
            result.expiredNotifications++;
            break;
        }
      } catch (error) {
        this.logger.error(
          `Failed to send ${warning.type} notification for user ${warning.membership.userId}:`,
          error,
        );
        result.errors.push({
          userId: warning.membership.userId,
          projectId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    this.logger.log(
      `Completed notifications: ${result.warningNotifications} warnings, ${result.finalNotifications} finals, ${result.expiredNotifications} expired. Errors: ${result.errors.length}`,
    );

    return result;
  }

  /**
   * Process expiration notifications for all projects
   * This should be called by a scheduled job
   *
   * @returns Total notification batch result
   */
  async processAllExpirationNotifications(): Promise<NotificationBatchResult> {
    this.logger.log('Processing expiration notifications for all projects');

    // Get all projects
    const projects = await this.projectRepo.find({
      select: ['id'],
    });

    const totalResult: NotificationBatchResult = {
      warningNotifications: 0,
      finalNotifications: 0,
      expiredNotifications: 0,
      errors: [],
    };

    for (const project of projects) {
      try {
        const result = await this.processExpirationNotifications(project.id);

        totalResult.warningNotifications += result.warningNotifications;
        totalResult.finalNotifications += result.finalNotifications;
        totalResult.expiredNotifications += result.expiredNotifications;
        totalResult.errors.push(...result.errors);
      } catch (error) {
        this.logger.error(
          `Failed to process notifications for project ${project.id}:`,
          error,
        );
      }
    }

    this.logger.log(
      `Completed all project notifications: ${totalResult.warningNotifications} warnings, ${totalResult.finalNotifications} finals, ${totalResult.expiredNotifications} expired. Errors: ${totalResult.errors.length}`,
    );

    return totalResult;
  }

  /**
   * Send expiration notification
   *
   * @param warning - Expiration warning data
   */
  private async sendExpirationNotification(
    warning: ExpirationWarning,
  ): Promise<void> {
    const { membership, type, daysUntilExpiration } = warning;

    // Load user and project data
    const user = await this.userRepo.findOne({
      where: { id: membership.userId },
    });

    const project = await this.projectRepo.findOne({
      where: { id: membership.projectId },
    });

    if (!user || !project) {
      throw new Error(
        `User or project not found for membership ${membership.userId}/${membership.projectId}`,
      );
    }

    const emailData: ExpirationEmailData = {
      userName: user.name || user.email,
      userEmail: user.email,
      projectName: project.name,
      projectId: project.id,
      expiresAt: membership.expiresAt!,
      daysUntilExpiration,
      role: membership.role,
      renewalUrl: this.generateRenewalUrl(project.id, membership.userId),
    };

    // Send email based on type
    switch (type) {
      case 'warning':
        await this.sendWarningEmail(emailData);
        break;
      case 'final':
        await this.sendFinalWarningEmail(emailData);
        break;
      case 'expired':
        await this.sendExpiredEmail(emailData);
        break;
    }

    this.logger.log(
      `Sent ${type} notification to ${user.email} for project ${project.name}`,
    );
  }

  /**
   * Send 7-day warning email
   *
   * @param data - Email template data
   */
  private async sendWarningEmail(data: ExpirationEmailData): Promise<void> {
    const subject = `Your access to ${data.projectName} expires in ${data.daysUntilExpiration} days`;

    const body = this.generateWarningEmailBody(data);

    // TODO: Replace with actual email service
    await this.sendEmail(data.userEmail, subject, body);
  }

  /**
   * Send 1-day final warning email
   *
   * @param data - Email template data
   */
  private async sendFinalWarningEmail(data: ExpirationEmailData): Promise<void> {
    const subject = `URGENT: Your access to ${data.projectName} expires tomorrow`;

    const body = this.generateFinalWarningEmailBody(data);

    // TODO: Replace with actual email service
    await this.sendEmail(data.userEmail, subject, body);
  }

  /**
   * Send expiration notification email
   *
   * @param data - Email template data
   */
  private async sendExpiredEmail(data: ExpirationEmailData): Promise<void> {
    const subject = `Your access to ${data.projectName} has expired`;

    const body = this.generateExpiredEmailBody(data);

    // TODO: Replace with actual email service
    await this.sendEmail(data.userEmail, subject, body);
  }

  /**
   * Generate 7-day warning email body
   */
  private generateWarningEmailBody(data: ExpirationEmailData): string {
    return `
Dear ${data.userName},

This is a reminder that your access to the project "${data.projectName}" will expire in ${data.daysUntilExpiration} days.

Project: ${data.projectName}
Your Role: ${data.role}
Expires: ${data.expiresAt.toLocaleDateString()} at ${data.expiresAt.toLocaleTimeString()}

If you need to continue working on this project, please request a renewal by clicking the link below:

${data.renewalUrl}

If you have any questions, please contact your project administrator.

Best regards,
The BobTheBuilder Team
    `.trim();
  }

  /**
   * Generate 1-day final warning email body
   */
  private generateFinalWarningEmailBody(data: ExpirationEmailData): string {
    return `
Dear ${data.userName},

URGENT: Your access to the project "${data.projectName}" will expire TOMORROW.

Project: ${data.projectName}
Your Role: ${data.role}
Expires: ${data.expiresAt.toLocaleDateString()} at ${data.expiresAt.toLocaleTimeString()}

This is your final reminder. If you need to continue working on this project, please request a renewal immediately by clicking the link below:

${data.renewalUrl}

After expiration, you will lose access to all project resources.

If you have any questions, please contact your project administrator urgently.

Best regards,
The BobTheBuilder Team
    `.trim();
  }

  /**
   * Generate expiration notification email body
   */
  private generateExpiredEmailBody(data: ExpirationEmailData): string {
    return `
Dear ${data.userName},

Your access to the project "${data.projectName}" has expired.

Project: ${data.projectName}
Your Role: ${data.role}
Expired: ${data.expiresAt.toLocaleDateString()} at ${data.expiresAt.toLocaleTimeString()}

You no longer have access to project resources. If you need to continue working on this project, you may request a renewal by clicking the link below:

${data.renewalUrl}

The project administrator will review your request.

If you have any questions, please contact your project administrator.

Best regards,
The BobTheBuilder Team
    `.trim();
  }

  /**
   * Send email (placeholder implementation)
   * TODO: Replace with actual email service (e.g., SendGrid, AWS SES, Nodemailer)
   *
   * @param to - Recipient email
   * @param subject - Email subject
   * @param body - Email body
   */
  private async sendEmail(
    to: string,
    subject: string,
    body: string,
  ): Promise<void> {
    // Placeholder implementation - log to console
    this.logger.debug(`
=== EMAIL ===
To: ${to}
Subject: ${subject}
Body:
${body}
=============
    `);

    // TODO: Integrate with actual email service
    // Example with nodemailer:
    // await this.mailer.sendMail({
    //   to,
    //   subject,
    //   text: body,
    //   html: this.convertToHtml(body),
    // });
  }

  /**
   * Generate renewal request URL
   *
   * @param projectId - Project ID
   * @param userId - User ID
   * @returns Renewal URL
   */
  private generateRenewalUrl(projectId: string, userId: string): string {
    // TODO: Replace with actual frontend URL
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    return `${baseUrl}/projects/${projectId}/members/${userId}/renewal`;
  }

  /**
   * Send renewal request notification to admins
   *
   * @param userId - User ID who requested renewal
   * @param projectId - Project ID
   * @param reason - Renewal reason
   */
  async notifyAdminsOfRenewalRequest(
    userId: string,
    projectId: string,
    reason: string,
  ): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });

    if (!user || !project) {
      throw new Error('User or project not found');
    }

    // Find project admins and managers
    const adminMembers = await this.projectMemberRepo.find({
      where: {
        projectId,
        role: 'project_admin',
      },
      relations: ['user'],
    });

    const subject = `Renewal request from ${user.name || user.email} for ${project.name}`;
    const body = `
Dear Project Administrator,

${user.name || user.email} has requested renewal of their access to "${project.name}".

User: ${user.name || user.email} (${user.email})
Role: ${(await this.projectMemberRepo.findOne({ where: { userId, projectId } }))?.role}
Reason: ${reason}

Please review and process this request at:
${process.env.FRONTEND_URL || 'http://localhost:3001'}/projects/${projectId}/members/renewals

Best regards,
The BobTheBuilder Team
    `.trim();

    // Send to all admins
    for (const admin of adminMembers) {
      if (admin.user?.email) {
        await this.sendEmail(admin.user.email, subject, body);
      }
    }

    this.logger.log(
      `Notified ${adminMembers.length} admins of renewal request for user ${userId} on project ${projectId}`,
    );
  }

  /**
   * Send renewal decision notification to user
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @param approved - Whether renewal was approved
   * @param newExpiresAt - New expiration date if approved
   * @param reason - Decision reason
   */
  async notifyUserOfRenewalDecision(
    userId: string,
    projectId: string,
    approved: boolean,
    newExpiresAt?: Date,
    reason?: string,
  ): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });

    if (!user || !project) {
      throw new Error('User or project not found');
    }

    const subject = approved
      ? `Your renewal request for ${project.name} has been approved`
      : `Your renewal request for ${project.name} has been denied`;

    const body = approved
      ? `
Dear ${user.name || user.email},

Good news! Your renewal request for access to "${project.name}" has been approved.

New expiration date: ${newExpiresAt?.toLocaleDateString()} at ${newExpiresAt?.toLocaleTimeString()}

${reason ? `Message from administrator: ${reason}` : ''}

You can continue working on the project.

Best regards,
The BobTheBuilder Team
      `.trim()
      : `
Dear ${user.name || user.email},

Your renewal request for access to "${project.name}" has been denied.

${reason ? `Reason: ${reason}` : ''}

If you have questions or need to discuss this decision, please contact your project administrator.

Best regards,
The BobTheBuilder Team
      `.trim();

    await this.sendEmail(user.email, subject, body);

    this.logger.log(
      `Notified user ${userId} of ${approved ? 'approved' : 'denied'} renewal for project ${projectId}`,
    );
  }
}
