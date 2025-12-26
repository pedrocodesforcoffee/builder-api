import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  Request,
} from '@nestjs/common';
import { WorkflowService } from '../services/workflow.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  ListTemplatesDto,
} from '../dto/workflow.dto';

@Controller()
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post('projects/:projectId/workflow-templates')
  async createTemplate(
    @Param('projectId') projectId: string,
    @Body() dto: CreateTemplateDto,
    @Request() req: any,
  ) {
    return this.workflowService.createTemplate(projectId, req.user.id, dto);
  }

  @Get('projects/:projectId/workflow-templates')
  async listTemplates(
    @Param('projectId') projectId: string,
    @Query() query: ListTemplatesDto,
  ) {
    return this.workflowService.listTemplates(projectId, query);
  }

  @Get('workflow-templates/:templateId')
  async getTemplate(@Param('templateId') templateId: string) {
    return this.workflowService.getTemplate(templateId);
  }

  @Put('workflow-templates/:templateId')
  async updateTemplate(
    @Param('templateId') templateId: string,
    @Body() dto: UpdateTemplateDto,
    @Request() req: any,
  ) {
    return this.workflowService.updateTemplate(templateId, req.user.id, dto);
  }
}
