/**
 * AI Dashboard Controller
 * Provides AI widgets for project and organization dashboards
 */

import { Controller, Get, Param, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AiDashboardService, ProjectDashboardAI, OrganizationDashboardAI } from '../services/ai-dashboard.service';

@ApiTags('AI Dashboard')
@Controller('ai/dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiDashboardController {
  constructor(private aiDashboardService: AiDashboardService) {}

  /**
   * Get AI widgets for project dashboard
   * Returns recommendations, similar projects, smart estimates, and risk indicators
   */
  @Get('project/:projectId/organization/:organizationId')
  @ApiOperation({
    summary: 'Get AI widgets for project dashboard',
    description: 'Returns AI-powered insights for project dashboard including recommendations, similar projects, estimates, and risk indicators',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI widgets retrieved successfully',
  })
  async getProjectDashboardWidgets(
    @Param('projectId') projectId: string,
    @Param('organizationId') organizationId: string,
  ): Promise<ProjectDashboardAI> {
    return this.aiDashboardService.getProjectDashboardWidgets(projectId, organizationId);
  }

  /**
   * Get AI widgets for organization dashboard
   * Returns patterns overview, lessons learned, recommendations summary, and ROI tracking
   */
  @Get('organization/:organizationId')
  @ApiOperation({
    summary: 'Get AI widgets for organization dashboard',
    description: 'Returns AI-powered insights for organization dashboard including patterns, lessons learned, and ROI tracking',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI widgets retrieved successfully',
  })
  async getOrganizationDashboardWidgets(
    @Param('organizationId') organizationId: string,
  ): Promise<OrganizationDashboardAI> {
    return this.aiDashboardService.getOrganizationDashboardWidgets(organizationId);
  }
}
