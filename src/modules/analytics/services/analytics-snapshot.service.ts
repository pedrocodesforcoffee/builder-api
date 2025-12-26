import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AnalyticsSnapshot, SnapshotType, SnapshotCategory } from '../entities/analytics-snapshot.entity';
import { Project } from '../../projects/entities/project.entity';
import { ProjectStatus } from '../../projects/enums/project-status.enum';
import { RfiAnalyticsService } from './rfi-analytics.service';
import { SubmittalAnalyticsService } from './submittal-analytics.service';

@Injectable()
export class AnalyticsSnapshotService {
  private readonly logger = new Logger(AnalyticsSnapshotService.name);

  constructor(
    @InjectRepository(AnalyticsSnapshot)
    private readonly snapshotRepository: Repository<AnalyticsSnapshot>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly rfiAnalyticsService: RfiAnalyticsService,
    private readonly submittalAnalyticsService: SubmittalAnalyticsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async createDailySnapshots(): Promise<void> {
    this.logger.log('Creating daily analytics snapshots...');

    const projects = await this.projectRepository.find({
      where: {
        status: In([ProjectStatus.PRECONSTRUCTION, ProjectStatus.CONSTRUCTION, ProjectStatus.CLOSEOUT])
      },
    });

    for (const project of projects) {
      try {
        await this.createSnapshot(project.id, project.organizationId, SnapshotType.DAILY);
      } catch (error) {
        this.logger.error(`Failed to create snapshot for project ${project.id}`, error);
      }
    }

    this.logger.log(`Created daily snapshots for ${projects.length} projects`);
  }

  @Cron('0 0 * * 0') // Every Sunday at midnight
  async createWeeklySnapshots(): Promise<void> {
    this.logger.log('Creating weekly analytics snapshots...');

    const projects = await this.projectRepository.find({
      where: {
        status: In([ProjectStatus.PRECONSTRUCTION, ProjectStatus.CONSTRUCTION, ProjectStatus.CLOSEOUT])
      },
    });

    for (const project of projects) {
      try {
        await this.createSnapshot(project.id, project.organizationId, SnapshotType.WEEKLY);
      } catch (error) {
        this.logger.error(`Failed to create weekly snapshot for project ${project.id}`, error);
      }
    }
  }

  @Cron('0 0 1 * *') // First day of each month at midnight
  async createMonthlySnapshots(): Promise<void> {
    this.logger.log('Creating monthly analytics snapshots...');

    const projects = await this.projectRepository.find({
      where: {
        status: In([ProjectStatus.PRECONSTRUCTION, ProjectStatus.CONSTRUCTION, ProjectStatus.CLOSEOUT])
      },
    });

    for (const project of projects) {
      try {
        await this.createSnapshot(project.id, project.organizationId, SnapshotType.MONTHLY);
      } catch (error) {
        this.logger.error(`Failed to create monthly snapshot for project ${project.id}`, error);
      }
    }
  }

  async createSnapshot(
    projectId: string,
    organizationId: string,
    snapshotType: SnapshotType,
  ): Promise<AnalyticsSnapshot> {
    const [rfiAnalytics, submittalAnalytics] = await Promise.all([
      this.rfiAnalyticsService.getAnalytics(projectId, {}),
      this.submittalAnalyticsService.getAnalytics(projectId, {}),
    ]);

    const snapshot = this.snapshotRepository.create({
      projectId,
      organizationId,
      snapshotType,
      category: SnapshotCategory.COMBINED,
      snapshotDate: new Date(),
      rfiMetrics: {
        total: rfiAnalytics.statusSummary.total,
        byStatus: {
          DRAFT: rfiAnalytics.statusSummary.draft,
          OPEN: rfiAnalytics.statusSummary.open,
          ANSWERED: rfiAnalytics.statusSummary.answered,
          CLOSED: rfiAnalytics.statusSummary.closed,
          VOID: rfiAnalytics.statusSummary.void,
        },
        byPriority: rfiAnalytics.byPriority,
        byDiscipline: rfiAnalytics.byDiscipline.reduce((acc, d) => {
          acc[d.discipline] = d.total;
          return acc;
        }, {} as Record<string, number>),
        open: rfiAnalytics.statusSummary.open,
        closed: rfiAnalytics.statusSummary.closed,
        overdue: rfiAnalytics.statusSummary.overdue,
        avgResponseDays: rfiAnalytics.responseTimeMetrics.averageDays,
        medianResponseDays: rfiAnalytics.responseTimeMetrics.medianDays,
        totalCostImpact: rfiAnalytics.impactSummary.totalEstimatedCost,
        totalScheduleImpactDays: rfiAnalytics.impactSummary.totalScheduleImpactDays,
        createdThisPeriod: 0, // Would need to track
        closedThisPeriod: 0,
        ballInCourtDistribution: rfiAnalytics.ballInCourt,
      },
      submittalMetrics: {
        total: submittalAnalytics.statusSummary.total,
        byStatus: {
          NOT_STARTED: submittalAnalytics.statusSummary.notStarted,
          DRAFT: submittalAnalytics.statusSummary.draft,
          SUBMITTED: submittalAnalytics.statusSummary.submitted,
          UNDER_REVIEW: submittalAnalytics.statusSummary.underReview,
          APPROVED: submittalAnalytics.statusSummary.approved,
          APPROVED_AS_NOTED: submittalAnalytics.statusSummary.approvedAsNoted,
          REVISE_RESUBMIT: submittalAnalytics.statusSummary.reviseResubmit,
          REJECTED: submittalAnalytics.statusSummary.rejected,
          CLOSED: submittalAnalytics.statusSummary.closed,
        },
        byType: submittalAnalytics.byType.reduce((acc, t) => {
          acc[t.type] = t.total;
          return acc;
        }, {} as Record<string, number>),
        bySpecDivision: submittalAnalytics.bySpecDivision.reduce((acc, d) => {
          acc[d.division] = d.total;
          return acc;
        }, {} as Record<string, number>),
        approved: submittalAnalytics.statusSummary.approved,
        approvedAsNoted: submittalAnalytics.statusSummary.approvedAsNoted,
        rejected: submittalAnalytics.statusSummary.rejected,
        pending: submittalAnalytics.statusSummary.submitted + submittalAnalytics.statusSummary.underReview,
        overdue: submittalAnalytics.statusSummary.overdue,
        avgReviewDays: submittalAnalytics.reviewTimeMetrics.averageDays,
        medianReviewDays: submittalAnalytics.reviewTimeMetrics.medianDays,
        firstTimeApprovalRate: submittalAnalytics.approvalMetrics.firstTimeApprovalRate,
        avgRevisionsPerSubmittal: submittalAnalytics.approvalMetrics.averageRevisionsPerSubmittal,
        createdThisPeriod: 0,
        approvedThisPeriod: 0,
      },
      summaryMetrics: {
        totalOpenItems: rfiAnalytics.statusSummary.open + submittalAnalytics.statusSummary.submitted + submittalAnalytics.statusSummary.underReview,
        totalOverdueItems: rfiAnalytics.statusSummary.overdue + submittalAnalytics.statusSummary.overdue,
        overallHealthScore: this.calculateHealthScore(rfiAnalytics, submittalAnalytics),
        riskLevel: this.calculateRiskLevel(rfiAnalytics, submittalAnalytics),
        topBottlenecks: rfiAnalytics.bottlenecks.slice(0, 5).map((b) => ({
          type: b.type as 'USER' | 'COMPANY' | 'DISCIPLINE',
          id: b.id,
          name: b.name,
          itemCount: b.openItems,
          avgDaysOverdue: b.avgDaysOpen,
        })),
      },
    });

    return this.snapshotRepository.save(snapshot);
  }

  async getHistoricalSnapshots(
    projectId: string,
    snapshotType: SnapshotType,
    limit: number = 30,
  ): Promise<AnalyticsSnapshot[]> {
    return this.snapshotRepository.find({
      where: { projectId, snapshotType },
      order: { snapshotDate: 'DESC' },
      take: limit,
    });
  }

  async getSnapshotTrends(
    projectId: string,
    snapshotType: SnapshotType,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    dates: string[];
    rfiOpenCount: number[];
    rfiClosedCount: number[];
    submittalPendingCount: number[];
    submittalApprovedCount: number[];
    healthScores: number[];
  }> {
    const snapshots = await this.snapshotRepository
      .createQueryBuilder('snapshot')
      .where('snapshot.projectId = :projectId', { projectId })
      .andWhere('snapshot.snapshotType = :snapshotType', { snapshotType })
      .andWhere('snapshot.snapshotDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .orderBy('snapshot.snapshotDate', 'ASC')
      .getMany();

    return {
      dates: snapshots.map((s) => s.snapshotDate.toISOString().split('T')[0]),
      rfiOpenCount: snapshots.map((s) => s.rfiMetrics.open),
      rfiClosedCount: snapshots.map((s) => s.rfiMetrics.closed),
      submittalPendingCount: snapshots.map((s) => s.submittalMetrics.pending),
      submittalApprovedCount: snapshots.map((s) => s.submittalMetrics.approved),
      healthScores: snapshots.map((s) => s.summaryMetrics.overallHealthScore),
    };
  }

  async compareSnapshots(
    snapshotId1: string,
    snapshotId2: string,
  ): Promise<{
    snapshot1: AnalyticsSnapshot;
    snapshot2: AnalyticsSnapshot;
    changes: {
      rfiOpenDelta: number;
      rfiClosedDelta: number;
      submittalPendingDelta: number;
      submittalApprovedDelta: number;
      healthScoreDelta: number;
    };
  }> {
    const [snapshot1, snapshot2] = await Promise.all([
      this.snapshotRepository.findOne({ where: { id: snapshotId1 } }),
      this.snapshotRepository.findOne({ where: { id: snapshotId2 } }),
    ]);

    if (!snapshot1 || !snapshot2) {
      throw new Error('One or both snapshots not found');
    }

    return {
      snapshot1,
      snapshot2,
      changes: {
        rfiOpenDelta: snapshot2.rfiMetrics.open - snapshot1.rfiMetrics.open,
        rfiClosedDelta: snapshot2.rfiMetrics.closed - snapshot1.rfiMetrics.closed,
        submittalPendingDelta: snapshot2.submittalMetrics.pending - snapshot1.submittalMetrics.pending,
        submittalApprovedDelta: snapshot2.submittalMetrics.approved - snapshot1.submittalMetrics.approved,
        healthScoreDelta: snapshot2.summaryMetrics.overallHealthScore - snapshot1.summaryMetrics.overallHealthScore,
      },
    };
  }

  private calculateHealthScore(rfiAnalytics: any, submittalAnalytics: any): number {
    let score = 100;

    const rfiOverdueRate = rfiAnalytics.statusSummary.overdue / Math.max(rfiAnalytics.statusSummary.open, 1);
    score -= rfiOverdueRate * 20;

    const submittalOverdueRate = submittalAnalytics.statusSummary.overdue /
      Math.max(submittalAnalytics.statusSummary.submitted + submittalAnalytics.statusSummary.underReview, 1);
    score -= submittalOverdueRate * 20;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private calculateRiskLevel(rfiAnalytics: any, submittalAnalytics: any): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const healthScore = this.calculateHealthScore(rfiAnalytics, submittalAnalytics);

    if (healthScore >= 80) return 'LOW';
    if (healthScore >= 60) return 'MEDIUM';
    if (healthScore >= 40) return 'HIGH';
    return 'CRITICAL';
  }

  async deleteOldSnapshots(projectId: string, daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.snapshotRepository
      .createQueryBuilder()
      .delete()
      .from(AnalyticsSnapshot)
      .where('projectId = :projectId', { projectId })
      .andWhere('snapshotType = :snapshotType', { snapshotType: SnapshotType.DAILY })
      .andWhere('snapshotDate < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }
}
