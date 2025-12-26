/**
 * AI Dashboard Service
 * Provides AI insights widgets for project and organization dashboards
 */

import { Injectable, Logger } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { PatternCalculatorService } from './pattern-calculator.service';
import { RecommendationStatus } from '../enums/recommendation-status.enum';

/**
 * Project Dashboard AI Widgets
 */
export interface ProjectDashboardAI {
  recommendations: {
    pending: number;
    highPriority: number;
    recent: Array<{
      id: string;
      title: string;
      priority: string;
      type: string;
    }>;
  };
  similarProjects: Array<{
    projectId: string;
    projectName: string;
    similarityScore: number;
    costVariance: number;
    scheduleVariance: number;
  }>;
  smartEstimates: {
    budgetEstimate: number | null;
    durationEstimate: number | null;
    confidence: number;
    basedOnProjects: number;
  };
  riskIndicators: {
    costRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    scheduleRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    rfiRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    changeOrderRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  };
}

/**
 * Organization Dashboard AI Widgets
 */
export interface OrganizationDashboardAI {
  patternsOverview: {
    costVariance: {
      average: number;
      trend: string;
      risk: string;
    };
    scheduleVariance: {
      average: number;
      trend: string;
      risk: string;
    };
    rfiVelocity: {
      average: number;
      trend: string;
    };
    changeOrderFrequency: {
      average: number;
      trend: string;
    };
  };
  lessonsLearned: {
    total: number;
    recent: Array<{
      id: string;
      title: string;
      category: string;
      impact: string;
    }>;
    mostViewed: Array<{
      id: string;
      title: string;
      views: number;
    }>;
  };
  recommendationsSummary: {
    totalPending: number;
    totalAccepted: number;
    totalRejected: number;
    acceptanceRate: number;
  };
  roiTracking: {
    estimatedSavings: number;
    implementedRecommendations: number;
    averageSavingsPerRecommendation: number;
  };
}

@Injectable()
export class AiDashboardService {
  private readonly logger = new Logger(AiDashboardService.name);

  constructor(
    private recommendationsService: RecommendationsService,
    private patternCalculatorService: PatternCalculatorService,
  ) {}

  /**
   * Get AI widgets for project dashboard
   *
   * @param projectId - Project ID
   * @param organizationId - Organization ID
   * @returns Project dashboard AI widgets
   */
  async getProjectDashboardWidgets(
    projectId: string,
    organizationId: string,
  ): Promise<ProjectDashboardAI> {
    this.logger.log(`Getting AI widgets for project ${projectId}`);

    try {
      // Get recommendations summary
      const allRecommendations = await this.recommendationsService.getRecommendations({
        projectId,
        page: 1,
        limit: 100,
      });

      const pending = allRecommendations.data.filter(
        (r) => r.status === RecommendationStatus.PENDING,
      );
      const highPriority = pending.filter((r) => r.priority === 'HIGH');

      // Get recent recommendations (top 3)
      const recent = allRecommendations.data.slice(0, 3).map((r) => ({
        id: r.id,
        title: r.title,
        priority: r.priority,
        type: r.type,
      }));

      // Get similar projects
      const similarProjects = await this.recommendationsService.findSimilarProjects({
        projectId,
        limit: 3,
        minSimilarityScore: 0.3,
        useEmbeddings: false,
        onlyCompleted: true,
      });

      // Get smart estimates
      const smartDefaults = await this.recommendationsService.generateSmartDefaults(projectId);
      const budgetEstimate = smartDefaults?.budgetEstimate?.value || null;
      const durationEstimate = smartDefaults?.durationEstimate?.value || null;

      // Get risk indicators from patterns
      const patterns = await this.patternCalculatorService.getOrganizationPatterns(organizationId);

      const costPattern = patterns.find((p) => p.patternType === 'COST_VARIANCE');
      const schedulePattern = patterns.find((p) => p.patternType === 'SCHEDULE_VARIANCE');
      const rfiPattern = patterns.find((p) => p.patternType === 'RFI_VELOCITY');
      const coPattern = patterns.find((p) => p.patternType === 'CHANGE_ORDER_FREQUENCY');

      return {
        recommendations: {
          pending: pending.length,
          highPriority: highPriority.length,
          recent,
        },
        similarProjects: similarProjects.map((sp) => ({
          projectId: sp.profile.projectId,
          projectName: sp.profile.projectId, // Would need project name from separate query
          similarityScore: sp.similarityScore,
          costVariance: sp.profile.costVariancePercent || 0,
          scheduleVariance: sp.profile.scheduleVarianceDays || 0,
        })),
        smartEstimates: {
          budgetEstimate,
          durationEstimate,
          confidence: (smartDefaults?.budgetEstimate?.confidence + smartDefaults?.durationEstimate?.confidence) / 2 || 0,
          basedOnProjects: smartDefaults?.supportingProjects?.length || 0,
        },
        riskIndicators: {
          costRisk: this.mapRiskLevel(costPattern?.impactSeverity),
          scheduleRisk: this.mapRiskLevel(schedulePattern?.impactSeverity),
          rfiRisk: this.mapRiskLevel(rfiPattern?.impactSeverity),
          changeOrderRisk: this.mapRiskLevel(coPattern?.impactSeverity),
        },
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to get project dashboard widgets: ${error.message}`,
        error.stack,
      );
      return this.getEmptyProjectDashboard();
    }
  }

  /**
   * Get AI widgets for organization dashboard
   *
   * @param organizationId - Organization ID
   * @returns Organization dashboard AI widgets
   */
  async getOrganizationDashboardWidgets(
    organizationId: string,
  ): Promise<OrganizationDashboardAI> {
    this.logger.log(`Getting AI widgets for organization ${organizationId}`);

    try {
      // Get patterns overview
      const patterns = await this.patternCalculatorService.getOrganizationPatterns(organizationId);

      const costPattern = patterns.find((p) => p.patternType === 'COST_VARIANCE');
      const schedulePattern = patterns.find((p) => p.patternType === 'SCHEDULE_VARIANCE');
      const rfiPattern = patterns.find((p) => p.patternType === 'RFI_VELOCITY');
      const coPattern = patterns.find((p) => p.patternType === 'CHANGE_ORDER_FREQUENCY');

      // Get lessons learned
      const lessons = await this.recommendationsService.getLessonsLearned({
        organizationId,
        approvedOnly: true,
        page: 1,
        limit: 100,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      });

      const recentLessons = lessons.data.slice(0, 5).map((l) => ({
        id: l.id,
        title: l.title,
        category: l.category,
        impact: l.impactType || 'UNKNOWN',
      }));

      // Get recommendations summary (across all projects)
      // Note: This would need a new method to get org-wide recommendations
      // For now, we'll return placeholder data
      const recommendationsSummary = {
        totalPending: 0,
        totalAccepted: 0,
        totalRejected: 0,
        acceptanceRate: 0,
      };

      // ROI tracking (placeholder - would need actual implementation)
      const roiTracking = {
        estimatedSavings: 0,
        implementedRecommendations: 0,
        averageSavingsPerRecommendation: 0,
      };

      return {
        patternsOverview: {
          costVariance: {
            average: costPattern?.averageValue || 0,
            trend: costPattern?.trendDirection || 'STABLE',
            risk: costPattern?.impactSeverity || 'LOW',
          },
          scheduleVariance: {
            average: schedulePattern?.averageValue || 0,
            trend: schedulePattern?.trendDirection || 'STABLE',
            risk: schedulePattern?.impactSeverity || 'LOW',
          },
          rfiVelocity: {
            average: rfiPattern?.averageValue || 0,
            trend: rfiPattern?.trendDirection || 'STABLE',
          },
          changeOrderFrequency: {
            average: coPattern?.averageValue || 0,
            trend: coPattern?.trendDirection || 'STABLE',
          },
        },
        lessonsLearned: {
          total: lessons.total,
          recent: recentLessons,
          mostViewed: [], // Would need view tracking
        },
        recommendationsSummary,
        roiTracking,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to get organization dashboard widgets: ${error.message}`,
        error.stack,
      );
      return this.getEmptyOrganizationDashboard();
    }
  }

  /**
   * Map risk level string to standardized format
   *
   * @private
   * @param severity - Impact severity string
   * @returns Standardized risk level
   */
  private mapRiskLevel(severity?: string): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (!severity) return 'LOW';

    const normalized = severity.toUpperCase();
    if (normalized === 'HIGH' || normalized === 'CRITICAL') return 'HIGH';
    if (normalized === 'MEDIUM' || normalized === 'MODERATE') return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Get empty project dashboard (fallback)
   *
   * @private
   * @returns Empty project dashboard
   */
  private getEmptyProjectDashboard(): ProjectDashboardAI {
    return {
      recommendations: {
        pending: 0,
        highPriority: 0,
        recent: [],
      },
      similarProjects: [],
      smartEstimates: {
        budgetEstimate: null,
        durationEstimate: null,
        confidence: 0,
        basedOnProjects: 0,
      },
      riskIndicators: {
        costRisk: 'LOW',
        scheduleRisk: 'LOW',
        rfiRisk: 'LOW',
        changeOrderRisk: 'LOW',
      },
    };
  }

  /**
   * Get empty organization dashboard (fallback)
   *
   * @private
   * @returns Empty organization dashboard
   */
  private getEmptyOrganizationDashboard(): OrganizationDashboardAI {
    return {
      patternsOverview: {
        costVariance: {
          average: 0,
          trend: 'STABLE',
          risk: 'LOW',
        },
        scheduleVariance: {
          average: 0,
          trend: 'STABLE',
          risk: 'LOW',
        },
        rfiVelocity: {
          average: 0,
          trend: 'STABLE',
        },
        changeOrderFrequency: {
          average: 0,
          trend: 'STABLE',
        },
      },
      lessonsLearned: {
        total: 0,
        recent: [],
        mostViewed: [],
      },
      recommendationsSummary: {
        totalPending: 0,
        totalAccepted: 0,
        totalRejected: 0,
        acceptanceRate: 0,
      },
      roiTracking: {
        estimatedSavings: 0,
        implementedRecommendations: 0,
        averageSavingsPerRecommendation: 0,
      },
    };
  }
}
