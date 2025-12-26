import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { SubmittalNotification, SubmittalNotificationType, NotificationStatus } from '../entities/submittal-notification.entity';
import { Submittal } from '../entities/submittal.entity';
import { SubmittalWorkflowStep } from '../entities/submittal-workflow-step.entity';
import { ApprovalStamp } from '../entities/submittal-response.entity';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class SubmittalNotificationService {
  private readonly logger = new Logger(SubmittalNotificationService.name);
  private readonly appUrl: string;

  constructor(
    @InjectRepository(SubmittalNotification)
    private readonly notificationRepository: Repository<SubmittalNotification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {
    this.appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
  }

  async notifyStepActivated(step: SubmittalWorkflowStep): Promise<void> {
    if (!step.assignedToId) return;

    await this.createNotification({
      submittalId: step.submittalId,
      userId: step.assignedToId,
      notificationType: SubmittalNotificationType.REVIEW_ASSIGNED,
      subject: `Review Assigned: ${step.submittal?.number || 'Submittal'}`,
      body: `You have been assigned to review step "${step.name}". Please complete by ${this.formatDate(step.dueDate)}.`,
      metadata: {
        submittalNumber: step.submittal?.number,
        stepName: step.name,
        actionRequired: true,
      },
    });
  }

  async notifyStepCompleted(step: SubmittalWorkflowStep, stamp: ApprovalStamp): Promise<void> {
    // Notify submittal creator
    if (step.submittal?.createdById) {
      await this.createNotification({
        submittalId: step.submittalId,
        userId: step.submittal.createdById,
        notificationType: this.getNotificationTypeForStamp(stamp),
        subject: `Submittal ${stamp}: ${step.submittal.number}`,
        body: `Step "${step.name}" has been completed with action: ${stamp}.`,
        metadata: {
          submittalNumber: step.submittal.number,
          stepName: step.name,
          actionRequired: stamp === ApprovalStamp.REVISE_AND_RESUBMIT,
        },
      });
    }
  }

  async notifyStepReassigned(
    step: SubmittalWorkflowStep,
    previousAssigneeId: string | null,
    reason?: string,
  ): Promise<void> {
    // Notify new assignee
    if (step.assignedToId) {
      await this.createNotification({
        submittalId: step.submittalId,
        userId: step.assignedToId,
        notificationType: SubmittalNotificationType.REVIEW_ASSIGNED,
        subject: `Review Reassigned to You: ${step.submittal?.number || 'Submittal'}`,
        body: `You have been assigned to review step "${step.name}".${reason ? ` Reason: ${reason}` : ''}`,
        metadata: {
          submittalNumber: step.submittal?.number,
          stepName: step.name,
          actionRequired: true,
        },
      });
    }

    // Notify previous assignee
    if (previousAssigneeId) {
      await this.createNotification({
        submittalId: step.submittalId,
        userId: previousAssigneeId,
        notificationType: SubmittalNotificationType.WORKFLOW_STEP_COMPLETE,
        subject: `Review Reassigned: ${step.submittal?.number || 'Submittal'}`,
        body: `Step "${step.name}" has been reassigned to another reviewer.`,
        metadata: {
          submittalNumber: step.submittal?.number,
          stepName: step.name,
          actionRequired: false,
        },
      });
    }
  }

  async notifySubmittalApproved(submittal: Submittal): Promise<void> {
    const recipients = [
      submittal.createdById,
      submittal.preparedById,
      submittal.submittalManagerId,
      ...submittal.distributionList,
    ].filter(Boolean);

    for (const userId of [...new Set(recipients)]) {
      await this.createNotification({
        submittalId: submittal.id,
        userId: userId!,
        notificationType: submittal.status === 'APPROVED'
          ? SubmittalNotificationType.SUBMITTAL_APPROVED
          : SubmittalNotificationType.SUBMITTAL_APPROVED_AS_NOTED,
        subject: `Submittal Approved: ${submittal.number} - ${submittal.title}`,
        body: `Submittal ${submittal.number} has been approved${submittal.approvalConditions ? ' with conditions' : ''}.`,
        metadata: {
          submittalNumber: submittal.number,
          revisionNumber: submittal.currentRevision,
          actionRequired: false,
        },
      });
    }
  }

  async notifyOverdueStep(step: SubmittalWorkflowStep): Promise<void> {
    if (!step.assignedToId) return;

    await this.createNotification({
      submittalId: step.submittalId,
      userId: step.assignedToId,
      notificationType: SubmittalNotificationType.REVIEW_OVERDUE,
      subject: `⚠️ OVERDUE: Review for ${step.submittal?.number || 'Submittal'}`,
      body: `Your review of step "${step.name}" is overdue. Original due date was ${this.formatDate(step.dueDate)}.`,
      metadata: {
        submittalNumber: step.submittal?.number,
        stepName: step.name,
        actionRequired: true,
      },
    });
  }

  async notifyLeadTimeWarning(
    submittal: Submittal,
    daysUntilDue: number,
  ): Promise<void> {
    const recipients = [
      submittal.submittalManagerId,
      submittal.createdById,
    ].filter(Boolean);

    for (const userId of [...new Set(recipients)]) {
      await this.createNotification({
        submittalId: submittal.id,
        userId: userId!,
        notificationType: SubmittalNotificationType.LEAD_TIME_WARNING,
        subject: `⚠️ Lead Time Warning: ${submittal.number}`,
        body: `Submittal ${submittal.number} is at risk of missing its required on-site date. Only ${daysUntilDue} days remain.`,
        metadata: {
          submittalNumber: submittal.number,
          actionRequired: true,
        },
      });
    }
  }

  private async createNotification(data: {
    submittalId: string;
    userId: string;
    notificationType: SubmittalNotificationType;
    subject: string;
    body: string;
    metadata: Record<string, any>;
  }): Promise<SubmittalNotification> {
    const deepLink = `${this.appUrl}/projects/${data.metadata.projectId}/submittals/${data.submittalId}`;

    const notification = this.notificationRepository.create({
      ...data,
      status: NotificationStatus.PENDING,
      deepLink,
      bodyHtml: this.generateHtmlBody(data.body, deepLink),
    });

    const saved = await this.notificationRepository.save(notification);

    // TODO: Send actual email/push notification
    await this.sendNotification(saved);

    return saved;
  }

  private async sendNotification(notification: SubmittalNotification): Promise<void> {
    try {
      // Integrate with email/push service
      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();
    } catch (error) {
      notification.status = NotificationStatus.FAILED;
      notification.errorMessage = error instanceof Error ? error.message : 'Unknown error';
    }

    await this.notificationRepository.save(notification);
  }

  private getNotificationTypeForStamp(stamp: ApprovalStamp): SubmittalNotificationType {
    switch (stamp) {
      case ApprovalStamp.APPROVED:
        return SubmittalNotificationType.SUBMITTAL_APPROVED;
      case ApprovalStamp.APPROVED_AS_NOTED:
      case ApprovalStamp.APPROVED_AS_NOTED_RESUBMIT:
        return SubmittalNotificationType.SUBMITTAL_APPROVED_AS_NOTED;
      case ApprovalStamp.REJECTED:
        return SubmittalNotificationType.SUBMITTAL_REJECTED;
      case ApprovalStamp.REVISE_AND_RESUBMIT:
        return SubmittalNotificationType.REVISE_RESUBMIT;
      default:
        return SubmittalNotificationType.WORKFLOW_STEP_COMPLETE;
    }
  }

  private generateHtmlBody(textBody: string, deepLink: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>${textBody.replace(/\n/g, '<br>')}</p>
        <p style="margin-top: 20px;">
          <a href="${deepLink}" style="
            background-color: #2563eb;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            display: inline-block;
          ">View Submittal</a>
        </p>
      </div>
    `;
  }

  private formatDate(date: Date | null): string {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
