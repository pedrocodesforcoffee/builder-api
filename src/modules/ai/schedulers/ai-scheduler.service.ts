/**
 * AI Scheduler Service
 * Automated AI tasks: daily health reports, weekly summaries, cache cleanup
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ProjectIntelligenceService } from '../services/project-intelligence.service';
import { AiCacheService } from '../services/ai-cache.service';
import { AiCostTrackingService } from '../services/ai-cost-tracking.service';
import { PatternCalculatorService } from '../services/pattern-calculator.service';
import { Project } from '../../projects/entities/project.entity';
import { ProjectStatus } from '../../projects/enums/project-status.enum';
import { Organization } from '../../organizations/entities/organization.entity';

@Injectable()
export class AiSchedulerService {
  private readonly logger = new Logger(AiSchedulerService.name);

  constructor(
    private projectIntelligence: ProjectIntelligenceService,
    private cacheService: AiCacheService,
    private costTracking: AiCostTrackingService,
    private patternCalculator: PatternCalculatorService,
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    @InjectRepository(Organization)
    private organizationRepo: Repository<Organization>,
  ) {}

  /**
   * Daily Health Reports
   * Runs every day at 7:00 AM
   */
  @Cron('0 7 * * *', {
    name: 'daily-health-reports',
    timeZone: 'America/Los_Angeles',
  })
  async generateDailyHealthReports() {
    this.logger.log('Starting daily health report generation...');

    try {
      // Get all active projects (Preconstruction, Construction, Closeout)
      const activeProjects = await this.projectRepo.find({
        where: {
          status: In([
            ProjectStatus.PRECONSTRUCTION,
            ProjectStatus.CONSTRUCTION,
            ProjectStatus.CLOSEOUT,
          ]),
        },
        select: ['id', 'name'],
      });

      this.logger.log(`Found ${activeProjects.length} active projects`);

      let successCount = 0;
      let failureCount = 0;

      for (const project of activeProjects) {
        try {
          // Generate health report
          // Use a system user ID for automated tasks
          const systemUserId = 'system';

          const report = await this.projectIntelligence.generateDailyHealthReport(
            project.id,
            systemUserId,
          );

          this.logger.log(
            `Generated daily health report for project ${project.name}: Health score ${report.healthScore.overallScore}/100`,
          );

          // Here you could:
          // 1. Send email notifications to project managers
          // 2. Store reports in database
          // 3. Trigger WebSocket notifications
          // 4. Send Slack/Teams notifications

          successCount++;
        } catch (error: any) {
          this.logger.error(
            `Failed to generate health report for project ${project.name}: ${error.message}`,
          );
          failureCount++;
        }
      }

      this.logger.log(
        `Daily health report generation completed: ${successCount} successful, ${failureCount} failed`,
      );
    } catch (error: any) {
      this.logger.error(
        `Daily health report generation failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Weekly Project Summaries
   * Runs every Monday at 8:00 AM
   */
  @Cron('0 8 * * 1', {
    name: 'weekly-project-summaries',
    timeZone: 'America/Los_Angeles',
  })
  async generateWeeklyProjectSummaries() {
    this.logger.log('Starting weekly project summary generation...');

    try {
      const activeProjects = await this.projectRepo.find({
        where: {
          status: In([
            ProjectStatus.PRECONSTRUCTION,
            ProjectStatus.CONSTRUCTION,
            ProjectStatus.CLOSEOUT,
          ]),
        },
        select: ['id', 'name'],
      });

      this.logger.log(`Generating weekly summaries for ${activeProjects.length} projects`);

      for (const project of activeProjects) {
        try {
          const systemUserId = 'system';

          // Generate comprehensive trends over last 7 days
          const trends = await this.projectIntelligence.monitorTrends(
            project.id,
            systemUserId,
            7,
          );

          // Get alerts
          const alerts = await this.projectIntelligence.getProjectAlerts(
            project.id,
            systemUserId,
          );

          const criticalAlerts = alerts.filter((a) => a.severity === 'critical');

          this.logger.log(
            `Weekly summary for ${project.name}: ${trends.patterns.patterns.length} patterns, ${criticalAlerts.length} critical alerts`,
          );

          // Here you could:
          // 1. Send weekly summary emails
          // 2. Generate PDF reports
          // 3. Post to Slack/Teams
          // 4. Store in database for historical tracking
        } catch (error: any) {
          this.logger.error(
            `Failed to generate weekly summary for project ${project.name}: ${error.message}`,
          );
        }
      }

      this.logger.log('Weekly project summary generation completed');
    } catch (error: any) {
      this.logger.error(
        `Weekly summary generation failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Monthly Cost Analysis
   * Runs on the 1st of each month at 9:00 AM
   */
  @Cron('0 9 1 * *', {
    name: 'monthly-cost-analysis',
    timeZone: 'America/Los_Angeles',
  })
  async generateMonthlyCostAnalysis() {
    this.logger.log('Starting monthly AI cost analysis...');

    try {
      const activeProjects = await this.projectRepo.find({
        where: {
          status: In([
            ProjectStatus.PRECONSTRUCTION,
            ProjectStatus.CONSTRUCTION,
            ProjectStatus.CLOSEOUT,
          ]),
        },
        select: ['id', 'name'],
      });

      // Calculate date range for last month
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      let totalCost = 0;
      const projectCosts: Array<{ projectId: string; projectName: string; cost: number }> = [];

      for (const project of activeProjects) {
        try {
          const costSummary = await this.costTracking.getCostSummary(
            project.id,
            'monthly',
            startDate,
            endDate,
          );

          totalCost += costSummary.totalCost;

          projectCosts.push({
            projectId: project.id,
            projectName: project.name,
            cost: costSummary.totalCost,
          });

          this.logger.log(
            `Project ${project.name}: $${costSummary.totalCost.toFixed(2)} (${costSummary.totalOperations} operations)`,
          );
        } catch (error: any) {
          this.logger.error(
            `Failed to get cost summary for project ${project.name}: ${error.message}`,
          );
        }
      }

      // Sort by cost descending
      projectCosts.sort((a, b) => b.cost - a.cost);

      this.logger.log(
        `Monthly AI cost analysis complete: Total cost: $${totalCost.toFixed(2)} across ${projectCosts.length} projects`,
      );

      // Here you could:
      // 1. Send cost reports to finance team
      // 2. Trigger budget alerts if thresholds exceeded
      // 3. Generate cost optimization recommendations
      // 4. Update organization-level AI budgets
    } catch (error: any) {
      this.logger.error(
        `Monthly cost analysis failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Cache Cleanup
   * Runs every day at 2:00 AM
   */
  @Cron('0 2 * * *', {
    name: 'cache-cleanup',
    timeZone: 'America/Los_Angeles',
  })
  async cleanupExpiredCache() {
    this.logger.log('Starting AI cache cleanup...');

    try {
      const deletedCount = await this.cacheService.cleanupExpired();

      this.logger.log(`Cache cleanup completed: ${deletedCount} expired entries removed`);
    } catch (error: any) {
      this.logger.error(
        `Cache cleanup failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Operation Log Cleanup
   * Runs on the 1st of each month at 3:00 AM
   */
  @Cron('0 3 1 * *', {
    name: 'operation-log-cleanup',
    timeZone: 'America/Los_Angeles',
  })
  async cleanupOldOperationLogs() {
    this.logger.log('Starting operation log cleanup...');

    try {
      // Keep logs for 90 days
      const deletedCount = await this.costTracking.cleanupOldLogs(90);

      this.logger.log(
        `Operation log cleanup completed: ${deletedCount} old logs removed`,
      );
    } catch (error: any) {
      this.logger.error(
        `Operation log cleanup failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Cache Statistics Report
   * Runs every day at 11:00 PM
   */
  @Cron('0 23 * * *', {
    name: 'cache-statistics',
    timeZone: 'America/Los_Angeles',
  })
  async generateCacheStatistics() {
    this.logger.log('Generating cache statistics...');

    try {
      const stats = await this.cacheService.getCacheStats();

      const avgHitRate =
        stats.totalEntries > 0
          ? (stats.totalHits / stats.totalEntries).toFixed(2)
          : '0.00';

      this.logger.log(
        `Cache stats: ${stats.totalEntries} entries, ${stats.totalHits} total hits, ${avgHitRate} avg hits/entry`,
      );

      // Log by operation type
      for (const opStat of stats.byOperationType) {
        this.logger.log(
          `  ${opStat.operationType}: ${opStat.count} entries, ${opStat.totalHits} hits`,
        );
      }

      // Here you could:
      // 1. Store stats in analytics database
      // 2. Trigger cache warming for popular operations
      // 3. Alert if cache hit rate is too low
    } catch (error: any) {
      this.logger.error(
        `Cache statistics generation failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Budget Alert Check
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR, {
    name: 'budget-alert-check',
  })
  async checkBudgetAlerts() {
    this.logger.debug('Checking AI budget limits...');

    try {
      const activeProjects = await this.projectRepo.find({
        where: {
          status: In([
            ProjectStatus.PRECONSTRUCTION,
            ProjectStatus.CONSTRUCTION,
            ProjectStatus.CLOSEOUT,
          ]),
        },
        select: ['id', 'name'],
      });

      for (const project of activeProjects) {
        try {
          const budgetCheck = await this.costTracking.checkBudgetLimits(project.id);

          if (!budgetCheck.withinLimits) {
            this.logger.warn(
              `Budget alert for project ${project.name}: Daily limit: ${budgetCheck.dailyLimitReached}, Monthly limit: ${budgetCheck.monthlyLimitReached}, Cost alert: ${budgetCheck.costAlertThresholdReached}`,
            );

            // Here you could:
            // 1. Send email alerts to project managers
            // 2. Disable AI features temporarily
            // 3. Send Slack notifications
            // 4. Create support tickets
          }
        } catch (error: any) {
          this.logger.error(
            `Failed to check budget for project ${project.name}: ${error.message}`,
          );
        }
      }
    } catch (error: any) {
      this.logger.error(
        `Budget alert check failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Weekly Pattern Calculation
   * Runs every Sunday at 2:00 AM
   * Calculates organizational patterns for all active organizations
   */
  @Cron('0 2 * * 0', {
    name: 'weekly-pattern-calculation',
    timeZone: 'America/Los_Angeles',
  })
  async calculateWeeklyPatterns() {
    this.logger.log('Starting weekly pattern calculation...');

    try {
      // Get all organizations that have completed projects
      const organizations = await this.organizationRepo.find({
        select: ['id', 'name'],
      });

      this.logger.log(`Found ${organizations.length} organizations to process`);

      let successCount = 0;
      let failureCount = 0;

      for (const org of organizations) {
        try {
          this.logger.log(`Calculating patterns for organization: ${org.name}`);

          await this.patternCalculator.calculateOrganizationPatterns(org.id);

          successCount++;
          this.logger.log(`✓ Patterns calculated successfully for ${org.name}`);
        } catch (error: any) {
          this.logger.error(
            `Failed to calculate patterns for organization ${org.name}: ${error.message}`,
            error.stack,
          );
          failureCount++;
        }
      }

      this.logger.log(
        `Weekly pattern calculation completed: ${successCount} successful, ${failureCount} failed`,
      );

      // Cleanup old patterns (older than 90 days)
      const deletedCount = await this.patternCalculator.cleanupOldPatterns();
      this.logger.log(`Cleaned up ${deletedCount} old pattern records`);
    } catch (error: any) {
      this.logger.error(
        `Weekly pattern calculation failed: ${error.message}`,
        error.stack,
      );
    }
  }
}
