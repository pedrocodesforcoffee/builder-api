import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { SubmittalWorkflowService } from '../services/submittal-workflow.service';
import { SubmittalLeadTimeService } from '../services/submittal-lead-time.service';
import { SubmittalDistributionService } from '../services/submittal-distribution.service';
import { SubmittalSchedulerService } from '../services/submittal-scheduler.service';
import { CreateWorkflowTemplateDto } from '../dto/create-workflow-template.dto';
import { CompleteWorkflowStepDto } from '../dto/complete-workflow-step.dto';
import { CalculateLeadTimeDto } from '../dto/calculate-lead-time.dto';
import { DistributeSubmittalDto } from '../dto/distribute-submittal.dto';

@ApiTags('Submittal Workflow')
@Controller('v1/projects/:projectId/submittals/workflow')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SubmittalWorkflowController {
  constructor(
    private readonly workflowService: SubmittalWorkflowService,
    private readonly leadTimeService: SubmittalLeadTimeService,
    private readonly distributionService: SubmittalDistributionService,
    private readonly schedulerService: SubmittalSchedulerService,
  ) {}

  // ==================== Workflow Templates ====================

  @Post('templates')
  @ApiOperation({ summary: 'Create workflow template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  async createTemplate(
    @Param('projectId') projectId: string,
    @Body() dto: CreateWorkflowTemplateDto,
    @CurrentUser() user: User,
  ) {
    return await this.workflowService.createTemplate(projectId, dto);
  }

  @Get('templates')
  @ApiOperation({ summary: 'List workflow templates for project' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  async getTemplates(@Param('projectId') projectId: string) {
    return await this.workflowService.getTemplatesByProject(projectId);
  }

  @Get('templates/:templateId')
  @ApiOperation({ summary: 'Get workflow template by ID' })
  @ApiResponse({ status: 200, description: 'Template retrieved successfully' })
  async getTemplate(@Param('templateId') templateId: string) {
    return await this.workflowService.getTemplateById(templateId);
  }

  @Put('templates/:templateId')
  @ApiOperation({ summary: 'Update workflow template' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  async updateTemplate(
    @Param('templateId') templateId: string,
    @Body() dto: Partial<CreateWorkflowTemplateDto>,
    @CurrentUser() user: User,
  ) {
    return await this.workflowService.updateTemplate(templateId, dto);
  }

  @Delete('templates/:templateId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete workflow template' })
  @ApiResponse({ status: 204, description: 'Template deleted successfully' })
  async deleteTemplate(@Param('templateId') templateId: string) {
    await this.workflowService.deleteTemplate(templateId);
  }

  @Get('templates/find/applicable')
  @ApiOperation({ summary: 'Find applicable template for submittal type and spec section' })
  @ApiResponse({ status: 200, description: 'Template found' })
  async findApplicableTemplate(
    @Param('projectId') projectId: string,
    @Query('submittalType') submittalType: string,
    @Query('specSection') specSection?: string,
  ) {
    return await this.workflowService.findApplicableTemplate(
      projectId,
      submittalType as any,
      specSection,
    );
  }

  // ==================== Workflow Execution ====================

  @Post(':submittalId/apply-template/:templateId')
  @ApiOperation({ summary: 'Apply workflow template to submittal' })
  @ApiResponse({ status: 201, description: 'Workflow created successfully' })
  async applyTemplate(
    @Param('submittalId') submittalId: string,
    @Param('templateId') templateId: string,
    @CurrentUser() user: User,
  ) {
    return await this.workflowService.applyTemplateToSubmittal(submittalId, templateId);
  }

  @Get(':submittalId/steps')
  @ApiOperation({ summary: 'Get workflow steps for submittal' })
  @ApiResponse({ status: 200, description: 'Steps retrieved successfully' })
  async getSteps(@Param('submittalId') submittalId: string) {
    return await this.workflowService.getStepsBySubmittal(submittalId);
  }

  @Get(':submittalId/summary')
  @ApiOperation({ summary: 'Get workflow execution summary' })
  @ApiResponse({ status: 200, description: 'Summary retrieved successfully' })
  async getWorkflowSummary(@Param('submittalId') submittalId: string) {
    return await this.workflowService.getWorkflowSummary(submittalId);
  }

  @Get('steps/:stepId')
  @ApiOperation({ summary: 'Get workflow step by ID' })
  @ApiResponse({ status: 200, description: 'Step retrieved successfully' })
  async getStep(@Param('stepId') stepId: string) {
    return await this.workflowService.getStepById(stepId);
  }

  @Post('steps/:stepId/complete')
  @ApiOperation({ summary: 'Complete workflow step' })
  @ApiResponse({ status: 200, description: 'Step completed successfully' })
  async completeStep(
    @Param('stepId') stepId: string,
    @Body() dto: CompleteWorkflowStepDto,
    @CurrentUser() user: User,
  ) {
    return await this.workflowService.completeStep(stepId, user.id, dto);
  }

  @Post('steps/:stepId/reassign')
  @ApiOperation({ summary: 'Reassign workflow step to different user' })
  @ApiResponse({ status: 200, description: 'Step reassigned successfully' })
  async reassignStep(
    @Param('stepId') stepId: string,
    @Body() body: { newAssigneeId: string; reason?: string },
    @CurrentUser() user: User,
  ) {
    return await this.workflowService.reassignStep(
      stepId,
      body.newAssigneeId,
      body.reason,
    );
  }

  @Post(':submittalId/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel workflow for submittal' })
  @ApiResponse({ status: 204, description: 'Workflow cancelled successfully' })
  async cancelWorkflow(
    @Param('submittalId') submittalId: string,
    @CurrentUser() user: User,
  ) {
    await this.workflowService.cancelWorkflow(submittalId);
  }

  // ==================== Lead Time Management ====================

  @Post('lead-time/calculate')
  @ApiOperation({ summary: 'Calculate lead time and critical dates' })
  @ApiResponse({ status: 200, description: 'Lead time calculated successfully' })
  async calculateLeadTime(
    @Param('projectId') projectId: string,
    @Body() dto: CalculateLeadTimeDto,
  ) {
    return await this.leadTimeService.calculateLeadTime(projectId, dto);
  }

  @Get('lead-time/configurations')
  @ApiOperation({ summary: 'Get lead time configurations for project' })
  @ApiResponse({ status: 200, description: 'Configurations retrieved successfully' })
  async getLeadTimeConfigurations(@Param('projectId') projectId: string) {
    return await this.leadTimeService.getLeadTimesByProject(projectId);
  }

  @Post('lead-time/configurations')
  @ApiOperation({ summary: 'Create lead time configuration' })
  @ApiResponse({ status: 201, description: 'Configuration created successfully' })
  async createLeadTimeConfiguration(
    @Param('projectId') projectId: string,
    @Body()
    body: {
      specSection?: string;
      submittalType?: string;
      fabricationDays: number;
      deliveryDays: number;
      reviewDays: number;
      isDefault?: boolean;
    },
  ) {
    return await this.leadTimeService.createLeadTime(projectId, body as any);
  }

  @Put('lead-time/configurations/:configId')
  @ApiOperation({ summary: 'Update lead time configuration' })
  @ApiResponse({ status: 200, description: 'Configuration updated successfully' })
  async updateLeadTimeConfiguration(
    @Param('configId') configId: string,
    @Body()
    body: Partial<{
      fabricationDays: number;
      deliveryDays: number;
      reviewDays: number;
      isDefault: boolean;
    }>,
  ) {
    return await this.leadTimeService.updateLeadTime(configId, body);
  }

  @Delete('lead-time/configurations/:configId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete lead time configuration' })
  @ApiResponse({ status: 204, description: 'Configuration deleted successfully' })
  async deleteLeadTimeConfiguration(@Param('configId') configId: string) {
    await this.leadTimeService.deleteLeadTime(configId);
  }

  @Get('lead-time/warnings')
  @ApiOperation({ summary: 'Get lead time warnings for project' })
  @ApiResponse({ status: 200, description: 'Warnings retrieved successfully' })
  async getLeadTimeWarnings(@Param('projectId') projectId: string) {
    return await this.leadTimeService.checkLeadTimeWarnings(projectId);
  }

  @Get('lead-time/critical')
  @ApiOperation({ summary: 'Get critical submittals (high priority warnings)' })
  @ApiResponse({ status: 200, description: 'Critical submittals retrieved successfully' })
  async getCriticalSubmittals(@Param('projectId') projectId: string) {
    return await this.leadTimeService.getCriticalSubmittals(projectId);
  }

  @Post('lead-time/validate')
  @ApiOperation({ summary: 'Validate if required on-site date is achievable' })
  @ApiResponse({ status: 200, description: 'Validation completed successfully' })
  async validateRequiredDate(
    @Param('projectId') projectId: string,
    @Body()
    body: {
      requiredOnSiteDate: string;
      specSection?: string;
      submittalType?: string;
    },
  ) {
    return await this.leadTimeService.validateRequiredDate(
      projectId,
      new Date(body.requiredOnSiteDate),
      body.specSection,
      body.submittalType as any,
    );
  }

  // ==================== Distribution Management ====================

  @Post(':submittalId/distribute')
  @ApiOperation({ summary: 'Distribute submittal to recipients' })
  @ApiResponse({ status: 201, description: 'Submittal distributed successfully' })
  async distributeSubmittal(
    @Param('submittalId') submittalId: string,
    @Body() dto: DistributeSubmittalDto,
    @CurrentUser() user: User,
  ) {
    return await this.distributionService.distributeSubmittal(
      submittalId,
      dto,
      user.id,
    );
  }

  @Get(':submittalId/distributions')
  @ApiOperation({ summary: 'Get distributions for submittal' })
  @ApiResponse({ status: 200, description: 'Distributions retrieved successfully' })
  async getDistributions(@Param('submittalId') submittalId: string) {
    return await this.distributionService.getDistributionsBySubmittal(submittalId);
  }

  @Get(':submittalId/distributions/summary')
  @ApiOperation({ summary: 'Get distribution summary' })
  @ApiResponse({ status: 200, description: 'Summary retrieved successfully' })
  async getDistributionSummary(@Param('submittalId') submittalId: string) {
    return await this.distributionService.getDistributionSummary(submittalId);
  }

  @Post('distributions/:distributionId/acknowledge')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Acknowledge receipt of distribution' })
  @ApiResponse({ status: 204, description: 'Distribution acknowledged successfully' })
  async acknowledgeDistribution(
    @Param('distributionId') distributionId: string,
    @CurrentUser() user: User,
  ) {
    await this.distributionService.acknowledgeDistribution(distributionId, user.id);
  }

  @Post('distributions/:distributionId/resend')
  @ApiOperation({ summary: 'Resend failed distribution' })
  @ApiResponse({ status: 200, description: 'Distribution resent successfully' })
  async resendDistribution(@Param('distributionId') distributionId: string) {
    return await this.distributionService.resendDistribution(distributionId);
  }

  @Delete('distributions/:distributionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete distribution record' })
  @ApiResponse({ status: 204, description: 'Distribution deleted successfully' })
  async deleteDistribution(@Param('distributionId') distributionId: string) {
    await this.distributionService.deleteDistribution(distributionId);
  }

  @Get('distributions/unacknowledged')
  @ApiOperation({ summary: 'Get unacknowledged distributions for project' })
  @ApiResponse({ status: 200, description: 'Distributions retrieved successfully' })
  async getUnacknowledgedDistributions(@Param('projectId') projectId: string) {
    return await this.distributionService.getUnacknowledgedDistributions(projectId);
  }

  // ==================== Scheduler Triggers (for testing) ====================

  @Post('scheduler/check-overdue')
  @ApiOperation({ summary: 'Manually trigger overdue check (for testing)' })
  @ApiResponse({ status: 200, description: 'Check completed successfully' })
  async triggerOverdueCheck() {
    return await this.schedulerService.triggerOverdueCheck();
  }

  @Post('scheduler/check-lead-time')
  @ApiOperation({ summary: 'Manually trigger lead time warnings (for testing)' })
  @ApiResponse({ status: 200, description: 'Check completed successfully' })
  async triggerLeadTimeWarnings(@Param('projectId') projectId: string) {
    return await this.schedulerService.triggerLeadTimeWarnings(projectId);
  }
}
