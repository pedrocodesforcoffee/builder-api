import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { SubmittalWorkflowTemplate } from '../entities/submittal-workflow-template.entity';
import { SubmittalWorkflowTemplateStep, RoutingType, ReviewerType } from '../entities/submittal-workflow-template-step.entity';
import { SubmittalWorkflowStep, WorkflowStepStatus } from '../entities/submittal-workflow-step.entity';
import { Submittal, SubmittalType, SubmittalStatus } from '../entities/submittal.entity';
import { ApprovalStamp } from '../entities/submittal-response.entity';
import { ProjectSubmittalSettings } from '../entities/project-submittal-settings.entity';
import { User } from '../../users/entities/user.entity';
import { CreateWorkflowTemplateDto, CreateWorkflowTemplateStepDto } from '../dto/create-workflow-template.dto';
import { CompleteWorkflowStepDto } from '../dto/complete-workflow-step.dto';
import { SubmittalNotificationService } from './submittal-notification.service';
import { SubmittalDistributionService } from './submittal-distribution.service';
import { SubmittalLeadTimeService } from './submittal-lead-time.service';

export interface WorkflowExecutionSummary {
  totalSteps: number;
  completedSteps: number;
  activeSteps: number;
  pendingSteps: number;
  currentStepNames: string[];
  estimatedCompletionDate: Date | null;
  isComplete: boolean;
}

@Injectable()
export class SubmittalWorkflowService {
  private readonly logger = new Logger(SubmittalWorkflowService.name);

  constructor(
    @InjectRepository(SubmittalWorkflowTemplate)
    private readonly templateRepository: Repository<SubmittalWorkflowTemplate>,
    @InjectRepository(SubmittalWorkflowTemplateStep)
    private readonly templateStepRepository: Repository<SubmittalWorkflowTemplateStep>,
    @InjectRepository(SubmittalWorkflowStep)
    private readonly workflowStepRepository: Repository<SubmittalWorkflowStep>,
    @InjectRepository(Submittal)
    private readonly submittalRepository: Repository<Submittal>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ProjectSubmittalSettings)
    private readonly settingsRepository: Repository<ProjectSubmittalSettings>,
    private readonly notificationService: SubmittalNotificationService,
    @Inject(forwardRef(() => SubmittalDistributionService))
    private readonly distributionService: SubmittalDistributionService,
    private readonly leadTimeService: SubmittalLeadTimeService,
    private readonly dataSource: DataSource,
  ) {}

  // ==================== Workflow Template Management ====================

  /**
   * Create a new workflow template
   */
  async createTemplate(
    projectId: string,
    dto: CreateWorkflowTemplateDto,
  ): Promise<SubmittalWorkflowTemplate> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create template
      const template = this.templateRepository.create({
        projectId,
        name: dto.name,
        description: dto.description || null,
        applicableTypes: dto.applicableTypes || [],
        specSectionPatterns: dto.specSectionPatterns || [],
        totalReviewDays: dto.totalReviewDays || null,
        autoApply: dto.autoApply ?? false,
        priority: dto.priority || 0,
        isActive: true,
      });

      const savedTemplate = await queryRunner.manager.save(template);

      // Create template steps
      for (const stepDto of dto.steps) {
        const step = this.templateStepRepository.create({
          templateId: savedTemplate.id,
          name: stepDto.name,
          description: stepDto.description || null,
          stepType: stepDto.stepType,
          stepOrder: stepDto.stepOrder,
          parallelGroupOrder: stepDto.parallelGroupOrder || null,
          routingType: stepDto.routingType || RoutingType.SERIAL,
          reviewerType: stepDto.reviewerType,
          reviewerUserId: stepDto.reviewerUserId || null,
          reviewerRole: stepDto.reviewerRole || null,
          reviewerCompanyId: stepDto.reviewerCompanyId || null,
          reviewerDiscipline: stepDto.reviewerDiscipline || null,
          allowedDays: stepDto.allowedDays || null,
          isOptional: stepDto.isOptional ?? false,
          requireAllParallel: stepDto.requireAllParallel ?? false,
          canApprove: stepDto.canApprove ?? true,
          canReject: stepDto.canReject ?? true,
        });

        await queryRunner.manager.save(step);
      }

      await queryRunner.commitTransaction();

      this.logger.log(`Created workflow template: ${savedTemplate.name}`);

      return await this.getTemplateById(savedTemplate.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get workflow template by ID
   */
  async getTemplateById(id: string): Promise<SubmittalWorkflowTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: ['steps', 'project'],
      order: { steps: { stepOrder: 'ASC' } },
    });

    if (!template) {
      throw new NotFoundException(`Workflow template with ID ${id} not found`);
    }

    return template;
  }

  /**
   * Get all templates for a project
   */
  async getTemplatesByProject(projectId: string): Promise<SubmittalWorkflowTemplate[]> {
    return await this.templateRepository.find({
      where: { projectId, isActive: true },
      relations: ['steps'],
      order: { priority: 'DESC', name: 'ASC', steps: { stepOrder: 'ASC' } },
    });
  }

  /**
   * Update workflow template
   */
  async updateTemplate(
    id: string,
    updates: Partial<CreateWorkflowTemplateDto>,
  ): Promise<SubmittalWorkflowTemplate> {
    const template = await this.getTemplateById(id);

    if (updates.name) template.name = updates.name;
    if (updates.description !== undefined) template.description = updates.description || null;
    if (updates.applicableTypes) template.applicableTypes = updates.applicableTypes;
    if (updates.specSectionPatterns) template.specSectionPatterns = updates.specSectionPatterns;
    if (updates.totalReviewDays !== undefined) template.totalReviewDays = updates.totalReviewDays || null;
    if (updates.autoApply !== undefined) template.autoApply = updates.autoApply;
    if (updates.priority !== undefined) template.priority = updates.priority;

    await this.templateRepository.save(template);

    return await this.getTemplateById(id);
  }

  /**
   * Delete workflow template
   */
  async deleteTemplate(id: string): Promise<void> {
    const result = await this.templateRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Workflow template with ID ${id} not found`);
    }
  }

  /**
   * Find applicable template for a submittal
   */
  async findApplicableTemplate(
    projectId: string,
    submittalType: SubmittalType,
    specSection?: string,
  ): Promise<SubmittalWorkflowTemplate | null> {
    const templates = await this.getTemplatesByProject(projectId);

    // Filter by applicability
    const applicableTemplates = templates.filter((template) => {
      // Check submittal type
      const typeMatches =
        !template.applicableTypes ||
        template.applicableTypes.length === 0 ||
        template.applicableTypes.includes(submittalType);

      // Check spec section pattern
      const sectionMatches =
        !template.specSectionPatterns ||
        template.specSectionPatterns.length === 0 ||
        !specSection ||
        template.specSectionPatterns.some((pattern) =>
          this.matchesPattern(specSection, pattern),
        );

      return typeMatches && sectionMatches;
    });

    // Return highest priority template
    return applicableTemplates.length > 0 ? applicableTemplates[0] : null;
  }

  /**
   * Match spec section against pattern (supports wildcards)
   */
  private matchesPattern(specSection: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$', 'i');
    return regex.test(specSection);
  }

  // ==================== Workflow Execution ====================

  /**
   * Apply workflow template to a submittal
   */
  async applyTemplateToSubmittal(
    submittalId: string,
    templateId: string,
  ): Promise<SubmittalWorkflowStep[]> {
    const submittal = await this.submittalRepository.findOne({
      where: { id: submittalId },
      relations: ['workflowSteps'],
    });

    if (!submittal) {
      throw new NotFoundException(`Submittal with ID ${submittalId} not found`);
    }

    // Check if workflow already exists
    if (submittal.workflowSteps && submittal.workflowSteps.length > 0) {
      throw new BadRequestException(
        'Submittal already has an active workflow. Cancel existing workflow first.',
      );
    }

    const template = await this.getTemplateById(templateId);

    if (!template.steps || template.steps.length === 0) {
      throw new BadRequestException('Template has no steps defined');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const workflowSteps: SubmittalWorkflowStep[] = [];

      for (const templateStep of template.steps) {
        // Resolve reviewer
        const assignedToId = await this.resolveReviewer(
          submittal.projectId,
          templateStep,
        );

        // Calculate due date
        const dueDate = templateStep.allowedDays
          ? this.calculateDueDate(new Date(), templateStep.allowedDays)
          : null;

        // Determine initial status
        const status =
          templateStep.stepOrder === 1 && templateStep.routingType === RoutingType.SERIAL
            ? WorkflowStepStatus.ACTIVE
            : WorkflowStepStatus.PENDING;

        const workflowStep = this.workflowStepRepository.create({
          submittalId,
          templateStepId: templateStep.id,
          name: templateStep.name,
          description: templateStep.description || null,
          stepType: templateStep.stepType,
          stepOrder: templateStep.stepOrder,
          parallelGroupOrder: templateStep.parallelGroupOrder || null,
          routingType: templateStep.routingType,
          assignedToId,
          dueDate,
          status,
          isOptional: templateStep.isOptional,
          canApprove: templateStep.canApprove,
          canReject: templateStep.canReject,
        });

        const saved = (await queryRunner.manager.save(workflowStep)) as SubmittalWorkflowStep;
        workflowSteps.push(saved);

        // Send notification for active steps
        if (status === WorkflowStepStatus.ACTIVE && assignedToId) {
          await this.notificationService.notifyStepActivated(saved);
        }
      }

      await queryRunner.commitTransaction();

      this.logger.log(
        `Applied workflow template "${template.name}" to submittal ${submittal.number} (${workflowSteps.length} steps)`,
      );

      return workflowSteps;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Resolve reviewer based on template step configuration
   */
  private async resolveReviewer(
    projectId: string,
    templateStep: SubmittalWorkflowTemplateStep,
  ): Promise<string | null> {
    switch (templateStep.reviewerType) {
      case ReviewerType.USER:
        return templateStep.reviewerUserId || null;

      case ReviewerType.ROLE:
        // TODO: Find user with specific role in project
        // For now, return null (will need to be manually assigned)
        return null;

      case ReviewerType.COMPANY:
        // TODO: Find primary contact for company
        return null;

      case ReviewerType.DISCIPLINE:
        // TODO: Find user with specific discipline
        return null;

      default:
        return null;
    }
  }

  /**
   * Calculate due date based on allowed days
   */
  private calculateDueDate(startDate: Date, allowedDays: number): Date {
    const dueDate = new Date(startDate);
    dueDate.setDate(dueDate.getDate() + allowedDays);
    return dueDate;
  }

  /**
   * Complete a workflow step
   */
  async completeStep(
    stepId: string,
    userId: string,
    dto: CompleteWorkflowStepDto,
  ): Promise<SubmittalWorkflowStep> {
    const step = await this.workflowStepRepository.findOne({
      where: { id: stepId },
      relations: ['submittal', 'submittal.workflowSteps'],
    });

    if (!step) {
      throw new NotFoundException(`Workflow step with ID ${stepId} not found`);
    }

    // Verify step is active or in progress
    if (step.status !== WorkflowStepStatus.ACTIVE && step.status !== WorkflowStepStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Step cannot be completed. Current status: ${step.status}`,
      );
    }

    // Verify user is assigned to this step
    if (step.assignedToId !== userId) {
      throw new BadRequestException(
        'Only the assigned reviewer can complete this step',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update step
      step.status = WorkflowStepStatus.COMPLETED;
      step.completedById = userId;
      step.completedAt = new Date();
      step.stamp = dto.stamp;
      step.comments = dto.comments || null;
      step.conditions = dto.conditions || null;

      if (dto.signatureData) {
        step.signatureData = {
          signedAt: new Date(),
          signatureImage: dto.signatureData.signatureImage,
          title: dto.signatureData.title,
          licenseNumber: dto.signatureData.licenseNumber,
        };
      }

      await queryRunner.manager.save(step);

      // Send notification
      await this.notificationService.notifyStepCompleted(step, dto.stamp);

      // Advance workflow
      await this.advanceWorkflow(step.submittalId, dto.stamp, dto.skipToStepId);

      await queryRunner.commitTransaction();

      this.logger.log(`Completed workflow step ${step.name} for submittal ${step.submittal.number}`);

      return await this.getStepById(stepId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Advance workflow after step completion
   */
  private async advanceWorkflow(
    submittalId: string,
    stamp: ApprovalStamp,
    skipToStepId?: string,
  ): Promise<void> {
    const submittal = await this.submittalRepository.findOne({
      where: { id: submittalId },
      relations: ['workflowSteps'],
    });

    if (!submittal || !submittal.workflowSteps) return;

    const steps = submittal.workflowSteps.sort((a, b) => a.stepOrder - b.stepOrder);

    // Handle rejection with skip to specific step
    if (
      stamp === ApprovalStamp.REJECTED ||
      stamp === ApprovalStamp.REVISE_AND_RESUBMIT
    ) {
      if (skipToStepId) {
        await this.skipToStep(submittalId, skipToStepId);
      } else {
        // Reset workflow to first step
        await this.resetWorkflow(submittalId);
      }
      return;
    }

    // Find next steps to activate
    const currentSteps = steps.filter(
      (s) => s.status === WorkflowStepStatus.ACTIVE || s.status === WorkflowStepStatus.IN_PROGRESS,
    );

    const completedSteps = steps.filter((s) => s.status === WorkflowStepStatus.COMPLETED);

    // Check if all steps are complete
    const allComplete = steps.every(
      (s) =>
        s.status === WorkflowStepStatus.COMPLETED ||
        s.status === WorkflowStepStatus.SKIPPED ||
        (s.isOptional && s.status === WorkflowStepStatus.PENDING),
    );

    if (allComplete) {
      // Workflow complete - finalize submittal
      await this.finalizeSubmittal(submittalId, stamp);
      return;
    }

    // Find next steps based on routing type
    if (currentSteps.length === 0) {
      // No active steps, activate next pending steps
      const nextPendingSteps = steps.filter(
        (s) => s.status === WorkflowStepStatus.PENDING,
      );

      if (nextPendingSteps.length > 0) {
        // Group by parallel group order
        const firstStep = nextPendingSteps[0];
        const stepsToActivate =
          firstStep.routingType === RoutingType.PARALLEL
            ? nextPendingSteps.filter(
                (s) =>
                  s.parallelGroupOrder === firstStep.parallelGroupOrder &&
                  s.stepOrder === firstStep.stepOrder,
              )
            : [firstStep];

        for (const step of stepsToActivate) {
          step.status = WorkflowStepStatus.ACTIVE;
          await this.workflowStepRepository.save(step);

          if (step.assignedToId) {
            await this.notificationService.notifyStepActivated(step);
          }
        }
      }
    }
  }

  /**
   * Finalize submittal when workflow completes
   */
  private async finalizeSubmittal(
    submittalId: string,
    finalStamp: ApprovalStamp,
  ): Promise<void> {
    const submittal = await this.submittalRepository.findOne({
      where: { id: submittalId },
    });

    if (!submittal) return;

    // Update submittal status based on final approval stamp
    switch (finalStamp) {
      case ApprovalStamp.APPROVED:
        submittal.status = SubmittalStatus.APPROVED;
        break;
      case ApprovalStamp.APPROVED_AS_NOTED:
      case ApprovalStamp.APPROVED_AS_NOTED_RESUBMIT:
        submittal.status = SubmittalStatus.APPROVED_AS_NOTED;
        break;
      case ApprovalStamp.REJECTED:
        submittal.status = SubmittalStatus.REJECTED;
        break;
      case ApprovalStamp.REVISE_AND_RESUBMIT:
        submittal.status = SubmittalStatus.REVISE_RESUBMIT;
        break;
    }

    await this.submittalRepository.save(submittal);

    // Send approval notification
    if (submittal.status === SubmittalStatus.APPROVED || submittal.status === SubmittalStatus.APPROVED_AS_NOTED) {
      await this.notificationService.notifySubmittalApproved(submittal);

      // Auto-distribute if enabled
      await this.distributionService.autoDistribute(submittalId);
    }

    this.logger.log(
      `Finalized submittal ${submittal.number} with status: ${submittal.status}`,
    );
  }

  /**
   * Skip to a specific workflow step
   */
  private async skipToStep(submittalId: string, stepId: string): Promise<void> {
    const steps = await this.workflowStepRepository.find({
      where: { submittalId },
      order: { stepOrder: 'ASC' },
    });

    const targetStep = steps.find((s) => s.id === stepId);
    if (!targetStep) {
      throw new NotFoundException(`Target step with ID ${stepId} not found`);
    }

    // Cancel all active steps
    for (const step of steps) {
      if (step.status === WorkflowStepStatus.ACTIVE || step.status === WorkflowStepStatus.IN_PROGRESS) {
        step.status = WorkflowStepStatus.CANCELLED;
        await this.workflowStepRepository.save(step);
      }
    }

    // Activate target step
    targetStep.status = WorkflowStepStatus.ACTIVE;
    await this.workflowStepRepository.save(targetStep);

    if (targetStep.assignedToId) {
      await this.notificationService.notifyStepActivated(targetStep);
    }
  }

  /**
   * Reset workflow to first step
   */
  private async resetWorkflow(submittalId: string): Promise<void> {
    const steps = await this.workflowStepRepository.find({
      where: { submittalId },
      order: { stepOrder: 'ASC' },
    });

    for (const step of steps) {
      step.status =
        step.stepOrder === 1
          ? WorkflowStepStatus.ACTIVE
          : WorkflowStepStatus.PENDING;
      step.completedById = null as any;
      step.completedAt = null as any;
      step.stamp = null as any;
      step.comments = null as any;
      step.conditions = null as any;
      step.signatureData = null as any;

      await this.workflowStepRepository.save(step);

      if (step.status === WorkflowStepStatus.ACTIVE && step.assignedToId) {
        await this.notificationService.notifyStepActivated(step);
      }
    }
  }

  /**
   * Reassign workflow step to different user
   */
  async reassignStep(
    stepId: string,
    newAssigneeId: string,
    reason?: string,
  ): Promise<SubmittalWorkflowStep> {
    const step = await this.getStepById(stepId);

    const previousAssigneeId = step.assignedToId;
    step.assignedToId = newAssigneeId;

    await this.workflowStepRepository.save(step);

    // Send notifications
    await this.notificationService.notifyStepReassigned(
      step,
      previousAssigneeId,
      reason,
    );

    this.logger.log(`Reassigned step ${step.name} to user ${newAssigneeId}`);

    return await this.getStepById(stepId);
  }

  /**
   * Get workflow step by ID
   */
  async getStepById(id: string): Promise<SubmittalWorkflowStep> {
    const step = await this.workflowStepRepository.findOne({
      where: { id },
      relations: ['submittal', 'assignedTo', 'completedBy', 'templateStep'],
    });

    if (!step) {
      throw new NotFoundException(`Workflow step with ID ${id} not found`);
    }

    return step;
  }

  /**
   * Get workflow steps for a submittal
   */
  async getStepsBySubmittal(submittalId: string): Promise<SubmittalWorkflowStep[]> {
    return await this.workflowStepRepository.find({
      where: { submittalId },
      relations: ['assignedTo', 'completedBy'],
      order: { stepOrder: 'ASC' },
    });
  }

  /**
   * Get workflow execution summary
   */
  async getWorkflowSummary(submittalId: string): Promise<WorkflowExecutionSummary> {
    const steps = await this.getStepsBySubmittal(submittalId);

    const totalSteps = steps.length;
    const completedSteps = steps.filter(
      (s) => s.status === WorkflowStepStatus.COMPLETED,
    ).length;
    const activeSteps = steps.filter(
      (s) =>
        s.status === WorkflowStepStatus.ACTIVE ||
        s.status === WorkflowStepStatus.IN_PROGRESS,
    ).length;
    const pendingSteps = steps.filter(
      (s) => s.status === WorkflowStepStatus.PENDING,
    ).length;

    const currentStepNames = steps
      .filter(
        (s) =>
          s.status === WorkflowStepStatus.ACTIVE ||
          s.status === WorkflowStepStatus.IN_PROGRESS,
      )
      .map((s) => s.name);

    const isComplete = completedSteps === totalSteps;

    // Calculate estimated completion date based on remaining allowed days
    let estimatedCompletionDate: Date | null = null;
    if (!isComplete) {
      const remainingDays = steps
        .filter((s) => s.status !== WorkflowStepStatus.COMPLETED)
        .reduce((sum, s) => sum + (s.allowedDays || 0), 0);

      if (remainingDays > 0) {
        estimatedCompletionDate = new Date();
        estimatedCompletionDate.setDate(
          estimatedCompletionDate.getDate() + remainingDays,
        );
      }
    }

    return {
      totalSteps,
      completedSteps,
      activeSteps,
      pendingSteps,
      currentStepNames,
      estimatedCompletionDate,
      isComplete,
    };
  }

  /**
   * Cancel entire workflow
   */
  async cancelWorkflow(submittalId: string): Promise<void> {
    const steps = await this.getStepsBySubmittal(submittalId);

    for (const step of steps) {
      if (step.status !== WorkflowStepStatus.COMPLETED) {
        step.status = WorkflowStepStatus.CANCELLED;
        await this.workflowStepRepository.save(step);
      }
    }

    this.logger.log(`Cancelled workflow for submittal ${submittalId}`);
  }
}
