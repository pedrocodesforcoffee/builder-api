import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

export enum HealthTrend {
  IMPROVING = 'IMPROVING',
  STABLE = 'STABLE',
  DECLINING = 'DECLINING',
}

@Injectable()
export class PortfolioHealthService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  /**
   * Calculate health score for a single project (0-100)
   */
  async calculateHealthScore(projectId: string): Promise<number> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      return 0;
    }

    // Initialize score components
    const scheduleScore = this.calculateScheduleScore(project);
    const budgetScore = this.calculateBudgetScore(project);
    const progressScore = this.calculateProgressScore(project);
    const qualityScore = this.calculateQualityScore(project);
    const teamScore = this.calculateTeamScore(project);

    // Weight the components
    const weights = {
      schedule: 0.25,
      budget: 0.25,
      progress: 0.20,
      quality: 0.15,
      team: 0.15,
    };

    const weightedScore =
      scheduleScore * weights.schedule +
      budgetScore * weights.budget +
      progressScore * weights.progress +
      qualityScore * weights.quality +
      teamScore * weights.team;

    return Math.round(Math.max(0, Math.min(100, weightedScore)));
  }

  /**
   * Get health trend for a project
   */
  async getHealthTrend(projectId: string): Promise<HealthTrend> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      return HealthTrend.STABLE;
    }

    // Get historical health scores from metadata
    const historicalScores = (project as any).metadata?.healthHistory || [];

    if (historicalScores.length < 2) {
      return HealthTrend.STABLE;
    }

    // Compare recent scores
    const recentScores = historicalScores.slice(-5);
    const trend = this.calculateTrend(recentScores);

    return trend;
  }

  /**
   * Get portfolio-wide health metrics
   */
  async getPortfolioHealth(organizationId: string): Promise<any> {
    const projects = await this.projectRepository.find({
      where: { organizationId },
    });

    if (projects.length === 0) {
      return {
        overallScore: 0,
        distribution: {},
        byStatus: {},
        byPriority: {},
        criticalProjects: [],
        recommendations: ['No projects in portfolio'],
      };
    }

    // Calculate health score for each project
    const projectHealthScores = await Promise.all(
      projects.map(async (p: Project) => ({
        project: p,
        score: await this.calculateHealthScore(p.id),
        trend: await this.getHealthTrend(p.id),
      }))
    );

    // Calculate overall portfolio health
    const overallScore = this.calculateOverallPortfolioScore(projectHealthScores);

    // Group by health categories
    const distribution = this.categorizeHealthScores(projectHealthScores);

    // Analyze by status
    const byStatus = this.analyzeHealthByStatus(projectHealthScores);

    // Analyze by priority
    const byPriority = this.analyzeHealthByPriority(projectHealthScores);

    // Identify critical projects
    const criticalProjects = this.identifyCriticalProjects(projectHealthScores);

    // Generate recommendations
    const recommendations = this.generatePortfolioRecommendations(
      overallScore,
      distribution,
      criticalProjects,
    );

    return {
      overallScore,
      distribution,
      byStatus,
      byPriority,
      criticalProjects,
      trends: this.analyzePortfolioTrends(projectHealthScores),
      recommendations,
      lastCalculated: new Date(),
    };
  }

  private calculateScheduleScore(project: Project): number {
    let score = 100;

    if (!project.startDate || !project.endDate) {
      return 70; // No schedule defined
    }

    const now = new Date();
    const startDate = new Date(project.startDate);
    const endDate = new Date(project.endDate);

    // Check if project is overdue
    if (endDate < now && (project as any).status !== 'COMPLETED') {
      const daysOverdue = Math.ceil((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
      score -= Math.min(50, daysOverdue * 2);
    }

    // Check progress vs expected progress
    if (startDate <= now && (project as any).progressPercentage !== undefined) {
      const totalDuration = endDate.getTime() - startDate.getTime();
      const elapsed = now.getTime() - startDate.getTime();
      const expectedProgress = Math.min(100, (elapsed / totalDuration) * 100);
      const progressGap = expectedProgress - (project as any).progressPercentage;

      if (progressGap > 20) {
        score -= 30;
      } else if (progressGap > 10) {
        score -= 15;
      } else if (progressGap > 5) {
        score -= 5;
      }
    }

    // Bonus for being ahead of schedule
    if ((project as any).status === 'COMPLETED' && endDate > now) {
      score = Math.min(100, score + 10);
    }

    return Math.max(0, score);
  }

  private calculateBudgetScore(project: Project): number {
    if (!(project as any).budget) {
      return 75; // No budget defined
    }

    if (!(project as any).actualCost) {
      return 90; // No costs tracked yet
    }

    const variance = (((project as any).actualCost - (project as any).budget) / (project as any).budget) * 100;

    if (variance <= -10) {
      return 100; // Under budget by >10%
    } else if (variance <= 0) {
      return 95; // On or under budget
    } else if (variance <= 5) {
      return 85; // Slightly over budget
    } else if (variance <= 10) {
      return 70; // Moderately over budget
    } else if (variance <= 20) {
      return 50; // Significantly over budget
    } else {
      return Math.max(0, 50 - variance); // Severely over budget
    }
  }

  private calculateProgressScore(project: Project): number {
    if ((project as any).progressPercentage === undefined) {
      return 50; // No progress tracked
    }

    let score = 70; // Base score

    // Adjust based on progress consistency
    if ((project as any).status === 'COMPLETED') {
      score = 100;
    } else if ((project as any).status === 'ACTIVE' || (project as any).status === 'IN_PROGRESS') {
      // Check if progress is reasonable for active projects
      if ((project as any).progressPercentage > 0) {
        score += 20;
      }
      if ((project as any).progressPercentage > 25) {
        score += 10;
      }
    } else if ((project as any).status === 'AT_RISK') {
      score -= 20;
    } else if ((project as any).status === 'DELAYED') {
      score -= 30;
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateQualityScore(project: Project): number {
    let score = 75; // Base quality score

    // Adjust based on metadata quality indicators
    const qualityIndicators = (project as any).metadata?.quality || {};

    if (qualityIndicators.defectRate !== undefined) {
      if (qualityIndicators.defectRate < 5) {
        score += 20;
      } else if (qualityIndicators.defectRate < 10) {
        score += 10;
      } else if (qualityIndicators.defectRate > 20) {
        score -= 20;
      }
    }

    if (qualityIndicators.testCoverage !== undefined) {
      if (qualityIndicators.testCoverage > 80) {
        score += 15;
      } else if (qualityIndicators.testCoverage > 60) {
        score += 5;
      } else if (qualityIndicators.testCoverage < 40) {
        score -= 15;
      }
    }

    if (qualityIndicators.customerSatisfaction !== undefined) {
      if (qualityIndicators.customerSatisfaction > 90) {
        score += 10;
      } else if (qualityIndicators.customerSatisfaction < 70) {
        score -= 10;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateTeamScore(project: Project): number {
    let score = 80; // Base team score

    const teamMetrics = (project as any).metadata?.team || {};

    // Team size appropriateness
    if (teamMetrics.size !== undefined) {
      if (teamMetrics.size >= 3 && teamMetrics.size <= 9) {
        score += 10; // Optimal team size
      } else if (teamMetrics.size > 15) {
        score -= 15; // Team too large
      } else if (teamMetrics.size < 3) {
        score -= 10; // Team too small
      }
    }

    // Team stability
    if (teamMetrics.turnoverRate !== undefined) {
      if (teamMetrics.turnoverRate < 5) {
        score += 15;
      } else if (teamMetrics.turnoverRate > 20) {
        score -= 20;
      }
    }

    // Team productivity
    if (teamMetrics.velocityTrend !== undefined) {
      if (teamMetrics.velocityTrend === 'INCREASING') {
        score += 10;
      } else if (teamMetrics.velocityTrend === 'DECREASING') {
        score -= 10;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateTrend(scores: number[]): HealthTrend {
    if (scores.length < 2) {
      return HealthTrend.STABLE;
    }

    // Calculate simple linear regression
    const n = scores.length;
    const indices = Array.from({ length: n }, (_, i) => i);

    const sumX = indices.reduce((a: number, b: number) => a + b, 0);
    const sumY = scores.reduce((a: number, b: number) => a + b, 0);
    const sumXY = indices.reduce((sum: number, x: number, i: number) => sum + x * scores[i], 0);
    const sumX2 = indices.reduce((sum: number, x: number) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // Determine trend based on slope
    if (slope > 2) {
      return HealthTrend.IMPROVING;
    } else if (slope < -2) {
      return HealthTrend.DECLINING;
    } else {
      return HealthTrend.STABLE;
    }
  }

  private calculateOverallPortfolioScore(
    projectHealthScores: Array<{ project: Project; score: number; trend: HealthTrend }>,
  ): number {
    if (projectHealthScores.length === 0) {
      return 0;
    }

    // Weight projects by their priority and budget
    let totalWeight = 0;
    let weightedSum = 0;

    for (const { project, score } of projectHealthScores) {
      let weight = 1;

      // Priority weighting
      if ((project as any).priority === 'CRITICAL') weight *= 3;
      else if ((project as any).priority === 'HIGH') weight *= 2;
      else if ((project as any).priority === 'MEDIUM') weight *= 1.5;

      // Budget weighting (normalized)
      if ((project as any).budget) {
        const budgetWeight = Math.log10(Math.max(10000, (project as any).budget)) / 6; // Normalize to ~0.67-1.5
        weight *= budgetWeight;
      }

      totalWeight += weight;
      weightedSum += score * weight;
    }

    return Math.round(weightedSum / totalWeight);
  }

  private categorizeHealthScores(
    projectHealthScores: Array<{ project: Project; score: number; trend: HealthTrend }>,
  ): Record<string, number> {
    const categories = {
      excellent: 0,  // 90-100
      good: 0,       // 70-89
      fair: 0,       // 50-69
      poor: 0,       // 30-49
      critical: 0,   // 0-29
    };

    for (const { score } of projectHealthScores) {
      if (score >= 90) categories.excellent++;
      else if (score >= 70) categories.good++;
      else if (score >= 50) categories.fair++;
      else if (score >= 30) categories.poor++;
      else categories.critical++;
    }

    return categories;
  }

  private analyzeHealthByStatus(
    projectHealthScores: Array<{ project: Project; score: number; trend: HealthTrend }>,
  ): Record<string, { count: number; averageScore: number }> {
    const byStatus: Record<string, { total: number; count: number }> = {};

    for (const { project, score } of projectHealthScores) {
      const status = project.status || 'UNKNOWN';
      if (!byStatus[status]) {
        byStatus[status] = { total: 0, count: 0 };
      }
      byStatus[status].total += score;
      byStatus[status].count++;
    }

    const result: Record<string, { count: number; averageScore: number }> = {};
    for (const [status, data] of Object.entries(byStatus)) {
      result[status] = {
        count: data.count,
        averageScore: Math.round(data.total / data.count),
      };
    }

    return result;
  }

  private analyzeHealthByPriority(
    projectHealthScores: Array<{ project: Project; score: number; trend: HealthTrend }>,
  ): Record<string, { count: number; averageScore: number }> {
    const byPriority: Record<string, { total: number; count: number }> = {};

    for (const { project, score } of projectHealthScores) {
      const priority = (project as any).priority || 'MEDIUM';
      if (!byPriority[priority]) {
        byPriority[priority] = { total: 0, count: 0 };
      }
      byPriority[priority].total += score;
      byPriority[priority].count++;
    }

    const result: Record<string, { count: number; averageScore: number }> = {};
    for (const [priority, data] of Object.entries(byPriority)) {
      result[priority] = {
        count: data.count,
        averageScore: Math.round(data.total / data.count),
      };
    }

    return result;
  }

  private identifyCriticalProjects(
    projectHealthScores: Array<{ project: Project; score: number; trend: HealthTrend }>,
  ): Array<{ id: string; name: string; score: number; trend: HealthTrend; issues: string[] }> {
    const critical = [];

    for (const { project, score, trend } of projectHealthScores) {
      if (score < 50 || (score < 70 && trend === HealthTrend.DECLINING)) {
        const issues = this.identifyProjectIssues(project, score);
        critical.push({
          id: project.id,
          name: project.name,
          score,
          trend,
          issues,
        });
      }
    }

    // Sort by score (lowest first)
    critical.sort((a: any, b: any) => a.score - b.score);

    return critical.slice(0, 10); // Return top 10 critical projects
  }

  private identifyProjectIssues(project: Project, healthScore: number): string[] {
    const issues = [];

    // Check schedule issues
    if (project.endDate && new Date(project.endDate) < new Date() && (project as any).status !== 'COMPLETED') {
      issues.push('Project is overdue');
    }

    // Check budget issues
    if ((project as any).budget && (project as any).actualCost && (project as any).actualCost > (project as any).budget * 1.1) {
      issues.push('Project is over budget by >10%');
    }

    // Check progress issues
    if ((project as any).progressPercentage !== undefined && (project as any).progressPercentage < 10 && (project as any).status === 'ACTIVE') {
      issues.push('Minimal progress despite active status');
    }

    // Check status issues
    if ((project as any).status === 'AT_RISK' || (project as any).status === 'DELAYED') {
      issues.push(`Project status: ${(project as any).status}`);
    }

    // Check health score
    if (healthScore < 30) {
      issues.push('Critical health score');
    } else if (healthScore < 50) {
      issues.push('Poor health score');
    }

    return issues;
  }

  private analyzePortfolioTrends(
    projectHealthScores: Array<{ project: Project; score: number; trend: HealthTrend }>,
  ): Record<string, number> {
    const trends = {
      improving: 0,
      stable: 0,
      declining: 0,
    };

    for (const { trend } of projectHealthScores) {
      switch (trend) {
        case HealthTrend.IMPROVING:
          trends.improving++;
          break;
        case HealthTrend.DECLINING:
          trends.declining++;
          break;
        default:
          trends.stable++;
      }
    }

    return trends;
  }

  private generatePortfolioRecommendations(
    overallScore: number,
    distribution: Record<string, number>,
    criticalProjects: any[],
  ): string[] {
    const recommendations = [];

    // Overall score recommendations
    if (overallScore < 50) {
      recommendations.push('URGENT: Portfolio health is critical. Immediate intervention required.');
      recommendations.push('Consider pausing new initiatives to focus on recovery.');
    } else if (overallScore < 70) {
      recommendations.push('Portfolio health needs improvement. Review resource allocation.');
      recommendations.push('Implement additional monitoring for at-risk projects.');
    } else if (overallScore >= 85) {
      recommendations.push('Portfolio health is excellent. Maintain current practices.');
    }

    // Distribution recommendations
    const total = Object.values(distribution).reduce((sum: number, count: number) => sum + count, 0);
    if (total > 0) {
      const criticalPercentage = ((distribution.critical || 0) + (distribution.poor || 0)) / total;
      if (criticalPercentage > 0.3) {
        recommendations.push(`${Math.round(criticalPercentage * 100)}% of projects have poor health. Conduct root cause analysis.`);
      }
    }

    // Critical project recommendations
    if (criticalProjects.length > 5) {
      recommendations.push(`${criticalProjects.length} projects in critical condition. Prioritize recovery efforts.`);
      recommendations.push('Consider establishing a project recovery team.');
    } else if (criticalProjects.length > 0) {
      recommendations.push(`Focus on improving ${criticalProjects.length} critical project(s).`);
    }

    // Trend recommendations
    const decliningProjects = criticalProjects.filter((p: any) => p.trend === HealthTrend.DECLINING);
    if (decliningProjects.length > 3) {
      recommendations.push('Multiple projects showing declining health. Investigate common causes.');
    }

    return recommendations;
  }
}