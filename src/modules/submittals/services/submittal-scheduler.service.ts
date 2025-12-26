import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { SubmittalWorkflowStep, WorkflowStepStatus } from '../entities/submittal-workflow-step.entity';
import { Submittal } from '../entities/submittal.entity';
import { ProjectSubmittalSettings } from '../entities/project-submittal-settings.entity';
import { SubmittalNotificationService } from './submittal-notification.service';
import { SubmittalLeadTimeService } from './submittal-lead-time.service';
import { SubmittalWorkflowService } from './submittal-workflow.service';

@Injectable()
export class SubmittalSchedulerService {
  private readonly logger = new Logger(SubmittalSchedulerService.name);

  constructor(
    @InjectRepository(SubmittalWorkflowStep)
    private readonly workflowStepRepository: Repository<SubmittalWorkflowStep>,
    @InjectRepository(Submittal)
    private readonly submittalRepository: Repository<Submittal>,
    @InjectRepository(ProjectSubmittalSettings)
    private readonly settingsRepository: Repository<ProjectSubmittalSettings>,
    private readonly notificationService: SubmittalNotificationService,
    private readonly leadTimeService: SubmittalLeadTimeService,
    private readonly workflowService: SubmittalWorkflowService,
  ) {}

  /**
   * Check for overdue workflow steps
   * Runs daily at 9 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkOverdueSteps(): Promise<void> {
    this.logger.log('Running scheduled task: Check overdue workflow steps');

    try {
      const now = new Date();

      // Find all active steps that are past their due date
      const overdueSteps = await this.workflowStepRepository.find({
        where: {
          status: WorkflowStepStatus.ACTIVE,
          dueDate: LessThan(now),
        },
        relations: ['submittal', 'submittal.project', 'assignedTo'],
      });

      this.logger.log(`Found ${overdueSteps.length} overdue workflow steps`);

      for (const step of overdueSteps) {
        // Check project settings to see if reminders are enabled
        const settings = await this.settingsRepository.findOne({
          where: { projectId: step.submittal.projectId },
        });

        if (!settings || !settings.sendOverdueReminders) {
          continue;
        }

        // Send overdue notification
        await this.notificationService.notifyOverdueStep(step);

        this.logger.log(
          `Sent overdue notification for step "${step.name}" in submittal ${step.submittal.number}`,
        );
      }

      this.logger.log('Completed overdue steps check');
    } catch (error) {
      this.logger.error('Error checking overdue steps:', error);
    }
  }

  /**
   * Check for lead time warnings
   * Runs daily at 8 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkLeadTimeWarnings(): Promise<void> {
    this.logger.log('Running scheduled task: Check lead time warnings');

    try {
      // Get all active projects
      const submittals = await this.submittalRepository.find({
        relations: ['project'],
      });

      // Group by project
      const projectIds = [...new Set(submittals.map((s) => s.projectId))];

      let totalWarnings = 0;

      for (const projectId of projectIds) {
        // Check project settings
        const settings = await this.settingsRepository.findOne({
          where: { projectId },
        });

        if (!settings || !settings.sendLeadTimeWarnings) {
          continue;
        }

        // Get lead time warnings for this project
        const warnings = await this.leadTimeService.checkLeadTimeWarnings(projectId);

        for (const warning of warnings) {
          // Only send notifications for HIGH and CRITICAL severity
          if (warning.severity === 'HIGH' || warning.severity === 'CRITICAL') {
            await this.notificationService.notifyLeadTimeWarning(
              warning.submittal,
              warning.daysUntilDue,
            );

            totalWarnings++;

            this.logger.log(
              `Sent lead time warning for submittal ${warning.submittal.number} (${warning.severity})`,
            );
          }
        }
      }

      this.logger.log(`Completed lead time check: ${totalWarnings} warnings sent`);
    } catch (error) {
      this.logger.error('Error checking lead time warnings:', error);
    }
  }

  /**
   * Auto-apply workflow templates to new submittals
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async autoApplyWorkflowTemplates(): Promise<void> {
    this.logger.log('Running scheduled task: Auto-apply workflow templates');

    try {
      // Find submittals in DRAFT status without workflows
      const submittalsWithoutWorkflow = await this.submittalRepository
        .createQueryBuilder('submittal')
        .leftJoinAndSelect('submittal.workflowSteps', 'workflowSteps')
        .leftJoinAndSelect('submittal.project', 'project')
        .where('submittal.status = :status', { status: 'DRAFT' })
        .andWhere(
          (qb) => {
            const subQuery = qb
              .subQuery()
              .select('1')
              .from(SubmittalWorkflowStep, 'step')
              .where('step.submittalId = submittal.id')
              .getQuery();
            return `NOT EXISTS ${subQuery}`;
          },
        )
        .getMany();

      this.logger.log(
        `Found ${submittalsWithoutWorkflow.length} submittals without workflows`,
      );

      let appliedCount = 0;

      for (const submittal of submittalsWithoutWorkflow) {
        // Check project settings for auto-apply
        const settings = await this.settingsRepository.findOne({
          where: { projectId: submittal.projectId },
        });

        // If default template is set, apply it
        if (settings?.defaultWorkflowTemplateId) {
          try {
            await this.workflowService.applyTemplateToSubmittal(
              submittal.id,
              settings.defaultWorkflowTemplateId,
            );

            appliedCount++;

            this.logger.log(
              `Auto-applied workflow template to submittal ${submittal.number}`,
            );
          } catch (error) {
            this.logger.error(
              `Failed to auto-apply template to submittal ${submittal.number}:`,
              error,
            );
          }
        } else {
          // Try to find applicable template based on submittal type and spec section
          const template = await this.workflowService.findApplicableTemplate(
            submittal.projectId,
            submittal.submittalType,
            submittal.specSection,
          );

          if (template && template.autoApply) {
            try {
              await this.workflowService.applyTemplateToSubmittal(
                submittal.id,
                template.id,
              );

              appliedCount++;

              this.logger.log(
                `Auto-applied workflow template "${template.name}" to submittal ${submittal.number}`,
              );
            } catch (error) {
              this.logger.error(
                `Failed to auto-apply template to submittal ${submittal.number}:`,
                error,
              );
            }
          }
        }
      }

      this.logger.log(
        `Completed auto-apply workflow templates: ${appliedCount} applied`,
      );
    } catch (error) {
      this.logger.error('Error auto-applying workflow templates:', error);
    }
  }

  /**
   * Generate daily submittal summary reports
   * Runs daily at 6 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async generateDailySummary(): Promise<void> {
    this.logger.log('Running scheduled task: Generate daily submittal summary');

    try {
      // Get all active projects
      const submittals = await this.submittalRepository.find({
        relations: ['project'],
      });

      const projectIds = [...new Set(submittals.map((s) => s.projectId))];

      for (const projectId of projectIds) {
        const settings = await this.settingsRepository.findOne({
          where: { projectId },
        });

        if (!settings || !settings.sendDailySummary) {
          continue;
        }

        // Get summary data
        const projectSubmittals = submittals.filter((s) => s.projectId === projectId);
        const activeSteps = await this.workflowStepRepository.count({
          where: {
            status: WorkflowStepStatus.ACTIVE,
          },
          relations: ['submittal'],
        });

        const overdueSteps = await this.workflowStepRepository.count({
          where: {
            status: WorkflowStepStatus.ACTIVE,
            dueDate: LessThan(new Date()),
          },
          relations: ['submittal'],
        });

        const leadTimeWarnings =
          await this.leadTimeService.getCriticalSubmittals(projectId);

        // TODO: Send daily summary email to project managers
        this.logger.log(
          `Daily summary for project ${projectId}: ` +
            `${projectSubmittals.length} submittals, ` +
            `${activeSteps} active steps, ` +
            `${overdueSteps} overdue, ` +
            `${leadTimeWarnings.length} critical`,
        );
      }

      this.logger.log('Completed daily summary generation');
    } catch (error) {
      this.logger.error('Error generating daily summary:', error);
    }
  }

  /**
   * Cleanup old notifications
   * Runs weekly on Sunday at midnight
   */
  @Cron(CronExpression.EVERY_WEEK)
  async cleanupOldNotifications(): Promise<void> {
    this.logger.log('Running scheduled task: Cleanup old notifications');

    try {
      // TODO: Implement notification cleanup
      // Delete read notifications older than 90 days
      // Archive important notifications

      this.logger.log('Completed notification cleanup');
    } catch (error) {
      this.logger.error('Error cleaning up notifications:', error);
    }
  }

  /**
   * Manual trigger for overdue check (for testing)
   */
  async triggerOverdueCheck(): Promise<{ overdueCount: number; notificationsSent: number }> {
    this.logger.log('Manual trigger: Overdue check');

    const now = new Date();

    const overdueSteps = await this.workflowStepRepository.find({
      where: {
        status: WorkflowStepStatus.ACTIVE,
        dueDate: LessThan(now),
      },
      relations: ['submittal', 'submittal.project', 'assignedTo'],
    });

    let notificationsSent = 0;

    for (const step of overdueSteps) {
      const settings = await this.settingsRepository.findOne({
        where: { projectId: step.submittal.projectId },
      });

      if (settings?.sendOverdueReminders) {
        await this.notificationService.notifyOverdueStep(step);
        notificationsSent++;
      }
    }

    return {
      overdueCount: overdueSteps.length,
      notificationsSent,
    };
  }

  /**
   * Manual trigger for lead time warnings (for testing)
   */
  async triggerLeadTimeWarnings(
    projectId: string,
  ): Promise<{ warningsFound: number; notificationsSent: number }> {
    this.logger.log(`Manual trigger: Lead time warnings for project ${projectId}`);

    const warnings = await this.leadTimeService.checkLeadTimeWarnings(projectId);

    let notificationsSent = 0;

    const settings = await this.settingsRepository.findOne({
      where: { projectId },
    });

    if (settings?.sendLeadTimeWarnings) {
      for (const warning of warnings) {
        if (warning.severity === 'HIGH' || warning.severity === 'CRITICAL') {
          await this.notificationService.notifyLeadTimeWarning(
            warning.submittal,
            warning.daysUntilDue,
          );
          notificationsSent++;
        }
      }
    }

    return {
      warningsFound: warnings.length,
      notificationsSent,
    };
  }
}
