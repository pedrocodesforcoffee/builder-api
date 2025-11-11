import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetricCalculator } from '../../interfaces/metric-calculator.interface';
import { MetricResult } from '../../interfaces/metric-result.interface';
import { CalculationOptions } from '../../interfaces/calculation-options.interface';
import { ValidationResult } from '../../interfaces/validation-result.interface';
import { MetricGroup } from '../../enums/metric-group.enum';
import { TrendDirection } from '../../enums/trend-direction.enum';
import { Project } from '../../../projects/entities/project.entity';
import { ProjectPhase } from '../../../projects/entities/project-phase.entity';
import { ProjectMilestone } from '../../../projects/entities/project-milestone.entity';
import { ProjectPhaseService } from '../../../projects/services/project-phase.service';
import { ProjectMilestoneService } from '../../../projects/services/project-milestone.service';
import { CriticalPathService } from '../../../projects/services/critical-path.service';
import { PhaseStatus } from '../../../projects/enums/phase-status.enum';
import { MilestoneStatus } from '../../../projects/enums/milestone-status.enum';

/**
 * ScheduleCalculator Service
 *
 * Calculates schedule-related metrics including:
 * - Progress tracking (percent complete, days elapsed/remaining)
 * - Schedule variance and performance indices
 * - Phase and milestone breakdowns
 * - Critical path analysis
 */
@Injectable()
export class ScheduleCalculatorService implements MetricCalculator {
  private readonly logger = new Logger(ScheduleCalculatorService.name);

  readonly name = 'schedule';
  readonly group = MetricGroup.SCHEDULE;
  readonly ttl = 300; // 5 minutes
  readonly isRealTime = false;
  readonly dependencies = [];

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectPhase)
    private readonly phaseRepository: Repository<ProjectPhase>,
    @InjectRepository(ProjectMilestone)
    private readonly milestoneRepository: Repository<ProjectMilestone>,
    private readonly phaseService: ProjectPhaseService,
    private readonly milestoneService: ProjectMilestoneService,
    private readonly criticalPathService: CriticalPathService,
  ) {}

  async calculate(projectId: string, options?: CalculationOptions): Promise<MetricResult> {
    const startTime = Date.now();

    try {
      // Fetch project and related data
      const project = await this.projectRepository.findOne({
        where: { id: projectId },
      });

      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      const phases = await this.phaseRepository.find({
        where: { projectId },
        order: { order: 'ASC' },
      });

      const milestones = await this.milestoneRepository.find({
        where: { projectId },
        order: { plannedDate: 'ASC' },
      });

      // Calculate core metrics
      const percentComplete = await this.calculatePercentComplete(project, phases);
      const daysElapsed = this.calculateDaysElapsed(project);
      const daysRemaining = this.calculateDaysRemaining(project);
      const totalDuration = this.calculateTotalDuration(project);
      const scheduleVariance = await this.calculateScheduleVariance(project, phases);
      const schedulePerformanceIndex = await this.calculateSPI(percentComplete, daysElapsed, totalDuration);

      // Phase breakdown
      const phaseBreakdown = this.calculatePhaseBreakdown(phases);

      // Milestone breakdown
      const milestoneBreakdown = this.calculateMilestoneBreakdown(milestones);

      // Current phase and next milestone
      const currentPhase = this.getCurrentPhase(phases);
      const nextMilestone = this.getNextMilestone(milestones);

      // Critical path metrics
      let criticalPathMetrics = {};
      try {
        const criticalPath = await this.criticalPathService.calculateCriticalPath(projectId);
        criticalPathMetrics = {
          criticalPathLength: criticalPath.criticalPathLength,
          criticalTasks: criticalPath.criticalPath.length,
          totalProjectDuration: criticalPath.totalProjectDuration,
        };
      } catch (error) {
        this.logger.warn(`Failed to calculate critical path for project ${projectId}:`, error);
      }

      // Construct result
      const metrics = {
        percentComplete,
        daysElapsed,
        daysRemaining,
        totalDuration,
        scheduleVariance,
        schedulePerformanceIndex,
        phases: phaseBreakdown,
        milestones: milestoneBreakdown,
        currentPhase,
        nextMilestone,
        ...criticalPathMetrics,
        projectStartDate: project.startDate,
        projectEndDate: project.endDate,
        isOnSchedule: scheduleVariance >= 0,
        estimatedCompletionDate: this.calculateEstimatedCompletionDate(
          project,
          percentComplete,
          daysElapsed,
        ),
      };

      // Add timeline if requested
      if (options?.includeTimeSeries) {
        (metrics as any)['timeline'] = await this.generateTimeline(project, phases, milestones);
      }

      return {
        group: this.group,
        calculatedAt: new Date(),
        calculationDuration: Date.now() - startTime,
        metrics,
        values: this.formatMetricValues(metrics),
        kpis: {
          primary: {
            key: 'percentComplete',
            value: percentComplete,
            label: 'Overall Progress',
            unit: '%',
            format: 'percentage',
          },
          secondary: [
            {
              key: 'daysRemaining',
              value: daysRemaining,
              label: 'Days Remaining',
              unit: 'days',
              format: 'number',
            },
            {
              key: 'schedulePerformanceIndex',
              value: schedulePerformanceIndex,
              label: 'Schedule Performance',
              format: 'decimal',
            },
          ],
        },
        summary: {
          totalPhases: phases.length,
          completedPhases: phaseBreakdown.completed,
          totalMilestones: milestones.length,
          completedMilestones: milestoneBreakdown.completed,
        },
        dataSourceVersion: await this.getDataSourceVersion(projectId),
      };
    } catch (error) {
      this.logger.error(`Failed to calculate schedule metrics for project ${projectId}:`, error);
      throw error;
    }
  }

  async getDataSourceVersion(projectId: string): Promise<string> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    const latestPhase = await this.phaseRepository.findOne({
      where: { projectId },
      order: { updatedAt: 'DESC' },
    });

    const latestMilestone = await this.milestoneRepository.findOne({
      where: { projectId },
      order: { updatedAt: 'DESC' },
    });

    const timestamps = [
      project?.updatedAt,
      latestPhase?.updatedAt,
      latestMilestone?.updatedAt,
    ].filter(Boolean);

    if (timestamps.length === 0) {
      return new Date().toISOString();
    }

    return Math.max(...timestamps.map((t) => t!.getTime())).toString();
  }

  async validate(projectId: string): Promise<ValidationResult> {
    const errors = [];
    const warnings = [];

    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      errors.push({
        code: 'PROJECT_NOT_FOUND',
        message: `Project ${projectId} not found`,
      });
    } else {
      if (!project.startDate) {
        warnings.push({
          code: 'NO_START_DATE',
          message: 'Project has no start date defined',
          suggestion: 'Set a project start date for accurate schedule metrics',
        });
      }

      if (!project.endDate) {
        warnings.push({
          code: 'NO_END_DATE',
          message: 'Project has no end date defined',
          suggestion: 'Set a project end date for accurate schedule metrics',
        });
      }

      const phasesCount = await this.phaseRepository.count({
        where: { projectId },
      });

      if (phasesCount === 0) {
        warnings.push({
          code: 'NO_PHASES',
          message: 'Project has no phases defined',
          suggestion: 'Create project phases for better schedule tracking',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        checkedAt: new Date(),
        checksPerformed: ['project_exists', 'dates_defined', 'phases_exist'],
        dataAvailability: {
          project: !!project,
          startDate: !!project?.startDate,
          endDate: !!project?.endDate,
          phases: await this.phaseRepository.count({ where: { projectId } }) > 0,
          milestones: await this.milestoneRepository.count({ where: { projectId } }) > 0,
        },
      },
    };
  }

  private async calculatePercentComplete(
    project: Project,
    phases: ProjectPhase[],
  ): Promise<number> {
    // If project has percentComplete set, use it
    if (project.percentComplete !== null && project.percentComplete !== undefined) {
      return Number(project.percentComplete);
    }

    // Otherwise, calculate from phases
    if (phases.length === 0) {
      return 0;
    }

    const totalWeight = phases.reduce((sum, phase) => {
      // Weight by duration
      const duration = phase.getPlannedDuration();
      return sum + duration;
    }, 0);

    if (totalWeight === 0) {
      return 0;
    }

    const weightedProgress = phases.reduce((sum, phase) => {
      const duration = phase.getPlannedDuration();
      const weight = duration / totalWeight;
      return sum + phase.percentComplete * weight;
    }, 0);

    return Math.round(weightedProgress * 100) / 100;
  }

  private calculateDaysElapsed(project: Project): number {
    if (!project.startDate) {
      return 0;
    }

    const start = new Date(project.startDate);
    const today = new Date();

    if (today < start) {
      return 0;
    }

    const diffTime = today.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private calculateDaysRemaining(project: Project): number {
    if (!project.endDate) {
      return 0;
    }

    const today = new Date();
    const end = new Date(project.endDate);

    if (today >= end) {
      return 0;
    }

    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private calculateTotalDuration(project: Project): number {
    if (!project.startDate || !project.endDate) {
      return 0;
    }

    const start = new Date(project.startDate);
    const end = new Date(project.endDate);
    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private async calculateScheduleVariance(
    project: Project,
    phases: ProjectPhase[],
  ): Promise<number> {
    // Schedule Variance = Planned Progress - Actual Progress (in days)
    const percentComplete = await this.calculatePercentComplete(project, phases);
    const daysElapsed = this.calculateDaysElapsed(project);
    const totalDuration = this.calculateTotalDuration(project);

    if (totalDuration === 0) {
      return 0;
    }

    const plannedProgress = (daysElapsed / totalDuration) * 100;
    const actualProgress = percentComplete;

    // Convert to days
    const varianceDays = ((actualProgress - plannedProgress) / 100) * totalDuration;

    return Math.round(varianceDays * 10) / 10;
  }

  private async calculateSPI(
    percentComplete: number,
    daysElapsed: number,
    totalDuration: number,
  ): Promise<number> {
    // Schedule Performance Index = Earned Value / Planned Value
    // In schedule terms: Actual Progress / Planned Progress
    if (totalDuration === 0 || daysElapsed === 0) {
      return 1.0;
    }

    const plannedProgress = (daysElapsed / totalDuration) * 100;
    const actualProgress = percentComplete;

    if (plannedProgress === 0) {
      return 1.0;
    }

    const spi = actualProgress / plannedProgress;
    return Math.round(spi * 100) / 100;
  }

  private calculatePhaseBreakdown(phases: ProjectPhase[]): any {
    const breakdown = {
      total: phases.length,
      notStarted: 0,
      inProgress: 0,
      completed: 0,
      delayed: 0,
      onTrack: 0,
    };

    phases.forEach((phase) => {
      switch (phase.status) {
        case PhaseStatus.NOT_STARTED:
          breakdown.notStarted++;
          break;
        case PhaseStatus.IN_PROGRESS:
          breakdown.inProgress++;
          break;
        case PhaseStatus.COMPLETED:
          breakdown.completed++;
          break;
      }

      if (phase.isDelayed()) {
        breakdown.delayed++;
      } else if (phase.status !== PhaseStatus.COMPLETED) {
        breakdown.onTrack++;
      }
    });

    return breakdown;
  }

  private calculateMilestoneBreakdown(milestones: ProjectMilestone[]): any {
    const today = new Date();
    const breakdown = {
      total: milestones.length,
      completed: 0,
      upcoming: 0,
      overdue: 0,
      thisWeek: 0,
      thisMonth: 0,
    };

    const weekFromNow = new Date();
    weekFromNow.setDate(today.getDate() + 7);

    const monthFromNow = new Date();
    monthFromNow.setMonth(today.getMonth() + 1);

    milestones.forEach((milestone) => {
      if (milestone.status === MilestoneStatus.ACHIEVED) {
        breakdown.completed++;
      } else if (milestone.isOverdue()) {
        breakdown.overdue++;
      } else {
        breakdown.upcoming++;

        const plannedDate = new Date(milestone.plannedDate);
        if (plannedDate <= weekFromNow) {
          breakdown.thisWeek++;
        }
        if (plannedDate <= monthFromNow) {
          breakdown.thisMonth++;
        }
      }
    });

    return breakdown;
  }

  private getCurrentPhase(phases: ProjectPhase[]): any {
    const currentPhase = phases.find((phase) => phase.status === PhaseStatus.IN_PROGRESS);

    if (!currentPhase) {
      return null;
    }

    return {
      id: currentPhase.id,
      name: currentPhase.name,
      percentComplete: currentPhase.percentComplete,
      startDate: currentPhase.startDate,
      endDate: currentPhase.endDate,
      daysRemaining: currentPhase.getDaysRemaining(),
      isOnCriticalPath: currentPhase.isOnCriticalPath,
    };
  }

  private getNextMilestone(milestones: ProjectMilestone[]): any {
    const today = new Date();
    const nextMilestone = milestones.find((milestone) => {
      return (
        milestone.status !== MilestoneStatus.ACHIEVED && new Date(milestone.plannedDate) >= today
      );
    });

    if (!nextMilestone) {
      return null;
    }

    return {
      id: nextMilestone.id,
      name: nextMilestone.name,
      plannedDate: nextMilestone.plannedDate,
      daysUntil: nextMilestone.getDaysUntilDue(),
      phaseId: nextMilestone.phaseId,
      isCritical: nextMilestone.isCritical,
    };
  }

  private calculateEstimatedCompletionDate(
    project: Project,
    percentComplete: number,
    daysElapsed: number,
  ): Date | null {
    if (percentComplete === 0 || percentComplete >= 100) {
      return project.endDate ? new Date(project.endDate) : null;
    }

    // Estimate based on current velocity
    const estimatedTotalDays = (daysElapsed / percentComplete) * 100;
    const remainingDays = estimatedTotalDays - daysElapsed;

    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + Math.ceil(remainingDays));

    return estimatedDate;
  }

  private async generateTimeline(
    project: Project,
    phases: ProjectPhase[],
    milestones: ProjectMilestone[],
  ): Promise<any[]> {
    const timeline = [];

    // Add project start
    if (project.startDate) {
      timeline.push({
        date: project.startDate,
        type: 'project_start',
        label: 'Project Start',
      });
    }

    // Add phase events
    phases.forEach((phase) => {
      timeline.push({
        date: phase.startDate,
        type: 'phase_start',
        label: `${phase.name} Start`,
        phaseId: phase.id,
      });

      timeline.push({
        date: phase.endDate,
        type: 'phase_end',
        label: `${phase.name} End`,
        phaseId: phase.id,
      });
    });

    // Add milestones
    milestones.forEach((milestone) => {
      timeline.push({
        date: milestone.plannedDate,
        type: 'milestone',
        label: milestone.name,
        milestoneId: milestone.id,
        isCritical: milestone.isCritical,
      });
    });

    // Add project end
    if (project.endDate) {
      timeline.push({
        date: project.endDate,
        type: 'project_end',
        label: 'Project End',
      });
    }

    // Sort by date
    timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return timeline;
  }

  private formatMetricValues(metrics: any): any[] {
    const values = [];

    values.push({
      key: 'percentComplete',
      value: metrics.percentComplete,
      label: 'Progress',
      unit: '%',
      format: 'percentage',
      trend: this.calculateTrend(metrics.percentComplete, metrics.schedulePerformanceIndex),
    });

    values.push({
      key: 'daysRemaining',
      value: metrics.daysRemaining,
      label: 'Days Remaining',
      unit: 'days',
      format: 'number',
    });

    values.push({
      key: 'scheduleVariance',
      value: metrics.scheduleVariance,
      label: 'Schedule Variance',
      unit: 'days',
      format: 'number',
      hasAlert: metrics.scheduleVariance < -5,
      alertSeverity: metrics.scheduleVariance < -10 ? 'critical' : 'warning',
    });

    values.push({
      key: 'schedulePerformanceIndex',
      value: metrics.schedulePerformanceIndex,
      label: 'SPI',
      format: 'decimal',
      hasAlert: metrics.schedulePerformanceIndex < 0.9,
      alertSeverity: metrics.schedulePerformanceIndex < 0.8 ? 'critical' : 'warning',
    });

    return values;
  }

  private calculateTrend(current: number, spi: number): TrendDirection {
    if (spi > 1.05) return TrendDirection.INCREASING;
    if (spi < 0.95) return TrendDirection.DECREASING;
    return TrendDirection.STABLE;
  }
}