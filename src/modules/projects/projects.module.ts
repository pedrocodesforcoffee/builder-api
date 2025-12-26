import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';
import { ProjectTemplate } from './entities/project-template.entity';
import { ProjectPhase } from './entities/project-phase.entity';
import { ProjectMilestone } from './entities/project-milestone.entity';
import { ProjectFolder } from './entities/project-folder.entity';
import { FolderTemplate } from './entities/folder-template.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { ProjectService } from './services/project.service';
import { ProjectTemplateService } from './services/project-template.service';
import { TemplateApplicationService } from './services/template-application.service';
import { ProjectPhaseService } from './services/project-phase.service';
import { ProjectMilestoneService } from './services/project-milestone.service';
import { PhaseCalculationService } from './services/phase-calculation.service';
import { CriticalPathService } from './services/critical-path.service';
import { ProjectFolderService } from './services/project-folder.service';
import { FolderValidationService } from './services/folder-validation.service';
import { FolderPermissionsService } from './services/folder-permissions.service';
import { FolderStatisticsService } from './services/folder-statistics.service';
import { FolderOperationsService } from './services/folder-operations.service';
import { FolderTemplateService } from './services/folder-template.service';
import { ProjectDashboardService } from './services/project-dashboard.service';
import { ProjectMemberService } from './services/project-member.service';
import { ProjectController } from './controllers/project.controller';
import { ProjectTemplateController } from './controllers/project-template.controller';
import { ProjectPhaseController } from './controllers/project-phase.controller';
import { ProjectMilestoneController } from './controllers/project-milestone.controller';
import { ProjectFolderController } from './controllers/project-folder.controller';
import { FolderTemplateController } from './controllers/folder-template.controller';
import { ProjectDashboardController } from './controllers/project-dashboard.controller';
import { ProjectMemberController } from './controllers/project-member.controller';
import { User } from '../users/entities/user.entity';
import { DocumentsModule } from '../documents/documents.module';
import { AiModule } from '../ai/ai.module';

/**
 * Projects Module
 *
 * Provides project management functionality including:
 * - Project CRUD operations
 * - Project member management
 * - Project status tracking
 * - Organization-project relationships
 * - Project templates
 * - Project phases and milestones
 * - Project folder structure
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ProjectMember,
      ProjectTemplate,
      ProjectPhase,
      ProjectMilestone,
      ProjectFolder,
      FolderTemplate,
      Organization,
      User,
    ]),
    DocumentsModule,
    AiModule,
  ],
  controllers: [
    ProjectController,
    ProjectTemplateController,
    ProjectPhaseController,
    ProjectMilestoneController,
    ProjectFolderController,
    FolderTemplateController,
    ProjectDashboardController,
    ProjectMemberController,
  ],
  providers: [
    ProjectService,
    ProjectTemplateService,
    TemplateApplicationService,
    ProjectPhaseService,
    ProjectMilestoneService,
    PhaseCalculationService,
    CriticalPathService,
    ProjectFolderService,
    FolderValidationService,
    FolderPermissionsService,
    FolderStatisticsService,
    FolderOperationsService,
    FolderTemplateService,
    ProjectDashboardService,
    ProjectMemberService,
  ],
  exports: [
    ProjectService,
    ProjectTemplateService,
    TemplateApplicationService,
    ProjectPhaseService,
    ProjectMilestoneService,
    PhaseCalculationService,
    CriticalPathService,
    ProjectFolderService,
    FolderValidationService,
    FolderPermissionsService,
    FolderStatisticsService,
    FolderOperationsService,
    FolderTemplateService,
  ],
})
export class ProjectsModule {}
