import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { ProjectStatus } from '../../projects/enums/project-status.enum';
import { MetricOrchestratorService } from '../services/metric-orchestrator.service';

/**
 * MetricCalculationJob
 *
 * Background job that periodically calculates metrics for active projects
 */
@Injectable()
export class MetricCalculationJob {
  private readonly logger = new Logger(MetricCalculationJob.name);
  private isRunning = false;

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly orchestratorService: MetricOrchestratorService,
  ) {}

  /**
   * Calculate metrics for all active projects
   * Runs every 15 minutes
   */
  @Cron('*/15 * * * *')
  async calculateMetrics(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Previous calculation job still running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      this.logger.log('Starting metric calculation job');

      // Get all active projects
      const activeProjects = await this.getActiveProjects();
      this.logger.log(`Found ${activeProjects.length} active projects`);

      // Calculate metrics for each project
      let successCount = 0;
      let errorCount = 0;

      for (const project of activeProjects) {
        try {
          await this.orchestratorService.calculate(project.id, {
            includeKpis: true,
            includeBreakdown: true,
            includeTimeSeries: false, // Skip time series for background job
            includeAlerts: true,
          });
          successCount++;
        } catch (error) {
          this.logger.error(`Failed to calculate metrics for project ${project.id}:`, error);
          errorCount++;
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Metric calculation job completed in ${duration}ms. Success: ${successCount}, Errors: ${errorCount}`,
      );
    } catch (error) {
      this.logger.error('Metric calculation job failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Priority calculation for critical projects
   * Runs every 5 minutes
   */
  @Cron('*/5 * * * *')
  async calculatePriorityMetrics(): Promise<void> {
    try {
      // Get projects with critical alerts or nearing deadlines
      const priorityProjects = await this.getPriorityProjects();

      if (priorityProjects.length === 0) {
        return;
      }

      this.logger.log(`Calculating priority metrics for ${priorityProjects.length} projects`);

      // Calculate only critical metrics (SCHEDULE, BUDGET) for priority projects
      for (const project of priorityProjects) {
        try {
          await this.orchestratorService.calculate(project.id, {
            metrics: ['SCHEDULE', 'BUDGET'],
            includeKpis: true,
            includeAlerts: true,
          });
        } catch (error) {
          this.logger.error(
            `Failed to calculate priority metrics for project ${project.id}:`,
            error,
          );
        }
      }
    } catch (error) {
      this.logger.error('Priority calculation job failed:', error);
    }
  }

  /**
   * Warm cache for frequently accessed projects
   * Runs at 6 AM daily
   */
  @Cron('0 6 * * *')
  async warmCache(): Promise<void> {
    try {
      this.logger.log('Starting cache warming job');

      // Get frequently accessed projects (mock implementation)
      const frequentProjects = await this.getFrequentlyAccessedProjects();

      if (frequentProjects.length > 0) {
        await this.orchestratorService.warmCache(frequentProjects.map(p => p.id));
      }

      this.logger.log(`Cache warmed for ${frequentProjects.length} projects`);
    } catch (error) {
      this.logger.error('Cache warming job failed:', error);
    }
  }

  /**
   * Get active projects
   */
  private async getActiveProjects(): Promise<Project[]> {
    return this.projectRepository.find({
      where: [
        { status: ProjectStatus.CONSTRUCTION },
        { status: ProjectStatus.PRECONSTRUCTION },
        { status: ProjectStatus.CLOSEOUT },
      ],
      select: ['id', 'name', 'status', 'endDate'],
    });
  }

  /**
   * Get priority projects (those nearing deadlines or with issues)
   */
  private async getPriorityProjects(): Promise<Project[]> {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return this.projectRepository
      .createQueryBuilder('project')
      .where('project.status IN (:...statuses)', {
        statuses: [
          ProjectStatus.CONSTRUCTION,
          ProjectStatus.PRECONSTRUCTION,
          ProjectStatus.CLOSEOUT,
        ],
      })
      .andWhere(
        '(project.endDate <= :thirtyDaysFromNow OR project.percentComplete < 50)',
        { thirtyDaysFromNow },
      )
      .select(['project.id', 'project.name', 'project.endDate', 'project.percentComplete'])
      .getMany();
  }

  /**
   * Get frequently accessed projects (mock implementation)
   * TODO: Implement actual tracking of project access
   */
  private async getFrequentlyAccessedProjects(): Promise<Project[]> {
    // For now, just get the 10 most recent active projects
    return this.projectRepository.find({
      where: [
        { status: ProjectStatus.CONSTRUCTION },
        { status: ProjectStatus.PRECONSTRUCTION },
      ],
      select: ['id', 'name'],
      order: { updatedAt: 'DESC' },
      take: 10,
    });
  }
}