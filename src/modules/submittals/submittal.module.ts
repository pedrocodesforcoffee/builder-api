import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Submittal } from './entities/submittal.entity';
import { SubmittalItem } from './entities/submittal-item.entity';
import { SubmittalRevision } from './entities/submittal-revision.entity';
import { SubmittalResponse } from './entities/submittal-response.entity';
import { SubmittalHistory } from './entities/submittal-history.entity';
import { SpecSection } from './entities/spec-section.entity';
import { SubmittalWorkflowTemplate } from './entities/submittal-workflow-template.entity';
import { SubmittalWorkflowTemplateStep } from './entities/submittal-workflow-template-step.entity';
import { SubmittalWorkflowStep } from './entities/submittal-workflow-step.entity';
import { SubmittalDistribution } from './entities/submittal-distribution.entity';
import { SubmittalLeadTime } from './entities/submittal-lead-time.entity';
import { SubmittalNotification } from './entities/submittal-notification.entity';
import { ProjectSubmittalSettings } from './entities/project-submittal-settings.entity';
import { Project } from '../projects/entities/project.entity';
import { User } from '../users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { SubmittalService } from './services/submittal.service';
import { SubmittalNumberingService } from './services/submittal-numbering.service';
import { SubmittalWorkflowService } from './services/submittal-workflow.service';
import { SubmittalNotificationService } from './services/submittal-notification.service';
import { SubmittalLeadTimeService } from './services/submittal-lead-time.service';
import { SubmittalDistributionService } from './services/submittal-distribution.service';
import { SubmittalSchedulerService } from './services/submittal-scheduler.service';
import { SubmittalController } from './controllers/submittal.controller';
import { SubmittalWorkflowController } from './controllers/submittal-workflow.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      // Core entities
      Submittal,
      SubmittalItem,
      SubmittalRevision,
      SubmittalResponse,
      SubmittalHistory,
      SpecSection,
      // Workflow entities
      SubmittalWorkflowTemplate,
      SubmittalWorkflowTemplateStep,
      SubmittalWorkflowStep,
      SubmittalDistribution,
      SubmittalLeadTime,
      SubmittalNotification,
      ProjectSubmittalSettings,
      // Related entities
      Project,
      User,
      Organization,
    ]),
  ],
  controllers: [SubmittalController, SubmittalWorkflowController],
  providers: [
    // Core services
    SubmittalService,
    SubmittalNumberingService,
    // Workflow services
    SubmittalWorkflowService,
    SubmittalNotificationService,
    SubmittalLeadTimeService,
    SubmittalDistributionService,
    SubmittalSchedulerService,
  ],
  exports: [
    SubmittalService,
    SubmittalWorkflowService,
    SubmittalDistributionService,
    SubmittalLeadTimeService,
  ],
})
export class SubmittalModule {}
