import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';

// Entities
import { ProjectMetrics } from './entities/project-metrics.entity';
import { MetricSnapshot } from './entities/metric-snapshot.entity';
import { MetricAlert } from './entities/metric-alert.entity';
import { MetricThreshold } from './entities/metric-threshold.entity';

// External entities
import { Project } from '../projects/entities/project.entity';
import { ProjectPhase } from '../projects/entities/project-phase.entity';
import { ProjectMilestone } from '../projects/entities/project-milestone.entity';
import { ProjectFolder } from '../projects/entities/project-folder.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { User } from '../users/entities/user.entity';

// Services - Calculators
import { ScheduleCalculatorService } from './services/calculators/schedule-calculator.service';
import { BudgetCalculatorService } from './services/calculators/budget-calculator.service';
import { DocumentCalculatorService } from './services/calculators/document-calculator.service';
import { TeamCalculatorService } from './services/calculators/team-calculator.service';
import { RFICalculatorService } from './services/calculators/rfi-calculator.service';
import { SubmittalsCalculatorService } from './services/calculators/submittals-calculator.service';
import { SafetyCalculatorService } from './services/calculators/safety-calculator.service';
import { QualityCalculatorService } from './services/calculators/quality-calculator.service';

// Services - Core
import { MetricCacheService } from './services/metric-cache.service';
import { MetricOrchestratorService } from './services/metric-orchestrator.service';

// Controllers
import { ProjectMetricsController } from './controllers/project-metrics.controller';

// Jobs
import { MetricCalculationJob } from './jobs/metric-calculation.job';

// Import external modules
import { ProjectsModule } from '../projects/projects.module';

/**
 * MetricsModule
 *
 * Comprehensive metrics and analytics system for construction projects.
 * Provides real-time and historical metrics across multiple dimensions:
 * - Schedule tracking and performance
 * - Budget and financial metrics
 * - Document management statistics
 * - Team collaboration metrics
 * - RFIs and Submittals tracking
 * - Safety incident monitoring
 * - Quality control metrics
 *
 * Features:
 * - Multi-level caching (memory + database)
 * - Background calculation jobs
 * - Alert and threshold management
 * - Historical snapshots
 * - Comparison and benchmarking
 * - Extensible calculator architecture
 */
@Module({
  imports: [
    // TypeORM entities
    TypeOrmModule.forFeature([
      // Metric entities
      ProjectMetrics,
      MetricSnapshot,
      MetricAlert,
      MetricThreshold,
      // External entities needed by calculators
      Project,
      ProjectPhase,
      ProjectMilestone,
      ProjectFolder,
      ProjectMember,
      Organization,
      User,
    ]),

    // Cache module for in-memory caching
    CacheModule.register({
      ttl: 600, // Default TTL: 10 minutes
      max: 1000, // Maximum number of items in cache
    }),

    // Schedule module for cron jobs
    ScheduleModule.forRoot(),

    // Import projects module for services
    ProjectsModule,
  ],
  controllers: [
    ProjectMetricsController,
  ],
  providers: [
    // Calculator services
    ScheduleCalculatorService,
    BudgetCalculatorService,
    DocumentCalculatorService,
    TeamCalculatorService,
    RFICalculatorService,
    SubmittalsCalculatorService,
    SafetyCalculatorService,
    QualityCalculatorService,

    // Core services
    MetricCacheService,
    MetricOrchestratorService,

    // Background jobs
    MetricCalculationJob,
  ],
  exports: [
    // Export key services for use in other modules
    MetricOrchestratorService,
    MetricCacheService,

    // Export calculators if needed by other modules
    ScheduleCalculatorService,
    BudgetCalculatorService,
    DocumentCalculatorService,
    TeamCalculatorService,
  ],
})
export class MetricsModule {
  constructor() {
    console.log('MetricsModule initialized');
  }
}