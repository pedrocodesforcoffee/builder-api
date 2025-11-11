import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { ProjectRelationship } from '../entities/project-relationship.entity';
import { ProjectDependency } from '../entities/project-dependency.entity';

@Injectable()
export class PortfolioAnalyticsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectRelationship)
    private readonly relationshipRepository: Repository<ProjectRelationship>,
    @InjectRepository(ProjectDependency)
    private readonly dependencyRepository: Repository<ProjectDependency>,
  ) {}

  /**
   * Get health metrics for the entire portfolio
   */
  async getHealthMetrics(organizationId: string): Promise<any> {
    // Get all projects for the organization
    const projects = await this.projectRepository.find({
      where: { organizationId },
    });

    if (projects.length === 0) {
      return this.getEmptyMetrics();
    }

    // Calculate status metrics
    const statusMetrics = this.calculateStatusMetrics(projects);

    // Calculate budget performance
    const budgetPerformance = await this.calculateBudgetPerformance(projects);

    // Calculate schedule performance
    const schedulePerformance = this.calculateSchedulePerformance(projects);

    // Calculate resource utilization
    const resourceUtilization = await this.calculateResourceUtilization(organizationId);

    // Calculate quality metrics
    const qualityMetrics = this.calculateQualityMetrics(projects);

    // Calculate overall health score
    const overallHealthScore = this.calculateOverallHealthScore(
      statusMetrics,
      budgetPerformance,
      schedulePerformance,
      resourceUtilization,
      qualityMetrics,
    );

    return {
      overallHealthScore,
      statusMetrics,
      budgetPerformance,
      schedulePerformance,
      resourceUtilization,
      qualityMetrics,
      trends: await this.calculateTrends(organizationId),
      recommendations: this.generateHealthRecommendations(overallHealthScore),
      lastUpdated: new Date(),
    };
  }

  /**
   * Get risk analysis for the portfolio
   */
  async getRiskAnalysis(organizationId: string): Promise<any> {
    const projects = await this.projectRepository.find({
      where: { organizationId },
    });

    // Identify risks
    const scheduleRisks = await this.identifyScheduleRisks(projects);
    const budgetRisks = await this.identifyBudgetRisks(projects);
    const dependencyRisks = await this.identifyDependencyRisks(organizationId);
    const resourceRisks = await this.identifyResourceRisks(projects);

    // Calculate risk scores
    const riskMatrix = this.buildRiskMatrix(projects);

    // Identify high-risk projects
    const highRiskProjects = projects
      .filter((p: Project) => this.calculateProjectRiskScore(p) > 70)
      .map((p: Project) => ({
        id: p.id,
        name: p.name,
        riskScore: this.calculateProjectRiskScore(p),
        primaryRisk: this.identifyPrimaryRisk(p),
      }));

    // Generate mitigation strategies
    const mitigationStrategies = this.generateMitigationStrategies(
      scheduleRisks,
      budgetRisks,
      dependencyRisks,
      resourceRisks,
    );

    return {
      summary: {
        totalRisks: scheduleRisks.length + budgetRisks.length +
                   dependencyRisks.length + resourceRisks.length,
        highPriorityRisks: highRiskProjects.length,
        averageRiskScore: this.calculateAverageRiskScore(projects),
      },
      risksByCategory: {
        schedule: scheduleRisks,
        budget: budgetRisks,
        dependency: dependencyRisks,
        resource: resourceRisks,
      },
      riskMatrix,
      highRiskProjects,
      mitigationStrategies,
      riskTrends: await this.calculateRiskTrends(organizationId),
    };
  }

  /**
   * Get resource utilization analysis
   */
  async getResourceUtilization(organizationId: string): Promise<any> {
    const projects = await this.projectRepository.find({
      where: { organizationId },
    });

    // Calculate resource allocation
    const resourceAllocation = await this.calculateResourceAllocation(projects);

    // Calculate utilization rates
    const utilizationRates = this.calculateUtilizationRates(resourceAllocation);

    // Identify over/under allocated resources
    const allocationIssues = this.identifyAllocationIssues(resourceAllocation);

    // Calculate capacity vs demand
    const capacityAnalysis = await this.analyzeCapacityVsDemand(organizationId);

    // Resource forecast
    const forecast = this.generateResourceForecast(projects, resourceAllocation);

    return {
      summary: {
        totalResources: resourceAllocation.total,
        allocatedResources: resourceAllocation.allocated,
        availableResources: resourceAllocation.available,
        utilizationRate: utilizationRates.overall,
      },
      utilizationRates,
      allocationByProject: resourceAllocation.byProject,
      allocationByType: resourceAllocation.byType,
      allocationIssues,
      capacityAnalysis,
      forecast,
      recommendations: this.generateResourceRecommendations(
        utilizationRates,
        allocationIssues,
      ),
    };
  }

  private calculateStatusMetrics(projects: Project[]): any {
    const total = projects.length;
    const statusCounts = projects.reduce((acc: Record<string, number>, p: Project) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const onTrack = statusCounts['ON_TRACK'] || statusCounts['ACTIVE'] || 0;
    const atRisk = statusCounts['AT_RISK'] || 0;
    const delayed = statusCounts['DELAYED'] || 0;
    const completed = statusCounts['COMPLETED'] || 0;
    const cancelled = statusCounts['CANCELLED'] || 0;

    return {
      total,
      onTrack,
      atRisk,
      delayed,
      completed,
      cancelled,
      onTrackPercentage: total > 0 ? (onTrack / total) * 100 : 0,
      atRiskPercentage: total > 0 ? (atRisk / total) * 100 : 0,
      delayedPercentage: total > 0 ? (delayed / total) * 100 : 0,
    };
  }

  private async calculateBudgetPerformance(projects: Project[]): Promise<any> {
    const projectsWithBudget = projects.filter((p: Project) => (p as any).budget);
    const totalBudget = projectsWithBudget.reduce((sum: number, p: Project) => sum + ((p as any).budget || 0), 0);
    const totalSpent = projectsWithBudget.reduce((sum: number, p: Project) => sum + ((p as any).actualCost || 0), 0);

    const overBudgetProjects = projectsWithBudget.filter((p: Project) =>
      (p as any).actualCost && (p as any).budget && (p as any).actualCost > (p as any).budget
    );

    const underBudgetProjects = projectsWithBudget.filter((p: Project) =>
      (p as any).actualCost && (p as any).budget && (p as any).actualCost <= (p as any).budget * 0.9
    );

    return {
      totalBudget,
      totalSpent,
      variance: totalBudget - totalSpent,
      variancePercentage: totalBudget > 0 ? ((totalBudget - totalSpent) / totalBudget) * 100 : 0,
      overBudgetCount: overBudgetProjects.length,
      underBudgetCount: underBudgetProjects.length,
      costPerformanceIndex: totalBudget > 0 ? totalSpent / totalBudget : 0,
      averageVariance: this.calculateAverageVariance(projectsWithBudget),
    };
  }

  private calculateSchedulePerformance(projects: Project[]): any {
    const projectsWithSchedule = projects.filter((p: Project) => p.startDate && p.endDate);
    const now = new Date();

    const onSchedule = projectsWithSchedule.filter((p: Project) => {
      const endDate = new Date(p.endDate!);
      return endDate >= now || (p as any).status === 'COMPLETED';
    });

    const behind = projectsWithSchedule.filter((p: Project) => {
      if ((p as any).status === 'COMPLETED') return false;
      const endDate = new Date(p.endDate!);
      return endDate < now;
    });

    const ahead = projectsWithSchedule.filter((p: Project) => {
      if (!(p as any).progressPercentage || (p as any).status === 'COMPLETED') return false;
      const totalDuration = new Date(p.endDate!).getTime() - new Date(p.startDate!).getTime();
      const elapsed = now.getTime() - new Date(p.startDate!).getTime();
      const expectedProgress = (elapsed / totalDuration) * 100;
      return (p as any).progressPercentage > expectedProgress + 10;
    });

    return {
      total: projectsWithSchedule.length,
      onSchedule: onSchedule.length,
      behind: behind.length,
      ahead: ahead.length,
      schedulePerformanceIndex: this.calculateSPI(projectsWithSchedule),
      averageDelay: this.calculateAverageDelay(behind),
    };
  }

  private async calculateResourceUtilization(organizationId: string): Promise<any> {
    // This would typically query actual resource data
    // For now, returning calculated estimates
    const projects = await this.projectRepository.count({
      where: { organizationId, status: 'ACTIVE' as any },
    });

    const baseUtilization = Math.min(95, projects * 15);

    return {
      overall: baseUtilization,
      byRole: {
        developers: baseUtilization + 5,
        designers: baseUtilization - 10,
        managers: baseUtilization + 10,
        analysts: baseUtilization - 5,
      },
      trend: 'STABLE',
    };
  }

  private calculateQualityMetrics(projects: Project[]): any {
    // Calculate quality based on project metadata
    const qualityScores = projects.map((p: Project) => {
      let score = 70; // Base score

      // Adjust based on status
      if ((p as any).status === 'COMPLETED') score += 10;
      if ((p as any).status === 'AT_RISK') score -= 15;
      if ((p as any).status === 'DELAYED') score -= 20;

      // Adjust based on budget performance
      if ((p as any).budget && (p as any).actualCost) {
        const variance = ((p as any).actualCost - (p as any).budget) / (p as any).budget;
        if (variance <= 0) score += 10;
        else if (variance > 0.2) score -= 15;
      }

      return Math.max(0, Math.min(100, score));
    });

    const averageQuality = qualityScores.reduce((sum: number, s: number) => sum + s, 0) / (qualityScores.length || 1);

    return {
      averageScore: averageQuality,
      distribution: {
        excellent: qualityScores.filter((s: number) => s >= 90).length,
        good: qualityScores.filter((s: number) => s >= 70 && s < 90).length,
        fair: qualityScores.filter((s: number) => s >= 50 && s < 70).length,
        poor: qualityScores.filter((s: number) => s < 50).length,
      },
    };
  }

  private calculateOverallHealthScore(
    statusMetrics: any,
    budgetPerformance: any,
    schedulePerformance: any,
    resourceUtilization: any,
    qualityMetrics: any,
  ): number {
    const weights = {
      status: 0.25,
      budget: 0.25,
      schedule: 0.25,
      resource: 0.15,
      quality: 0.10,
    };

    const statusScore = statusMetrics.onTrackPercentage;
    const budgetScore = Math.max(0, 100 - Math.abs(budgetPerformance.variancePercentage));
    const scheduleScore = schedulePerformance.total > 0
      ? (schedulePerformance.onSchedule / schedulePerformance.total) * 100
      : 100;
    const resourceScore = 100 - Math.abs(resourceUtilization.overall - 75);
    const qualityScore = qualityMetrics.averageScore;

    const overallScore =
      statusScore * weights.status +
      budgetScore * weights.budget +
      scheduleScore * weights.schedule +
      resourceScore * weights.resource +
      qualityScore * weights.quality;

    return Math.round(overallScore);
  }

  private async calculateTrends(organizationId: string): Promise<any> {
    // This would typically analyze historical data
    // For now, returning sample trends
    return {
      health: 'IMPROVING',
      budget: 'STABLE',
      schedule: 'DECLINING',
      quality: 'STABLE',
      periodComparison: {
        currentQuarter: 75,
        lastQuarter: 70,
        lastYear: 65,
      },
    };
  }

  private generateHealthRecommendations(healthScore: number): string[] {
    const recommendations = [];

    if (healthScore < 50) {
      recommendations.push('Critical: Portfolio health requires immediate attention');
      recommendations.push('Consider pausing new projects to focus on existing ones');
      recommendations.push('Schedule emergency review meetings for at-risk projects');
    } else if (healthScore < 70) {
      recommendations.push('Review and adjust resource allocation across projects');
      recommendations.push('Implement stricter change control processes');
      recommendations.push('Increase monitoring frequency for at-risk projects');
    } else if (healthScore < 85) {
      recommendations.push('Continue monitoring current trends');
      recommendations.push('Consider implementing best practices from successful projects');
    } else {
      recommendations.push('Excellent portfolio health - maintain current practices');
      recommendations.push('Document and share successful strategies');
    }

    return recommendations;
  }

  private async identifyScheduleRisks(projects: Project[]): Promise<any[]> {
    const risks = [];
    const now = new Date();

    for (const project of projects) {
      if (!project.endDate || (project as any).status === 'COMPLETED') continue;

      const endDate = new Date(project.endDate);
      const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysRemaining < 0) {
        risks.push({
          projectId: project.id,
          projectName: project.name,
          type: 'OVERDUE',
          severity: 'HIGH',
          daysOverdue: Math.abs(daysRemaining),
          impact: 'Project delivery delayed',
        });
      } else if (daysRemaining < 30 && (project as any).progressPercentage < 80) {
        risks.push({
          projectId: project.id,
          projectName: project.name,
          type: 'AT_RISK',
          severity: 'MEDIUM',
          daysRemaining,
          progressGap: 80 - (project as any).progressPercentage,
          impact: 'May not complete on time',
        });
      }
    }

    return risks;
  }

  private async identifyBudgetRisks(projects: Project[]): Promise<any[]> {
    const risks = [];

    for (const project of projects) {
      if (!(project as any).budget) continue;

      const spent = (project as any).actualCost || 0;
      const burnRate = (project as any).progressPercentage
        ? spent / (project as any).progressPercentage
        : 0;
      const projectedCost = burnRate * 100;

      if (spent > (project as any).budget) {
        risks.push({
          projectId: project.id,
          projectName: project.name,
          type: 'OVER_BUDGET',
          severity: 'HIGH',
          overrunAmount: spent - (project as any).budget,
          overrunPercentage: ((spent - (project as any).budget) / (project as any).budget) * 100,
        });
      } else if (projectedCost > (project as any).budget * 1.1) {
        risks.push({
          projectId: project.id,
          projectName: project.name,
          type: 'BUDGET_RISK',
          severity: 'MEDIUM',
          projectedOverrun: projectedCost - (project as any).budget,
          currentBurnRate: burnRate,
        });
      }
    }

    return risks;
  }

  private async identifyDependencyRisks(organizationId: string): Promise<any[]> {
    const query = `
      SELECT
        pd.id,
        pd.predecessor_id,
        pd.successor_id,
        p1.name as predecessor_name,
        p2.name as successor_name,
        pd.is_critical,
        p1.status as predecessor_status,
        p1.end_date as predecessor_end,
        p2.start_date as successor_start
      FROM project_dependencies pd
      JOIN projects p1 ON pd.predecessor_id = p1.id
      JOIN projects p2 ON pd.successor_id = p2.id
      WHERE p1.organization_id = $1
        AND pd.status = 'ACTIVE'
        AND pd.is_critical = true
    `;

    const dependencies = await this.dependencyRepository.query(query, [organizationId]);

    const risks = [];
    for (const dep of dependencies) {
      if (dep.predecessor_status === 'DELAYED' || dep.predecessor_status === 'AT_RISK') {
        risks.push({
          type: 'CRITICAL_DEPENDENCY',
          severity: 'HIGH',
          predecessorId: dep.predecessor_id,
          predecessorName: dep.predecessor_name,
          successorId: dep.successor_id,
          successorName: dep.successor_name,
          impact: 'Successor project blocked or delayed',
        });
      }
    }

    return risks;
  }

  private async identifyResourceRisks(projects: Project[]): Promise<any[]> {
    // Simplified resource risk identification
    const activeProjects = projects.filter((p: Project) => (p as any).status === 'ACTIVE' || (p as any).status === 'IN_PROGRESS');
    const risks = [];

    if (activeProjects.length > 20) {
      risks.push({
        type: 'RESOURCE_OVERLOAD',
        severity: 'HIGH',
        activeProjectCount: activeProjects.length,
        impact: 'Too many concurrent projects may lead to resource conflicts',
      });
    }

    return risks;
  }

  private buildRiskMatrix(projects: Project[]): any {
    const matrix = {
      high: { high: [], medium: [], low: [] },
      medium: { high: [], medium: [], low: [] },
      low: { high: [], medium: [], low: [] },
    };

    for (const project of projects) {
      const riskScore = this.calculateProjectRiskScore(project);
      const impact = this.calculateProjectImpact(project);

      let probability = 'low';
      let impactLevel = 'low';

      if (riskScore > 70) probability = 'high';
      else if (riskScore > 40) probability = 'medium';

      if (impact > 70) impactLevel = 'high';
      else if (impact > 40) impactLevel = 'medium';

      (matrix as any)[probability][impactLevel].push({
        id: project.id,
        name: project.name,
      });
    }

    return matrix;
  }

  private calculateProjectRiskScore(project: Project): number {
    let score = 0;

    // Status risk
    if ((project as any).status === 'AT_RISK') score += 30;
    if ((project as any).status === 'DELAYED') score += 40;

    // Schedule risk
    if (project.endDate) {
      const now = new Date();
      const end = new Date(project.endDate);
      if (end < now && (project as any).status !== 'COMPLETED') score += 30;
    }

    // Budget risk
    if ((project as any).budget && (project as any).actualCost) {
      const overrun = (project as any).actualCost / (project as any).budget;
      if (overrun > 1.2) score += 30;
      else if (overrun > 1.1) score += 20;
    }

    return Math.min(100, score);
  }

  private calculateProjectImpact(project: Project): number {
    let impact = 30; // Base impact

    // Budget size impact
    if ((project as any).budget) {
      if ((project as any).budget > 1000000) impact += 40;
      else if ((project as any).budget > 500000) impact += 30;
      else if ((project as any).budget > 100000) impact += 20;
    }

    // Strategic importance (would be from metadata)
    if ((project as any).priority === 'HIGH') impact += 20;
    if ((project as any).priority === 'CRITICAL') impact += 30;

    return Math.min(100, impact);
  }

  private identifyPrimaryRisk(project: Project): string {
    const risks = [];

    if ((project as any).status === 'DELAYED') risks.push('SCHEDULE');
    if ((project as any).actualCost && (project as any).budget && (project as any).actualCost > (project as any).budget) {
      risks.push('BUDGET');
    }
    if ((project as any).metadata?.qualityIssues) risks.push('QUALITY');

    return risks[0] || 'GENERAL';
  }

  private calculateAverageRiskScore(projects: Project[]): number {
    const scores = projects.map((p: Project) => this.calculateProjectRiskScore(p));
    return scores.reduce((sum: number, s: number) => sum + s, 0) / (scores.length || 1);
  }

  private generateMitigationStrategies(
    scheduleRisks: any[],
    budgetRisks: any[],
    dependencyRisks: any[],
    resourceRisks: any[],
  ): string[] {
    const strategies = [];

    if (scheduleRisks.length > 5) {
      strategies.push('Implement aggressive schedule recovery plans for overdue projects');
      strategies.push('Consider re-baselining project schedules');
    }

    if (budgetRisks.length > 3) {
      strategies.push('Conduct immediate budget reviews for over-budget projects');
      strategies.push('Implement stricter cost control measures');
    }

    if (dependencyRisks.length > 0) {
      strategies.push('Review and potentially break critical dependencies');
      strategies.push('Develop contingency plans for blocked projects');
    }

    if (resourceRisks.length > 0) {
      strategies.push('Consider resource augmentation or redistribution');
      strategies.push('Prioritize projects and defer non-critical initiatives');
    }

    return strategies;
  }

  private async calculateRiskTrends(organizationId: string): Promise<any> {
    // Would analyze historical risk data
    return {
      overall: 'INCREASING',
      schedule: 'STABLE',
      budget: 'INCREASING',
      dependency: 'DECREASING',
      resource: 'STABLE',
    };
  }

  private async calculateResourceAllocation(projects: Project[]): Promise<any> {
    // Simplified resource calculation
    const activeProjects = projects.filter((p: Project) =>
      (p as any).status === 'ACTIVE' || (p as any).status === 'IN_PROGRESS'
    );

    return {
      total: activeProjects.length * 5, // Assume 5 resources per project
      allocated: activeProjects.length * 4,
      available: activeProjects.length,
      byProject: activeProjects.map((p: Project) => ({
        projectId: p.id,
        projectName: p.name,
        allocated: 4,
      })),
      byType: {
        developers: activeProjects.length * 2,
        designers: activeProjects.length * 0.5,
        managers: activeProjects.length * 0.5,
        analysts: activeProjects.length * 1,
      },
    };
  }

  private calculateUtilizationRates(resourceAllocation: any): any {
    const overall = resourceAllocation.total > 0
      ? (resourceAllocation.allocated / resourceAllocation.total) * 100
      : 0;

    return {
      overall,
      byType: {
        developers: 85,
        designers: 70,
        managers: 95,
        analysts: 75,
      },
    };
  }

  private identifyAllocationIssues(resourceAllocation: any): any[] {
    const issues = [];

    if (resourceAllocation.allocated > resourceAllocation.total * 0.9) {
      issues.push({
        type: 'OVER_ALLOCATION',
        severity: 'HIGH',
        message: 'Resources are over-allocated across projects',
        impact: 'Risk of burnout and quality issues',
      });
    }

    if (resourceAllocation.allocated < resourceAllocation.total * 0.5) {
      issues.push({
        type: 'UNDER_UTILIZATION',
        severity: 'MEDIUM',
        message: 'Resources are under-utilized',
        impact: 'Inefficient use of available capacity',
      });
    }

    return issues;
  }

  private async analyzeCapacityVsDemand(organizationId: string): Promise<any> {
    // Simplified capacity analysis
    return {
      currentCapacity: 100,
      currentDemand: 85,
      projectedDemand: {
        nextMonth: 90,
        nextQuarter: 95,
        nextYear: 110,
      },
      capacityGap: {
        current: 15,
        projected: -10,
      },
    };
  }

  private generateResourceForecast(projects: Project[], resourceAllocation: any): any {
    return {
      nextMonth: {
        required: resourceAllocation.allocated * 1.1,
        available: resourceAllocation.total,
        gap: resourceAllocation.total - (resourceAllocation.allocated * 1.1),
      },
      nextQuarter: {
        required: resourceAllocation.allocated * 1.2,
        available: resourceAllocation.total,
        gap: resourceAllocation.total - (resourceAllocation.allocated * 1.2),
      },
    };
  }

  private generateResourceRecommendations(
    utilizationRates: any,
    allocationIssues: any[],
  ): string[] {
    const recommendations = [];

    if (utilizationRates.overall > 90) {
      recommendations.push('Consider hiring additional resources');
      recommendations.push('Review project priorities and defer non-critical work');
    }

    if (utilizationRates.overall < 60) {
      recommendations.push('Optimize resource allocation across projects');
      recommendations.push('Consider taking on additional projects');
    }

    if (allocationIssues.some((i: any) => i.type === 'OVER_ALLOCATION')) {
      recommendations.push('Redistribute resources to balance workload');
      recommendations.push('Implement resource leveling techniques');
    }

    return recommendations;
  }

  private calculateAverageVariance(projects: Project[]): number {
    const variances = projects
      .filter((p: Project) => (p as any).budget && (p as any).actualCost)
      .map((p: Project) => (((p as any).actualCost! - (p as any).budget!) / (p as any).budget!) * 100);

    return variances.length > 0
      ? variances.reduce((sum: number, v: number) => sum + v, 0) / variances.length
      : 0;
  }

  private calculateSPI(projects: Project[]): number {
    // Schedule Performance Index calculation
    const projectsWithProgress = projects.filter((p: Project) =>
      p.startDate && p.endDate && (p as any).progressPercentage !== undefined
    );

    if (projectsWithProgress.length === 0) return 1;

    const now = new Date();
    let totalEarnedValue = 0;
    let totalPlannedValue = 0;

    for (const project of projectsWithProgress) {
      const totalDuration = new Date(project.endDate!).getTime() -
                           new Date(project.startDate!).getTime();
      const elapsed = now.getTime() - new Date(project.startDate!).getTime();
      const plannedProgress = Math.min(100, (elapsed / totalDuration) * 100);

      totalEarnedValue += (project as any).progressPercentage;
      totalPlannedValue += plannedProgress;
    }

    return totalPlannedValue > 0 ? totalEarnedValue / totalPlannedValue : 1;
  }

  private calculateAverageDelay(delayedProjects: Project[]): number {
    if (delayedProjects.length === 0) return 0;

    const now = new Date();
    const totalDelay = delayedProjects.reduce((sum: number, p: Project) => {
      if (!p.endDate) return sum;
      const delay = Math.max(0,
        Math.ceil((now.getTime() - new Date(p.endDate).getTime()) / (1000 * 60 * 60 * 24))
      );
      return sum + delay;
    }, 0);

    return totalDelay / delayedProjects.length;
  }

  private getEmptyMetrics(): any {
    return {
      overallHealthScore: 0,
      statusMetrics: {
        total: 0,
        onTrack: 0,
        atRisk: 0,
        delayed: 0,
        completed: 0,
        cancelled: 0,
      },
      budgetPerformance: {
        totalBudget: 0,
        totalSpent: 0,
        variance: 0,
      },
      schedulePerformance: {
        total: 0,
        onSchedule: 0,
        behind: 0,
      },
      resourceUtilization: {
        overall: 0,
      },
      qualityMetrics: {
        averageScore: 0,
      },
      trends: {},
      recommendations: ['No projects found in portfolio'],
    };
  }
}