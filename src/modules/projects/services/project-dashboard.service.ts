import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { ProjectPhase } from '../entities/project-phase.entity';
import { ProjectMilestone } from '../entities/project-milestone.entity';
import { ProjectMember } from '../entities/project-member.entity';
import { User } from '../../users/entities/user.entity';
import { DocumentService } from '../../documents/services/document.service';
import { ProjectFolderService } from './project-folder.service';

/**
 * Project Dashboard Service
 *
 * Handles all data queries for the project dashboard:
 * - Metrics calculation
 * - Phase and milestone data
 * - Team member information
 * - Chart data generation
 * - Recent documents
 */
@Injectable()
export class ProjectDashboardService {
  constructor(
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    @InjectRepository(ProjectPhase)
    private phaseRepo: Repository<ProjectPhase>,
    @InjectRepository(ProjectMilestone)
    private milestoneRepo: Repository<ProjectMilestone>,
    @InjectRepository(ProjectMember)
    private projectMemberRepo: Repository<ProjectMember>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private documentService: DocumentService,
    private folderService: ProjectFolderService,
  ) {}

  /**
   * Calculate project metrics from database
   */
  async getMetrics(projectId: string) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const phases = await this.phaseRepo.find({
      where: { projectId },
      order: { order: 'ASC' },
    });

    // Calculate budget metrics
    const originalBudget = (project as any).currentContract || (project as any).originalContract || 0;
    const totalBudgeted = phases.reduce(
      (sum, phase) => sum + (phase.budgetedCost || 0),
      0,
    );
    const totalSpent = phases.reduce(
      (sum, phase) => sum + (phase.actualCost || 0),
      0,
    );
    const remaining = originalBudget - totalSpent;
    const variance = totalBudgeted - totalSpent;
    const percentConsumed =
      originalBudget > 0 ? Math.round((totalSpent / originalBudget) * 100) : 0;

    // Calculate schedule metrics
    const completedPhases = phases.filter(
      (p) => p.status === 'COMPLETED',
    ).length;
    const totalPhases = phases.length;
    const plannedProgress =
      totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;

    // Calculate actual progress based on phase percentComplete
    const actualProgress =
      totalPhases > 0
        ? Math.round(
            phases.reduce((sum, p) => sum + (p.percentComplete || 0), 0) /
              totalPhases,
          )
        : 0;

    // Calculate days remaining
    const today = new Date();
    const endDate = project.endDate ? new Date(project.endDate) : today;
    const daysRemaining = Math.max(
      0,
      Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
    );

    const scheduleStatus =
      actualProgress > plannedProgress
        ? 'ahead'
        : actualProgress < plannedProgress
          ? 'behind'
          : 'on-track';

    return {
      budget: {
        original: originalBudget,
        current: totalBudgeted,
        spent: totalSpent,
        remaining,
        variance,
        percentConsumed,
        trend: variance > 0 ? 'under' : variance < 0 ? 'over' : 'stable',
      },
      schedule: {
        plannedProgress,
        actualProgress,
        daysRemaining,
        status: scheduleStatus,
      },
      rfis: {
        open: 0,
        pendingResponse: 0,
        overdue: 0,
        avgResponseTime: 0,
        closedThisWeek: 0,
      },
      safety: {
        daysSinceIncident: 0,
        totalIncidentsYTD: 0,
        openIssues: 0,
        safetyScore: 100,
      },
      changeOrders: {
        pendingApproval: 0,
        approvedThisMonth: 0,
        totalValue: 0,
        budgetImpact: 0,
      },
      workforce: {
        onSiteToday: 0,
        planned: 0,
        hoursThisWeek: 0,
        activeSubcontractors: 0,
      },
    };
  }

  /**
   * Helper function to safely format dates (handles both Date objects and strings)
   */
  private formatDate(date: Date | string | null | undefined): string | null {
    if (!date) return null;

    try {
      // If it's already a Date object, use toISOString
      if (date instanceof Date) {
        return date.toISOString().split('T')[0];
      }

      // If it's a string, create a Date object from it
      if (typeof date === 'string') {
        const dateObj = new Date(date);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toISOString().split('T')[0];
        }
      }

      return null;
    } catch (error) {
      console.error('[formatDate] Error formatting date:', date, error);
      return null;
    }
  }

  /**
   * Get project phases and milestones
   */
  async getPhasesAndMilestones(projectId: string) {
    const phases = await this.phaseRepo.find({
      where: { projectId },
      order: { order: 'ASC' },
    });

    const milestones = await this.milestoneRepo.find({
      where: { projectId },
      order: { order: 'ASC' },
    });

    const mappedPhases = phases.map((phase) => ({
      id: phase.id,
      name: phase.name,
      plannedStart: this.formatDate(phase.startDate),
      plannedEnd: this.formatDate(phase.endDate),
      actualStart: this.formatDate(phase.actualStartDate),
      actualEnd: this.formatDate(phase.actualEndDate),
      percentComplete: phase.percentComplete || 0,
      status: phase.status.toLowerCase().replace('_', '-'),
    }));

    const mappedMilestones = milestones.map((milestone) => ({
      id: milestone.id,
      name: milestone.name,
      date: this.formatDate(milestone.plannedDate),
      status: milestone.status.toLowerCase(),
      phaseId: milestone.phaseId,
    }));

    return {
      phases: mappedPhases,
      milestones: mappedMilestones,
    };
  }

  /**
   * Get team members for the project
   */
  async getTeamMembers(projectId: string) {
    const members = await this.projectMemberRepo.find({
      where: { projectId },
      relations: ['user'],
    });

    return {
      members: members.map((member) => ({
        id: member.userId,
        name: `${member.user.firstName} ${member.user.lastName}`,
        role: this.formatRole(member.role),
        avatar: null,
        status: 'offline', // TODO: Implement presence tracking
        location: 'remote',
        lastActive: new Date().toISOString(),
        email: member.user.email,
        phone: member.user.phoneNumber || null,
      })),
      summary: {
        total: members.length,
        online: 0,
        onSite: 0,
        remote: members.length,
      },
    };
  }

  /**
   * Get S-curve data from phases
   */
  async getSCurveData(projectId: string) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const phases = await this.phaseRepo.find({
      where: { projectId },
      order: { startDate: 'ASC' },
    });

    const startDate = project.startDate
      ? new Date(project.startDate)
      : new Date();
    const endDate = project.endDate ? new Date(project.endDate) : new Date();

    // Generate monthly data points
    const dataPoints = [];
    const totalBudget = (project as any).currentContract || (project as any).originalContract || 0;

    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      // Calculate planned and actual cumulative progress
      let plannedPercent = 0;
      let actualPercent = 0;
      let budgetPercent = 0;

      phases.forEach((phase) => {
        const phaseStart = phase.startDate
          ? new Date(phase.startDate)
          : startDate;
        const phaseEnd = phase.endDate ? new Date(phase.endDate) : endDate;

        if (currentDate >= phaseEnd) {
          // Phase should be complete
          plannedPercent += 100 / phases.length;
          actualPercent += (phase.percentComplete || 0) / phases.length;
          budgetPercent +=
            ((phase.actualCost || 0) / totalBudget) * 100;
        } else if (currentDate >= phaseStart) {
          // Phase is in progress
          const phaseDuration =
            phaseEnd.getTime() - phaseStart.getTime();
          const elapsed = currentDate.getTime() - phaseStart.getTime();
          const phaseProgress = Math.min(100, (elapsed / phaseDuration) * 100);
          plannedPercent += phaseProgress / phases.length;
          actualPercent += (phase.percentComplete || 0) / phases.length;
          budgetPercent +=
            ((phase.actualCost || 0) / totalBudget) * 100;
        }
      });

      dataPoints.push({
        date: currentDate.toISOString().split('T')[0],
        plannedPercent: Math.round(Math.min(100, plannedPercent)),
        actualPercent: Math.round(Math.min(100, actualPercent)),
        budgetPercent: Math.round(Math.min(100, budgetPercent)),
      });

      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return { dataPoints };
  }

  /**
   * Get burndown data from phases
   */
  async getBurndownData(projectId: string) {
    const phases = await this.phaseRepo.find({
      where: { projectId },
      order: { order: 'ASC' },
    });

    // Use phases as work items (simplified burndown)
    const totalWork = phases.length * 100; // Each phase represents 100 work units
    const dataPoints = [];

    // Generate weekly burndown
    for (let week = 1; week <= 20; week++) {
      const completedWork = phases
        .slice(0, Math.min(week / 4, phases.length))
        .reduce((sum, phase) => sum + (phase.percentComplete || 0), 0);

      dataPoints.push({
        week: `2024-W${String(week).padStart(2, '0')}`,
        planned: Math.max(0, totalWork - week * (totalWork / 20)),
        actual: Math.max(0, totalWork - completedWork),
        completed: Math.round(completedWork / phases.length),
      });
    }

    return {
      dataPoints,
      totalWork,
    };
  }

  /**
   * Get budget burn data from phases
   */
  async getBudgetBurnData(projectId: string) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const phases = await this.phaseRepo.find({
      where: { projectId },
      order: { startDate: 'ASC' },
    });

    const totalBudget = (project as any).currentContract || (project as any).originalContract || 0;
    const monthlyBudget = totalBudget / 12;

    const dataPoints = [];

    for (let i = 1; i <= 12; i++) {
      const monthStr = `2024-${String(i).padStart(2, '0')}`;

      // Calculate actual spend for completed/in-progress phases
      const actualSpend = phases.reduce((sum, phase) => {
        if (phase.actualStartDate && new Date(phase.actualStartDate).getMonth() + 1 <= i) {
          return sum + (phase.actualCost || 0) / 12;
        }
        return sum;
      }, 0);

      dataPoints.push({
        month: monthStr,
        planned: monthlyBudget,
        actual: actualSpend,
        categories: {
          labor: actualSpend * 0.4,
          materials: actualSpend * 0.3,
          equipment: actualSpend * 0.15,
          subcontractors: actualSpend * 0.1,
          other: actualSpend * 0.05,
        },
      });
    }

    return {
      dataPoints,
      totalBudget,
    };
  }

  /**
   * Get recent documents for project dashboard
   *
   * Note: Now uses Document Management System (/api/projects/:projectId/documents)
   */
  async getRecentDocuments(projectId: string) {
    // Get recent documents from Document Management System
    const documents = await this.documentService.getProjectDocuments(projectId, {
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      limit: 10,
      offset: 0,
    });

    // Get root folders for quick access
    const folders = await this.folderService.findAll(projectId, {
      parentId: null,
    });

    return {
      documents: documents.map((doc) => ({
        id: doc.id,
        name: doc.name,
        type: 'document',
        size: doc.currentVersion?.fileSize || 0,
        lastModified: doc.updatedAt.toISOString(),
        folder: 'Documents', // All documents are in Document Management System
        url: `/api/projects/${projectId}/documents/${doc.id}`,
        uploadedBy: 'User', // TODO: Add user relationship to Document entity
      })),
      folders: folders.slice(0, 6).map((folder) => ({
        id: folder.id,
        name: folder.name,
        count: folder.fileCount || 0,
        icon: folder.icon || '📁',
      })),
    };
  }

  /**
   * Format project role for display
   */
  private formatRole(role: string): string {
    return role
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}
