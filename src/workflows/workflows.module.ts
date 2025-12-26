import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

// Entities
import {
  Submittal,
  SubmittalDocument,
  SubmittalReviewer,
  SubmittalComment,
  SubmittalEvent,
  WorkflowTemplate,
  ApprovalChain,
  DocumentApproval,
  ApprovalAction,
} from './entities';

// Services
import { SubmittalService } from './services/submittal.service';
import { WorkflowService } from './services/workflow.service';
import { ApprovalService } from './services/approval.service';
import { IntegrityService } from './services/integrity.service';

// Controllers
import { SubmittalController } from './controllers/submittal.controller';
import { WorkflowController } from './controllers/workflow.controller';
import { ApprovalController } from './controllers/approval.controller';

// Jobs
import { WorkflowReminderJob } from './jobs/workflow-reminder.job';

/**
 * Workflows Module
 *
 * Comprehensive document workflow management system.
 *
 * Features:
 * - Submittal workflows (contractor-to-architect)
 * - Document review workflows
 * - Approval chains with sequential/parallel processing
 * - Workflow templates
 * - Digital signatures and hash chain integrity
 * - Complete audit trail
 * - Automated reminders
 *
 * Architecture:
 * - 9 entities for complete data model
 * - 4 services for business logic
 * - 3 controllers for API endpoints
 * - 1 scheduled job for reminders
 * - Hash chain integrity verification
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      // Submittal entities
      Submittal,
      SubmittalDocument,
      SubmittalReviewer,
      SubmittalComment,
      SubmittalEvent,
      // Workflow entities
      WorkflowTemplate,
      // Approval entities
      ApprovalChain,
      DocumentApproval,
      ApprovalAction,
    ]),
  ],
  controllers: [
    SubmittalController,
    WorkflowController,
    ApprovalController,
  ],
  providers: [
    // Services
    SubmittalService,
    WorkflowService,
    ApprovalService,
    IntegrityService,
    // Jobs
    WorkflowReminderJob,
  ],
  exports: [
    TypeOrmModule,
    SubmittalService,
    WorkflowService,
    ApprovalService,
    IntegrityService,
  ],
})
export class WorkflowsModule {}
