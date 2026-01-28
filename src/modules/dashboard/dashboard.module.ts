import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rfi } from '../rfis/entities/rfi.entity';
import { PunchItem } from '../punch-list/entities/punch-item.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { Project } from '../projects/entities/project.entity';
import { DashboardController } from './dashboard.controller';
import { NeedsAttentionService } from './services/needs-attention.service';
import { AttentionItemsService } from './services/attention-items.service';

/**
 * Dashboard Module
 *
 * Provides dashboard-related functionality including:
 * - Attention items (aggregated by type)
 * - Needs attention aggregation (individual items)
 * - Activity feeds
 * - Quick access metrics
 *
 * This module imports entities from multiple modules to aggregate data.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Rfi,
      PunchItem,
      ProjectMember,
      Project,
    ]),
  ],
  controllers: [DashboardController],
  providers: [NeedsAttentionService, AttentionItemsService],
  exports: [NeedsAttentionService, AttentionItemsService],
})
export class DashboardModule {}
