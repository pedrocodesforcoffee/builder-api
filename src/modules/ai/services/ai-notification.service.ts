/**
 * AI Notification Service
 * Handles notifications for AI recommendations, patterns, and insights
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AiNotification, AiNotificationType, NotificationStatus } from '../entities/ai-notification.entity';
import { Recommendation } from '../entities/recommendation.entity';
import { User } from '../../users/entities/user.entity';
import { Project } from '../../projects/entities/project.entity';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { RecommendationPriority } from '../enums/recommendation-priority.enum';
import { RecommendationStatus } from '../enums/recommendation-status.enum';
import { ProjectRole } from '../../users/enums/project-role.enum';

/**
 * Weekly digest data for a user
 */
export interface WeeklyDigest {
  userId: string;
  organizationId: string;
  recommendations: {
    total: number;
    highPriority: number;
    pending: number;
    accepted: number;
  };
  patterns: {
    newAlerts: number;
    riskIndicators: number;
  };
  lessonsLearned: {
    newDrafts: number;
  };
}

@Injectable()
export class AiNotificationService {
  private readonly logger = new Logger(AiNotificationService.name);
  private readonly appUrl: string;

  constructor(
    @InjectRepository(AiNotification)
    private readonly notificationRepository: Repository<AiNotification>,
    @InjectRepository(Recommendation)
    private readonly recommendationRepository: Repository<Recommendation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,
    private readonly configService: ConfigService,
  ) {
    this.appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
  }

  /**
   * Notify user when high-priority recommendation is created
   *
   * @param recommendation - Recommendation entity
   */
  async notifyRecommendationCreated(recommendation: Recommendation): Promise<void> {
    // Only notify for high-priority recommendations
    if (recommendation.priority !== RecommendationPriority.HIGH) {
      return;
    }

    // Get project to find project manager
    const project = await this.projectRepository.findOne({
      where: { id: recommendation.projectId },
      relations: ['members', 'members.user'],
    });

    if (!project) {
      this.logger.warn(`Project ${recommendation.projectId} not found for recommendation notification`);
      return;
    }

    // Notify project managers and admins
    const projectManagers = project.members
      .filter((m) => m.role === ProjectRole.PROJECT_MANAGER || m.role === ProjectRole.PROJECT_ADMIN)
      .map((m) => m.userId);

    for (const userId of projectManagers) {
      await this.createNotification({
        recommendationId: recommendation.id,
        userId,
        notificationType: AiNotificationType.RECOMMENDATION_HIGH_PRIORITY,
        subject: `⚠️ High Priority AI Recommendation: ${recommendation.title}`,
        body: `A high-priority AI recommendation has been created for project ${project.name}.\n\n${recommendation.description}\n\nPlease review and take action.`,
        metadata: {
          projectId: recommendation.projectId,
          projectName: project.name,
          organizationId: recommendation.organizationId,
          recommendationType: recommendation.type,
          priority: recommendation.priority,
          actionRequired: true,
        },
      });
    }

    this.logger.log(
      `Created high-priority recommendation notification for ${projectManagers.length} users (Project: ${project.name})`,
    );
  }

  /**
   * Notify user when recommendation is accepted
   *
   * @param recommendation - Recommendation entity
   * @param acceptedByUserId - User who accepted the recommendation
   */
  async notifyRecommendationAccepted(
    recommendation: Recommendation,
    acceptedByUserId: string,
  ): Promise<void> {
    // Get project
    const project = await this.projectRepository.findOne({
      where: { id: recommendation.projectId },
    });

    if (!project) return;

    // Notify organization admins
    // Note: Would need OrganizationMember entity to properly query org admins
    // For now, we'll skip this notification or use a simplified approach

    this.logger.log(`Recommendation ${recommendation.id} accepted by user ${acceptedByUserId}`);
  }

  /**
   * Notify user when recommendation is rejected
   *
   * @param recommendation - Recommendation entity
   * @param rejectedByUserId - User who rejected the recommendation
   * @param reason - Rejection reason
   */
  async notifyRecommendationRejected(
    recommendation: Recommendation,
    rejectedByUserId: string,
    reason?: string,
  ): Promise<void> {
    // Track rejection for analytics
    this.logger.log(
      `Recommendation ${recommendation.id} rejected by user ${rejectedByUserId}${reason ? `: ${reason}` : ''}`,
    );
  }

  /**
   * Notify user about pattern alert (e.g., cost overrun risk)
   *
   * @param userId - User to notify
   * @param projectId - Project ID
   * @param organizationId - Organization ID
   * @param patternType - Type of pattern detected
   * @param message - Alert message
   */
  async notifyPatternAlert(
    userId: string,
    projectId: string,
    organizationId: string,
    patternType: string,
    message: string,
  ): Promise<void> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    await this.createNotification({
      recommendationId: null,
      userId,
      notificationType: AiNotificationType.PATTERN_ALERT,
      subject: `⚠️ Pattern Alert: ${patternType}`,
      body: message,
      metadata: {
        projectId,
        projectName: project?.name,
        organizationId,
        patternType,
        actionRequired: true,
      },
    });
  }

  /**
   * Notify user about risk detected
   *
   * @param userId - User to notify
   * @param projectId - Project ID
   * @param organizationId - Organization ID
   * @param riskType - Type of risk
   * @param riskLevel - Risk level (LOW, MEDIUM, HIGH)
   * @param description - Risk description
   */
  async notifyRiskDetected(
    userId: string,
    projectId: string,
    organizationId: string,
    riskType: string,
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH',
    description: string,
  ): Promise<void> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    await this.createNotification({
      recommendationId: null,
      userId,
      notificationType: AiNotificationType.RISK_DETECTED,
      subject: `🚨 ${riskLevel} Risk Detected: ${riskType}`,
      body: description,
      metadata: {
        projectId,
        projectName: project?.name,
        organizationId,
        riskType,
        riskLevel,
        actionRequired: riskLevel === 'HIGH',
      },
    });
  }

  /**
   * Notify user about draft lesson learned
   *
   * @param userId - User to notify
   * @param projectId - Project ID
   * @param organizationId - Organization ID
   * @param lessonTitle - Lesson title
   * @param lessonDescription - Lesson description
   */
  async notifyLessonLearnedDraft(
    userId: string,
    projectId: string,
    organizationId: string,
    lessonTitle: string,
    lessonDescription: string,
  ): Promise<void> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    await this.createNotification({
      recommendationId: null,
      userId,
      notificationType: AiNotificationType.LESSON_LEARNED_DRAFT,
      subject: `📝 Draft Lesson Learned: ${lessonTitle}`,
      body: `A draft lesson learned has been created for your project.\n\n${lessonDescription}\n\nPlease review and complete the lesson details.`,
      metadata: {
        projectId,
        projectName: project?.name,
        organizationId,
        actionRequired: true,
      },
    });
  }

  /**
   * Send weekly AI digest to all active users
   * Runs every Monday at 8 AM
   */
  @Cron('0 8 * * 1', {
    name: 'weekly-ai-digest',
  })
  async sendWeeklyDigests(): Promise<void> {
    this.logger.log('Starting weekly AI digest generation...');

    try {
      // Get all project members
      const projectMembers = await this.projectMemberRepository.find({
        relations: ['project'],
      });

      // Group by user and organization
      const userOrgMap = new Map<string, Set<string>>();
      for (const member of projectMembers) {
        if (!userOrgMap.has(member.userId)) {
          userOrgMap.set(member.userId, new Set());
        }
        userOrgMap.get(member.userId)!.add(member.project.organizationId);
      }

      this.logger.log(`Found ${userOrgMap.size} users with project memberships for digest`);

      for (const [userId, organizationIds] of userOrgMap.entries()) {
        try {
          for (const organizationId of organizationIds) {
            const digest = await this.generateWeeklyDigest(userId, organizationId);

            if (digest.recommendations.total > 0 || digest.patterns.newAlerts > 0) {
              await this.sendDigestNotification(userId, digest);
            }
          }
        } catch (error: any) {
          this.logger.error(
            `Failed to generate digest for user ${userId}: ${error.message}`,
          );
        }
      }

      this.logger.log('Weekly AI digest generation completed');
    } catch (error: any) {
      this.logger.error(`Failed to send weekly digests: ${error.message}`, error.stack);
    }
  }

  /**
   * Generate weekly digest data for a user
   *
   * @private
   * @param userId - User ID
   * @param organizationId - Organization ID
   * @returns Weekly digest data
   */
  private async generateWeeklyDigest(
    userId: string,
    organizationId: string,
  ): Promise<WeeklyDigest> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Get recommendations from last week
    const recommendations = await this.recommendationRepository.find({
      where: {
        organizationId,
        createdAt: MoreThan(oneWeekAgo),
      },
    });

    const highPriority = recommendations.filter(
      (r) => r.priority === RecommendationPriority.HIGH,
    ).length;
    const pending = recommendations.filter(
      (r) => r.status === RecommendationStatus.PENDING,
    ).length;
    const accepted = recommendations.filter(
      (r) => r.status === RecommendationStatus.ACCEPTED,
    ).length;

    return {
      userId,
      organizationId,
      recommendations: {
        total: recommendations.length,
        highPriority,
        pending,
        accepted,
      },
      patterns: {
        newAlerts: 0, // Would need to track pattern alerts
        riskIndicators: 0, // Would need to track risk indicators
      },
      lessonsLearned: {
        newDrafts: 0, // Would need to track lesson drafts
      },
    };
  }

  /**
   * Send digest notification to user
   *
   * @private
   * @param userId - User ID
   * @param digest - Weekly digest data
   */
  private async sendDigestNotification(userId: string, digest: WeeklyDigest): Promise<void> {
    const summary = `
Weekly AI Insights Summary

📊 Recommendations:
- Total: ${digest.recommendations.total}
- High Priority: ${digest.recommendations.highPriority}
- Pending Review: ${digest.recommendations.pending}
- Accepted: ${digest.recommendations.accepted}

⚠️ Patterns & Risks:
- New Alerts: ${digest.patterns.newAlerts}
- Risk Indicators: ${digest.patterns.riskIndicators}

📝 Lessons Learned:
- New Drafts: ${digest.lessonsLearned.newDrafts}

View your full AI dashboard for detailed insights.
    `.trim();

    await this.createNotification({
      recommendationId: null,
      userId,
      notificationType: AiNotificationType.WEEKLY_DIGEST,
      subject: '📊 Weekly AI Insights Digest',
      body: summary,
      metadata: {
        organizationId: digest.organizationId,
        actionRequired: false,
      },
    });
  }

  /**
   * Create a notification record
   *
   * @private
   * @param data - Notification data
   * @returns Created notification
   */
  private async createNotification(data: {
    recommendationId: string | null;
    userId: string;
    notificationType: AiNotificationType;
    subject: string;
    body: string;
    metadata: Record<string, any>;
  }): Promise<AiNotification> {
    const deepLink = data.metadata.projectId
      ? `${this.appUrl}/projects/${data.metadata.projectId}/ai/recommendations${data.recommendationId ? `/${data.recommendationId}` : ''}`
      : `${this.appUrl}/ai/dashboard`;

    const notification = this.notificationRepository.create({
      ...data,
      status: NotificationStatus.PENDING,
      deepLink,
      bodyHtml: this.generateHtmlBody(data.subject, data.body, deepLink),
    });

    const saved = await this.notificationRepository.save(notification);

    // Send notification (email/push)
    await this.sendNotification(saved);

    return saved;
  }

  /**
   * Send notification via email/push
   *
   * @private
   * @param notification - Notification entity
   */
  private async sendNotification(notification: AiNotification): Promise<void> {
    try {
      // TODO: Integrate with actual email/push service (SendGrid, AWS SES, etc.)
      // For now, just mark as sent
      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();

      this.logger.log(`Notification sent: ${notification.subject} to user ${notification.userId}`);
    } catch (error) {
      notification.status = NotificationStatus.FAILED;
      notification.errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `Failed to send notification ${notification.id}: ${notification.errorMessage}`,
      );
    }

    await this.notificationRepository.save(notification);
  }

  /**
   * Generate HTML email body
   *
   * @private
   * @param subject - Email subject
   * @param textBody - Text body
   * @param deepLink - Deep link URL
   * @returns HTML body
   */
  private generateHtmlBody(subject: string, textBody: string, deepLink: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px 20px; text-align: center;">
      <h1 style="margin: 0; color: white; font-size: 24px;">🤖 Bob the Builder AI</h1>
    </div>

    <!-- Content -->
    <div style="padding: 30px 20px;">
      <h2 style="margin-top: 0; color: #1f2937; font-size: 20px;">${subject}</h2>
      <div style="color: #4b5563; line-height: 1.6; white-space: pre-wrap;">${textBody}</div>

      <div style="margin-top: 30px; text-align: center;">
        <a href="${deepLink}" style="
          display: inline-block;
          background-color: #2563eb;
          color: white;
          padding: 14px 32px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 16px;
        ">View Details</a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #6b7280; font-size: 14px;">
        Bob the Builder - AI-Powered Construction Management
      </p>
      <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 12px;">
        © ${new Date().getFullYear()} Bob the Builder. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Mark notification as read
   *
   * @param notificationId - Notification ID
   * @param userId - User ID (for authorization)
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    if (notification.status !== NotificationStatus.READ) {
      notification.status = NotificationStatus.READ;
      notification.readAt = new Date();
      await this.notificationRepository.save(notification);
    }
  }

  /**
   * Get user's notifications
   *
   * @param userId - User ID
   * @param unreadOnly - Return only unread notifications
   * @param limit - Maximum number of notifications to return
   * @returns List of notifications
   */
  async getUserNotifications(
    userId: string,
    unreadOnly: boolean = false,
    limit: number = 50,
  ): Promise<AiNotification[]> {
    const where: any = { userId };
    if (unreadOnly) {
      where.status = NotificationStatus.SENT;
    }

    return this.notificationRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['recommendation'],
    });
  }

  /**
   * Get unread notification count for user
   *
   * @param userId - User ID
   * @returns Number of unread notifications
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: {
        userId,
        status: NotificationStatus.SENT,
      },
    });
  }
}
