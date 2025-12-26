import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectProgram } from '../entities/project-program.entity';
import { ProgramMetricsService } from '../services/program-metrics.service';

@Injectable()
export class ProgramMetricsJob {
  private readonly logger = new Logger(ProgramMetricsJob.name);

  constructor(
    @InjectRepository(ProjectProgram)
    private readonly programRepository: Repository<ProjectProgram>,
    private readonly programMetricsService: ProgramMetricsService,
  ) {}

  /**
   * Refresh program metrics every 20 minutes
   */
  @Cron('*/20 * * * *')
  async handleProgramMetrics(): Promise<void> {
    this.logger.log('Starting program metrics aggregation job');

    try {
      // Get all active programs
      const programs = await this.programRepository.find({
        where: { status: 'ACTIVE' },
      });

      this.logger.log(`Found ${programs.length} active programs to process`);

      // Process each program
      const results = await Promise.allSettled(
        programs.map(async (program) => {
          try {
            const metrics = await this.programMetricsService.aggregateMetrics(
              program.id,
            );

            // Update program with latest metrics
            await this.updateProgramMetrics(program, metrics);

            this.logger.debug(`Successfully updated metrics for program ${program.name}`);
            return { id: program.id, name: program.name, status: 'success' };
          } catch (error) {
            this.logger.error(
              `Failed to update metrics for program ${program.name}: ${(error as Error).message}`,
              (error as Error).stack,
            );
            return {
              id: program.id,
              name: program.name,
              status: 'error',
              error: (error as Error).message,
            };
          }
        }),
      );

      // Log summary
      const summary = this.summarizeResults(results);
      this.logger.log(
        `Program metrics job completed: ${summary.success} successful, ${summary.failed} failed`,
      );

      // Check for programs needing attention
      await this.checkProgramHealth(programs);

    } catch (error) {
      this.logger.error('Program metrics job failed', (error as Error).stack);
    }
  }

  /**
   * Update program timeline metrics (runs less frequently)
   */
  @Cron('0 */2 * * *') // Every 2 hours
  async handleTimelineUpdate(): Promise<void> {
    this.logger.log('Starting program timeline update job');

    try {
      const programs = await this.programRepository.find({
        where: { status: 'ACTIVE' },
      });

      for (const program of programs) {
        try {
          const timeline = await this.programMetricsService.getTimeline(program.id);

          // Update program dates if needed
          if (timeline.earliestStart || timeline.latestEnd) {
            await this.updateProgramTimeline(program, timeline);
          }
        } catch (error) {
          this.logger.error(
            `Failed to update timeline for program ${program.name}: ${(error as Error).message}`,
          );
        }
      }

      this.logger.log('Program timeline update completed');
    } catch (error) {
      this.logger.error('Program timeline job failed', (error as Error).stack);
    }
  }

  private async updateProgramMetrics(
    program: ProjectProgram,
    metrics: any,
  ): Promise<void> {
    // Update program with aggregated metrics
    program.actualCost = metrics.totalCost;
    program.metadata = {
      ...program.metadata,
      metrics: {
        totalProjects: metrics.totalProjects,
        totalBudget: metrics.totalBudget,
        avgProgress: metrics.avgProgress,
        statusDistribution: metrics.statusDistribution,
        onTimeProjects: metrics.onTimeProjects,
        atRiskProjects: metrics.atRiskProjects,
        lastUpdated: metrics.lastUpdated,
      },
    };

    await this.programRepository.save(program);
  }

  private async updateProgramTimeline(
    program: ProjectProgram,
    timeline: any,
  ): Promise<void> {
    let updated = false;

    if (timeline.earliestStart && (!program.startDate ||
        new Date(timeline.earliestStart) < new Date(program.startDate))) {
      program.startDate = timeline.earliestStart;
      updated = true;
    }

    if (timeline.latestEnd && (!program.endDate ||
        new Date(timeline.latestEnd) > new Date(program.endDate))) {
      program.endDate = timeline.latestEnd;
      updated = true;
    }

    if (updated) {
      await this.programRepository.save(program);
      this.logger.debug(`Updated timeline for program ${program.name}`);
    }
  }

  private async checkProgramHealth(programs: ProjectProgram[]): Promise<void> {
    for (const program of programs) {
      const metrics = program.metadata?.metrics;
      if (!metrics) continue;

      // Check for programs with high risk
      if (metrics.atRiskProjects > metrics.totalProjects * 0.3) {
        this.logger.warn(
          `Program ${program.name} has ${metrics.atRiskProjects} at-risk projects (${Math.round(
            (metrics.atRiskProjects / metrics.totalProjects) * 100,
          )}%)`,
        );
      }

      // Check for budget overruns
      if (program.targetBudget && metrics.totalCost > program.targetBudget * 1.1) {
        this.logger.warn(
          `Program ${program.name} is over budget by ${Math.round(
            ((metrics.totalCost - program.targetBudget) / program.targetBudget) * 100,
          )}%`,
        );
      }

      // Check for low progress
      if (metrics.avgProgress < 25 && program.startDate) {
        const startDate = new Date(program.startDate);
        const monthsSinceStart = (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (monthsSinceStart > 3) {
          this.logger.warn(
            `Program ${program.name} has low progress (${Math.round(
              metrics.avgProgress,
            )}%) after ${Math.round(monthsSinceStart)} months`,
          );
        }
      }
    }
  }

  private summarizeResults(
    results: PromiseSettledResult<any>[],
  ): { success: number; failed: number } {
    let success = 0;
    let failed = 0;

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.status === 'success') {
        success++;
      } else {
        failed++;
      }
    }

    return { success, failed };
  }
}