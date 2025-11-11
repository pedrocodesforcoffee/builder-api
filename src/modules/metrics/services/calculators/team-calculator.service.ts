import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { MetricCalculator } from '../../interfaces/metric-calculator.interface';
import { MetricResult } from '../../interfaces/metric-result.interface';
import { CalculationOptions } from '../../interfaces/calculation-options.interface';
import { ValidationResult } from '../../interfaces/validation-result.interface';
import { MetricGroup } from '../../enums/metric-group.enum';
import { Project } from '../../../projects/entities/project.entity';
import { ProjectMember } from '../../../projects/entities/project-member.entity';
import { ProjectRole } from '../../../users/enums/project-role.enum';

/**
 * TeamCalculator Service
 *
 * Calculates team and collaboration metrics including:
 * - Team size and composition
 * - Activity and engagement scores
 * - Contribution tracking
 * - User activity patterns
 */
@Injectable()
export class TeamCalculatorService implements MetricCalculator {
  private readonly logger = new Logger(TeamCalculatorService.name);

  readonly name = 'team';
  readonly group = MetricGroup.TEAM;
  readonly ttl = 600; // 10 minutes
  readonly isRealTime = false;
  readonly dependencies = [];

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly memberRepository: Repository<ProjectMember>,
  ) {}

  async calculate(projectId: string, options?: CalculationOptions): Promise<MetricResult> {
    const startTime = Date.now();

    try {
      const project = await this.projectRepository.findOne({
        where: { id: projectId },
      });

      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      const members = await this.memberRepository.find({
        where: { projectId },
        relations: ['user'],
      });

      // Calculate team metrics
      const totalMembers = members.length;
      const activeMembers = await this.calculateActiveMembers(members);
      const byRoleBreakdown = this.calculateByRoleBreakdown(members);
      const activityScore = this.calculateActivityScore(members);
      const engagementMetrics = await this.calculateEngagementMetrics(members, projectId);
      const topContributors = this.getTopContributors(members);
      const recentActivity = await this.getRecentActivity(members);

      // Team health indicators
      const teamHealth = this.calculateTeamHealth(
        totalMembers,
        activeMembers,
        activityScore,
        engagementMetrics,
      );

      // Permissions breakdown
      const permissionsBreakdown = this.calculatePermissionsBreakdown(members);

      // Activity patterns
      const activityPatterns = this.calculateActivityPatterns(members);

      const metrics = {
        totalMembers,
        activeMembers,
        inactiveMembers: totalMembers - activeMembers,

        // Role distribution
        byRole: byRoleBreakdown,

        // Activity metrics
        activityScore,
        engagement: engagementMetrics,

        // Top performers
        topContributors,

        // Recent activity
        recentActivity,

        // Team health
        teamHealth,

        // Permissions
        permissions: permissionsBreakdown,

        // Patterns
        activityPatterns,

        // Ratios
        activeRatio: totalMembers > 0 ? activeMembers / totalMembers : 0,
        averageEngagement: engagementMetrics.averageEngagement,
      };

      return {
        group: this.group,
        calculatedAt: new Date(),
        calculationDuration: Date.now() - startTime,
        metrics,
        values: this.formatMetricValues(metrics),
        kpis: {
          primary: {
            key: 'activeMembers',
            value: activeMembers,
            label: 'Active Members',
            format: 'number',
          },
          secondary: [
            {
              key: 'activityScore',
              value: activityScore,
              label: 'Activity Score',
              format: 'decimal',
              unit: '/10',
            },
            {
              key: 'engagement',
              value: engagementMetrics.weeklyActiveUsers,
              label: 'Weekly Active',
              format: 'number',
            },
          ],
        },
        summary: {
          total: totalMembers,
          active: activeMembers,
          roles: Object.keys(byRoleBreakdown).length,
          activityScore,
        },
        breakdown: {
          dimension: 'role',
          items: Object.entries(byRoleBreakdown).map(([role, data]) => ({
            name: this.formatRoleName(role),
            value: data.count,
            percentage: totalMembers > 0 ? (data.count / totalMembers) * 100 : 0,
            metadata: data,
          })),
        },
        dataSourceVersion: await this.getDataSourceVersion(projectId),
      };
    } catch (error) {
      this.logger.error(`Failed to calculate team metrics for project ${projectId}:`, error);
      throw error;
    }
  }

  async getDataSourceVersion(projectId: string): Promise<string> {
    const latestMember = await this.memberRepository.findOne({
      where: { projectId },
      order: { updatedAt: 'DESC' },
    });

    return latestMember?.updatedAt?.getTime()?.toString() || new Date().toISOString();
  }

  async validate(projectId: string): Promise<ValidationResult> {
    const errors = [];
    const warnings = [];

    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      errors.push({
        code: 'PROJECT_NOT_FOUND',
        message: `Project ${projectId} not found`,
      });
    }

    const memberCount = await this.memberRepository.count({
      where: { projectId },
    });

    if (memberCount === 0) {
      warnings.push({
        code: 'NO_MEMBERS',
        message: 'Project has no team members',
        suggestion: 'Add team members to track collaboration metrics',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        checkedAt: new Date(),
        checksPerformed: ['project_exists', 'members_exist'],
        dataAvailability: {
          project: !!project,
          members: memberCount > 0,
        },
      },
    };
  }

  private async calculateActiveMembers(members: ProjectMember[]): Promise<number> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Count members who have been active in the last 7 days
    // Based on lastAccessedAt field
    return members.filter((member) => {
      if (!member.lastAccessedAt) {
        return false;
      }
      return new Date(member.lastAccessedAt) >= sevenDaysAgo;
    }).length;
  }

  private calculateByRoleBreakdown(members: ProjectMember[]): Record<string, any> {
    const breakdown: Record<string, any> = {};

    members.forEach((member) => {
      const role = member.role;
      if (!breakdown[role]) {
        breakdown[role] = {
          count: 0,
          active: 0,
          permissions: [],
          users: [],
        };
      }

      breakdown[role].count++;

      // Check if active (last 7 days)
      if (member.lastAccessedAt) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        if (new Date(member.lastAccessedAt) >= sevenDaysAgo) {
          breakdown[role].active++;
        }
      }

      // Add user info (limited for privacy)
      breakdown[role].users.push({
        id: member.userId,
        joinedAt: member.joinedAt,
        lastAccessed: member.lastAccessedAt,
      });
    });

    return breakdown;
  }

  private calculateActivityScore(members: ProjectMember[]): number {
    if (members.length === 0) {
      return 0;
    }

    const now = new Date();
    const scores = members.map((member) => {
      let score = 0;

      // Recent access (max 5 points)
      if (member.lastAccessedAt) {
        const daysSinceAccess = Math.floor(
          (now.getTime() - new Date(member.lastAccessedAt).getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysSinceAccess === 0) score += 5;
        else if (daysSinceAccess <= 1) score += 4;
        else if (daysSinceAccess <= 3) score += 3;
        else if (daysSinceAccess <= 7) score += 2;
        else if (daysSinceAccess <= 14) score += 1;
      }

      // Role weight (max 3 points)
      if (member.role === ProjectRole.PROJECT_ADMIN) score += 3;
      else if (member.role === ProjectRole.PROJECT_MANAGER) score += 2.5;
      else if (member.role === ProjectRole.PROJECT_ENGINEER) score += 2;
      else if (member.role === ProjectRole.VIEWER) score += 1;
      else score += 1.5; // Other roles

      // Tenure (max 2 points)
      if (member.joinedAt) {
        const daysSinceJoined = Math.floor(
          (now.getTime() - new Date(member.joinedAt).getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysSinceJoined >= 90) score += 2;
        else if (daysSinceJoined >= 30) score += 1.5;
        else if (daysSinceJoined >= 7) score += 1;
        else score += 0.5;
      }

      return Math.min(10, score);
    });

    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return Math.round(averageScore * 10) / 10;
  }

  private async calculateEngagementMetrics(
    members: ProjectMember[],
    projectId: string,
  ): Promise<any> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dau = members.filter(
      (m) => m.lastAccessedAt && new Date(m.lastAccessedAt) >= oneDayAgo,
    ).length;

    const wau = members.filter(
      (m) => m.lastAccessedAt && new Date(m.lastAccessedAt) >= sevenDaysAgo,
    ).length;

    const mau = members.filter(
      (m) => m.lastAccessedAt && new Date(m.lastAccessedAt) >= thirtyDaysAgo,
    ).length;

    const totalMembers = members.length || 1;

    return {
      dailyActiveUsers: dau,
      weeklyActiveUsers: wau,
      monthlyActiveUsers: mau,
      dauPercentage: (dau / totalMembers) * 100,
      wauPercentage: (wau / totalMembers) * 100,
      mauPercentage: (mau / totalMembers) * 100,
      averageEngagement: ((dau + wau + mau) / 3 / totalMembers) * 100,
      stickiness: wau > 0 ? dau / wau : 0,
    };
  }

  private getTopContributors(members: ProjectMember[]): any[] {
    // Sort by last accessed (most recent first)
    const sortedMembers = [...members]
      .filter((m) => m.lastAccessedAt)
      .sort((a, b) => {
        const dateA = new Date(a.lastAccessedAt!).getTime();
        const dateB = new Date(b.lastAccessedAt!).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);

    return sortedMembers.map((member) => ({
      userId: member.userId,
      role: member.role,
      lastActive: member.lastAccessedAt,
      daysSinceActive: this.calculateDaysSince(member.lastAccessedAt!),
    }));
  }

  private async getRecentActivity(members: ProjectMember[]): Promise<any[]> {
    const recentMembers = [...members]
      .filter((m) => m.lastAccessedAt)
      .sort((a, b) => {
        const dateA = new Date(a.lastAccessedAt!).getTime();
        const dateB = new Date(b.lastAccessedAt!).getTime();
        return dateB - dateA;
      })
      .slice(0, 10);

    return recentMembers.map((member) => ({
      userId: member.userId,
      action: 'accessed_project',
      timestamp: member.lastAccessedAt,
      role: member.role,
    }));
  }

  private calculateTeamHealth(
    totalMembers: number,
    activeMembers: number,
    activityScore: number,
    engagement: any,
  ): any {
    let healthScore = 0;
    const indicators = [];

    // Active ratio (25%)
    const activeRatio = totalMembers > 0 ? activeMembers / totalMembers : 0;
    healthScore += activeRatio * 25;
    indicators.push({
      name: 'Active Ratio',
      value: activeRatio,
      weight: 25,
      status: activeRatio >= 0.7 ? 'good' : activeRatio >= 0.4 ? 'warning' : 'critical',
    });

    // Activity score (25%)
    const activityWeight = (activityScore / 10) * 25;
    healthScore += activityWeight;
    indicators.push({
      name: 'Activity Score',
      value: activityScore,
      weight: 25,
      status: activityScore >= 7 ? 'good' : activityScore >= 4 ? 'warning' : 'critical',
    });

    // Engagement (25%)
    const engagementScore = engagement.averageEngagement;
    healthScore += (engagementScore / 100) * 25;
    indicators.push({
      name: 'Engagement',
      value: engagementScore,
      weight: 25,
      status: engagementScore >= 70 ? 'good' : engagementScore >= 40 ? 'warning' : 'critical',
    });

    // Team size adequacy (25%)
    const sizeAdequacy = this.calculateSizeAdequacy(totalMembers);
    healthScore += sizeAdequacy * 25;
    indicators.push({
      name: 'Team Size',
      value: totalMembers,
      weight: 25,
      status: sizeAdequacy >= 0.7 ? 'good' : sizeAdequacy >= 0.4 ? 'warning' : 'critical',
    });

    return {
      score: Math.round(healthScore),
      status: healthScore >= 70 ? 'healthy' : healthScore >= 40 ? 'needs_attention' : 'critical',
      indicators,
    };
  }

  private calculateSizeAdequacy(teamSize: number): number {
    // Ideal team size is between 5-12 members
    if (teamSize >= 5 && teamSize <= 12) {
      return 1.0;
    } else if (teamSize < 5) {
      return teamSize / 5;
    } else {
      // Decreases as team gets too large
      return Math.max(0.3, 1 - (teamSize - 12) / 20);
    }
  }

  private calculatePermissionsBreakdown(members: ProjectMember[]): any {
    const breakdown = {
      admins: members.filter((m) => m.role === ProjectRole.PROJECT_ADMIN).length,
      managers: members.filter((m) => m.role === ProjectRole.PROJECT_MANAGER).length,
      engineers: members.filter((m) => m.role === ProjectRole.PROJECT_ENGINEER).length,
      viewers: members.filter((m) => m.role === ProjectRole.VIEWER).length,
    };

    return {
      ...breakdown,
      canEdit: breakdown.admins + breakdown.managers + breakdown.engineers,
      canView: members.length,
      readOnly: breakdown.viewers,
    };
  }

  private calculateActivityPatterns(members: ProjectMember[]): any {
    const patterns = {
      mostActiveDay: null as string | null,
      mostActiveHour: null as string | null,
      averageSessionsPerWeek: 0,
      peakConcurrentUsers: 0,
    };

    // This would require more detailed activity logging
    // For now, return mock data
    patterns.mostActiveDay = 'Tuesday';
    patterns.mostActiveHour = '10:00 AM';
    patterns.averageSessionsPerWeek = 3.5;
    patterns.peakConcurrentUsers = Math.ceil(members.length * 0.4);

    return patterns;
  }

  private calculateDaysSince(date: Date): number {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  private formatRoleName(role: string): string {
    const roleMap: Partial<Record<ProjectRole, string>> = {
      [ProjectRole.PROJECT_ADMIN]: 'Project Admin',
      [ProjectRole.PROJECT_MANAGER]: 'Project Manager',
      [ProjectRole.PROJECT_ENGINEER]: 'Project Engineer',
      [ProjectRole.SUPERINTENDENT]: 'Superintendent',
      [ProjectRole.FOREMAN]: 'Foreman',
      [ProjectRole.ARCHITECT_ENGINEER]: 'Architect/Engineer',
      [ProjectRole.SUBCONTRACTOR]: 'Subcontractor',
      [ProjectRole.OWNER_REP]: 'Owner Rep',
      [ProjectRole.INSPECTOR]: 'Inspector',
      [ProjectRole.VIEWER]: 'Viewer',
    };

    return roleMap[role as ProjectRole] || role;
  }

  private formatMetricValues(metrics: any): any[] {
    const values = [];

    values.push({
      key: 'totalMembers',
      value: metrics.totalMembers,
      label: 'Total Members',
      format: 'number',
    });

    values.push({
      key: 'activeMembers',
      value: metrics.activeMembers,
      label: 'Active Members',
      format: 'number',
      changePercentage: metrics.activeRatio * 100,
    });

    values.push({
      key: 'activityScore',
      value: metrics.activityScore,
      label: 'Activity Score',
      format: 'decimal',
      unit: '/10',
      hasAlert: metrics.activityScore < 4,
      alertSeverity: metrics.activityScore < 2 ? 'critical' : 'warning',
    });

    values.push({
      key: 'engagement',
      value: metrics.engagement.averageEngagement,
      label: 'Engagement',
      format: 'percentage',
      unit: '%',
    });

    values.push({
      key: 'teamHealth',
      value: metrics.teamHealth.score,
      label: 'Team Health',
      format: 'number',
      unit: '/100',
      hasAlert: metrics.teamHealth.score < 40,
      alertSeverity: metrics.teamHealth.score < 20 ? 'critical' : 'warning',
    });

    return values;
  }
}