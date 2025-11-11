import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MasterProject } from '../entities/master-project.entity';
import { MasterProjectService } from '../services/master-project.service';

@Injectable()
export class MasterAggregationJob {
  private readonly logger = new Logger(MasterAggregationJob.name);

  constructor(
    @InjectRepository(MasterProject)
    private readonly masterProjectRepository: Repository<MasterProject>,
    private readonly masterProjectService: MasterProjectService,
  ) {}

  /**
   * Refresh master project aggregations every 30 minutes
   */
  @Cron('*/30 * * * *')
  async handleAggregation(): Promise<void> {
    this.logger.log('Starting master project aggregation job');

    try {
      // Get all active master projects
      const masterProjects = await this.masterProjectRepository.find({
        relations: ['project'],
      });

      this.logger.log(`Found ${masterProjects.length} master projects to aggregate`);

      // Process each master project
      const results = await Promise.allSettled(
        masterProjects.map(async (mp) => {
          try {
            // Check if project is active
            if (mp.project && (mp.project as any).status !== 'CANCELLED' && (mp.project as any).status !== 'ON_HOLD') {
              await this.masterProjectService.refreshAggregation(mp.id);
              this.logger.debug(`Successfully aggregated master project ${mp.id}`);
              return { id: mp.id, status: 'success' };
            }
            return { id: mp.id, status: 'skipped', reason: 'inactive' };
          } catch (error) {
            this.logger.error(
              `Failed to aggregate master project ${mp.id}: ${(error as Error).message}`,
              (error as Error).stack,
            );
            return { id: mp.id, status: 'error', error: (error as Error).message };
          }
        }),
      );

      // Log summary
      const summary = this.summarizeResults(results);
      this.logger.log(
        `Master aggregation job completed: ${summary.success} successful, ${summary.failed} failed, ${summary.skipped} skipped`,
      );

    } catch (error) {
      this.logger.error('Master aggregation job failed', (error as Error).stack);
    }
  }

  /**
   * Force refresh specific master projects (can be triggered manually)
   */
  async refreshSpecificProjects(masterProjectIds: string[]): Promise<void> {
    this.logger.log(`Manually refreshing ${masterProjectIds.length} master projects`);

    for (const id of masterProjectIds) {
      try {
        await this.masterProjectService.refreshAggregation(id);
        this.logger.log(`Successfully refreshed master project ${id}`);
      } catch (error) {
        this.logger.error(
          `Failed to refresh master project ${id}: ${(error as Error).message}`,
        );
      }
    }
  }

  private summarizeResults(
    results: PromiseSettledResult<any>[],
  ): { success: number; failed: number; skipped: number } {
    let success = 0;
    let failed = 0;
    let skipped = 0;

    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (result.value.status === 'success') {
          success++;
        } else if (result.value.status === 'skipped') {
          skipped++;
        } else {
          failed++;
        }
      } else {
        failed++;
      }
    }

    return { success, failed, skipped };
  }
}