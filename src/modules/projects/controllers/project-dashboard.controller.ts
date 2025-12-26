import {
  Controller,
  Get,
  Param,
  UseGuards,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { ProjectDashboardService } from '../services/project-dashboard.service';

/**
 * Project Dashboard Controller
 *
 * Handles all dashboard-related endpoints for project analytics:
 * - Activity timeline
 * - Team members presence
 * - Recent documents
 * - Project metrics
 * - Chart data (phases, milestones, s-curve, burndown, budget burn)
 *
 * All endpoints require authentication (JwtAuthGuard)
 */
@Controller('projects/:projectId/dashboard')
@UseGuards(JwtAuthGuard)
export class ProjectDashboardController {
  constructor(private readonly dashboardService: ProjectDashboardService) {}

  /**
   * Get project activity timeline
   *
   * GET /projects/:projectId/dashboard/activity
   *
   * Returns recent activities for the project including:
   * - Project updates
   * - Status changes
   * - Document uploads
   * - Team member additions
   * - RFI submissions
   * - Change order creation
   *
   * @param projectId - Project UUID
   * @param req - Request with authenticated user
   * @returns Array of activity entries
   */
  @Get('activity')
  async getActivity(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Req() req: Request,
  ) {
    const userId = (req as any).user.id;

    // TODO: Implement actual activity service
    // For now, return sample data structure
    return {
      activities: [
        {
          id: '1',
          type: 'PROJECT_UPDATED',
          description: 'updated project timeline',
          user: {
            id: userId,
            firstName: 'John',
            lastName: 'Smith',
            avatar: null,
          },
          entityType: 'project',
          entityId: projectId,
          entityName: 'Sample Project',
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          metadata: {
            changes: ['endDate'],
          },
        },
        {
          id: '2',
          type: 'DOCUMENT_UPLOADED',
          description: 'uploaded Daily Report - March 15.pdf',
          user: {
            id: userId,
            firstName: 'Sarah',
            lastName: 'Johnson',
            avatar: null,
          },
          entityType: 'document',
          entityId: 'doc-123',
          entityName: 'Daily Report - March 15.pdf',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          metadata: {
            fileSize: 245000,
            fileType: 'pdf',
          },
        },
        {
          id: '3',
          type: 'RFI_SUBMITTED',
          description: 'submitted RFI for foundation specifications',
          user: {
            id: userId,
            firstName: 'Mike',
            lastName: 'Davis',
            avatar: null,
          },
          entityType: 'rfi',
          entityId: 'rfi-456',
          entityName: 'RFI-2024-015',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          metadata: {
            priority: 'high',
            status: 'pending',
          },
        },
      ],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 3,
        totalPages: 1,
      },
    };
  }

  /**
   * Get project team members with presence status
   *
   * GET /projects/:projectId/dashboard/team
   *
   * Returns team members assigned to the project with:
   * - Online/offline status
   * - On-site/remote location
   * - Last active timestamp
   * - Contact information
   *
   * @param projectId - Project UUID
   * @returns Array of team members with presence data
   */
  @Get('team')
  async getTeamMembers(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.dashboardService.getTeamMembers(projectId);
  }

  /**
   * Get recent documents
   *
   * GET /projects/:projectId/dashboard/documents/recent
   *
   * Returns recently accessed or uploaded documents with:
   * - Document metadata
   * - File type and size
   * - Last modified timestamp
   * - Uploader information
   *
   * @param projectId - Project UUID
   * @returns Array of recent documents and quick access folders
   */
  @Get('documents/recent')
  async getRecentDocuments(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.dashboardService.getRecentDocuments(projectId);
  }

  /**
   * Get project metrics for dashboard
   *
   * GET /projects/:projectId/dashboard/metrics
   *
   * Returns comprehensive metrics including:
   * - Budget (original, current, spent, remaining, variance)
   * - Schedule (planned/actual progress, days remaining, status)
   * - RFIs (open, pending, overdue, average response time)
   * - Safety (days since incident, total incidents YTD, safety score)
   * - Change Orders (pending, approved, total value, budget impact)
   * - Workforce (on-site today, planned, hours this week, subcontractors)
   *
   * @param projectId - Project UUID
   * @returns Project metrics object
   */
  @Get('metrics')
  async getMetrics(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.dashboardService.getMetrics(projectId);
  }

  /**
   * Get project phases and milestones for Gantt chart
   *
   * GET /projects/:projectId/dashboard/phases
   *
   * Returns project phases with planned/actual dates and milestones
   *
   * @param projectId - Project UUID
   * @returns Phases and milestones data
   */
  @Get('phases')
  async getPhases(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.dashboardService.getPhasesAndMilestones(projectId);
  }

  /**
   * Get S-curve data for progress tracking
   *
   * GET /projects/:projectId/dashboard/s-curve
   *
   * Returns cumulative progress data (planned vs actual vs budget)
   *
   * @param projectId - Project UUID
   * @returns S-curve data points
   */
  @Get('s-curve')
  async getSCurveData(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.dashboardService.getSCurveData(projectId);
  }

  /**
   * Get burndown data for work tracking
   *
   * GET /projects/:projectId/dashboard/burndown
   *
   * Returns weekly burndown data showing remaining work
   *
   * @param projectId - Project UUID
   * @returns Burndown data points
   */
  @Get('burndown')
  async getBurndownData(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.dashboardService.getBurndownData(projectId);
  }

  /**
   * Get budget burn data for financial tracking
   *
   * GET /projects/:projectId/dashboard/budget-burn
   *
   * Returns monthly budget spend data with category breakdown
   *
   * @param projectId - Project UUID
   * @returns Budget burn data points
   */
  @Get('budget-burn')
  async getBudgetBurnData(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.dashboardService.getBudgetBurnData(projectId);
  }
}
