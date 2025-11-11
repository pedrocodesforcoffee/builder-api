import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

// Entities
import {
  ProjectRelationship,
  ProjectProgram,
  MasterProject,
  ProjectDependency,
  PortfolioView,
} from './entities';

// Services
import {
  CircularDependencyValidatorService,
  HierarchyTraversalService,
  ProjectRelationshipService,
  ProjectProgramService,
  ProgramMetricsService,
  ProgramTimelineService,
  MasterProjectService,
  MasterAggregationService,
  MasterScheduleService,
  ProjectDependencyService,
  DependencyImpactService,
  DependencyNetworkService,
  PortfolioService,
  PortfolioAnalyticsService,
  PortfolioHealthService,
} from './services';

// Jobs
import {
  MasterAggregationJob,
  ProgramMetricsJob,
  DependencyViolationsJob,
  PortfolioCacheJob,
} from './jobs';

// Controllers
import {
  ProjectRelationshipController,
  ProjectDependencyController,
} from './controllers';

// Import required modules
import { Project } from '../projects/entities/project.entity';
import { Organization } from '../organizations/entities/organization.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Entities
      ProjectRelationship,
      ProjectProgram,
      MasterProject,
      ProjectDependency,
      PortfolioView,
      // Required entities from other modules
      Project,
      Organization,
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [
    ProjectRelationshipController,
    ProjectDependencyController,
    // Note: Add the remaining controllers when created:
    // ProjectProgramController,
    // MasterProjectController,
    // PortfolioController,
  ],
  providers: [
    // Core Services
    CircularDependencyValidatorService,
    HierarchyTraversalService,
    ProjectRelationshipService,
    ProjectProgramService,
    ProgramMetricsService,
    ProgramTimelineService,
    MasterProjectService,
    MasterAggregationService,
    MasterScheduleService,
    ProjectDependencyService,
    DependencyImpactService,
    DependencyNetworkService,
    PortfolioService,
    PortfolioAnalyticsService,
    PortfolioHealthService,
    // Background Jobs
    MasterAggregationJob,
    ProgramMetricsJob,
    DependencyViolationsJob,
    PortfolioCacheJob,
  ],
  exports: [
    // Export key services for use in other modules
    ProjectRelationshipService,
    ProjectProgramService,
    MasterProjectService,
    ProjectDependencyService,
    PortfolioService,
    PortfolioAnalyticsService,
    PortfolioHealthService,
  ],
})
export class RelationshipsModule {}