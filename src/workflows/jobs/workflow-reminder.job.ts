import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { SubmittalReviewer, ReviewerStatus } from '../entities/submittal-reviewer.entity';
import { DocumentApproval, ApprovalStatus } from '../entities/document-approval.entity';

/**
 * Workflow Reminder Job
 *
 * Sends reminder notifications for overdue reviews and approvals.
 *
 * Schedule: Daily at 9am
 *
 * Functionality:
 * - Find overdue submittal reviews
 * - Find overdue document approvals
 * - Send reminder emails (placeholder)
 * - Track reminder counts
 */
@Injectable()
export class WorkflowReminderJob {
  private readonly logger = new Logger(WorkflowReminderJob.name);

  constructor(
    @InjectRepository(SubmittalReviewer)
    private readonly reviewerRepo: Repository<SubmittalReviewer>,
    @InjectRepository(DocumentApproval)
    private readonly approvalRepo: Repository<DocumentApproval>,
  ) {}

  /**
   * Send daily reminders
   *
   * Runs every day at 9am
   */
  @Cron('0 9 * * *')
  async sendReminders() {
    this.logger.log('Processing workflow reminders...');

    try {
      const startTime = Date.now();

      // Process submittal reviewer reminders
      const overdueReviewers = await this.findOverdueReviewers();
      await this.sendReviewerReminders(overdueReviewers);

      // Process approval reminders
      const overdueApprovals = await this.findOverdueApprovals();
      await this.sendApprovalReminders(overdueApprovals);

      const duration = Date.now() - startTime;
      this.logger.log(
        `Reminder processing completed: ${overdueReviewers.length} reviewer reminders, ${overdueApprovals.length} approval reminders (${duration}ms)`,
      );
    } catch (error) {
      this.logger.error('Reminder processing error:', error);
    }
  }

  /**
   * Find overdue reviewers
   */
  private async findOverdueReviewers(): Promise<SubmittalReviewer[]> {
    const now = new Date();

    return this.reviewerRepo.find({
      where: [
        {
          status: ReviewerStatus.PENDING,
          dueDate: LessThan(now),
          isOverdue: false, // Not yet marked
        },
        {
          status: ReviewerStatus.IN_PROGRESS,
          dueDate: LessThan(now),
          isOverdue: false,
        },
      ],
    });
  }

  /**
   * Find overdue approvals
   */
  private async findOverdueApprovals(): Promise<DocumentApproval[]> {
    const now = new Date();

    return this.approvalRepo.find({
      where: [
        {
          status: ApprovalStatus.PENDING,
          dueDate: LessThan(now),
          isOverdue: false,
        },
        {
          status: ApprovalStatus.IN_REVIEW,
          dueDate: LessThan(now),
          isOverdue: false,
        },
      ],
    });
  }

  /**
   * Send reminders to reviewers
   */
  private async sendReviewerReminders(
    reviewers: SubmittalReviewer[],
  ): Promise<void> {
    let successCount = 0;
    let errorCount = 0;

    for (const reviewer of reviewers) {
      try {
        // Check if reminder should be sent (based on interval)
        if (!reviewer.shouldSendReminder(3)) {
          continue;
        }

        // TODO: Send actual email notification
        // await this.emailService.sendReviewerReminder(reviewer);

        this.logger.log(
          `Reminder sent to reviewer ${reviewer.userName} for submittal ${reviewer.submittalId}`,
        );

        // Update reminder tracking
        reviewer.remindersSent += 1;
        reviewer.lastReminderSentAt = new Date();
        reviewer.isOverdue = true;

        await this.reviewerRepo.save(reviewer);
        successCount++;
      } catch (error) {
        this.logger.error(
          `Failed to send reminder to reviewer ${reviewer.id}:`,
          error,
        );
        errorCount++;
      }
    }

    this.logger.log(
      `Reviewer reminders: ${successCount} sent, ${errorCount} failed`,
    );
  }

  /**
   * Send reminders for approvals
   */
  private async sendApprovalReminders(
    approvals: DocumentApproval[],
  ): Promise<void> {
    let successCount = 0;
    let errorCount = 0;

    for (const approval of approvals) {
      try {
        // TODO: Send actual email notification
        // await this.emailService.sendApprovalReminder(approval);

        this.logger.log(
          `Reminder sent for approval ${approval.id} to ${approval.approverName}`,
        );

        // Update reminder tracking
        approval.remindersSent += 1;
        approval.lastReminderSentAt = new Date();
        approval.isOverdue = true;

        await this.approvalRepo.save(approval);
        successCount++;
      } catch (error) {
        this.logger.error(
          `Failed to send reminder for approval ${approval.id}:`,
          error,
        );
        errorCount++;
      }
    }

    this.logger.log(
      `Approval reminders: ${successCount} sent, ${errorCount} failed`,
    );
  }
}
