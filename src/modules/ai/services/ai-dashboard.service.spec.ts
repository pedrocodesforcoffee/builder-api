/**
 * AiDashboardService Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AiDashboardService } from './ai-dashboard.service';
import { RecommendationsService } from './recommendations.service';
import { PatternCalculatorService } from './pattern-calculator.service';
import { RecommendationStatus } from '../enums/recommendation-status.enum';
import { RecommendationPriority } from '../enums/recommendation-priority.enum';
import { RecommendationType } from '../enums/recommendation-type.enum';

describe('AiDashboardService', () => {
  let service: AiDashboardService;
  let recommendationsService: RecommendationsService;
  let patternCalculatorService: PatternCalculatorService;

  const mockRecommendationsService = {
    getRecommendations: jest.fn(),
    findSimilarProjects: jest.fn(),
    generateSmartDefaults: jest.fn(),
    getLessonsLearned: jest.fn(),
  };

  const mockPatternCalculatorService = {
    getOrganizationPatterns: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiDashboardService,
        {
          provide: RecommendationsService,
          useValue: mockRecommendationsService,
        },
        {
          provide: PatternCalculatorService,
          useValue: mockPatternCalculatorService,
        },
      ],
    }).compile();

    service = module.get<AiDashboardService>(AiDashboardService);
    recommendationsService = module.get<RecommendationsService>(
      RecommendationsService,
    );
    patternCalculatorService = module.get<PatternCalculatorService>(
      PatternCalculatorService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProjectDashboardWidgets', () => {
    it('should return complete project dashboard data', async () => {
      const projectId = 'project-1';
      const organizationId = 'org-1';

      const mockRecommendations = {
        data: [
          {
            id: 'rec-1',
            title: 'High Priority Recommendation',
            priority: RecommendationPriority.HIGH,
            type: RecommendationType.COST_OPTIMIZATION,
            status: RecommendationStatus.PENDING,
          },
          {
            id: 'rec-2',
            title: 'Medium Priority Recommendation',
            priority: RecommendationPriority.MEDIUM,
            type: RecommendationType.SCHEDULE_RISK,
            status: RecommendationStatus.PENDING,
          },
          {
            id: 'rec-3',
            title: 'Low Priority Recommendation',
            priority: RecommendationPriority.LOW,
            type: RecommendationType.PROCESS_IMPROVEMENT,
            status: RecommendationStatus.ACCEPTED,
          },
        ],
        total: 3,
        page: 1,
        limit: 100,
      };

      const mockSimilarProjects = [
        {
          profile: {
            projectId: 'project-2',
            contractValue: 5000000,
            durationDays: 365,
          },
          similarityScore: 0.85,
        },
        {
          profile: {
            projectId: 'project-3',
            contractValue: 4500000,
            durationDays: 330,
          },
          similarityScore: 0.78,
        },
      ];

      const mockSmartDefaults = {
        budgetEstimate: {
          value: 5200000,
          confidence: 0.75,
          range: { min: 4800000, max: 5600000 },
        },
        durationEstimate: {
          value: 350,
          confidence: 0.72,
          range: { min: 320, max: 380 },
        },
        supportingProjects: ['project-2', 'project-3', 'project-4'],
      };

      const mockPatterns = [
        {
          patternType: 'COST_VARIANCE',
          averageValue: 8.5,
          impactSeverity: 'MEDIUM',
        },
        {
          patternType: 'SCHEDULE_VARIANCE',
          averageValue: 12.0,
          impactSeverity: 'HIGH',
        },
        {
          patternType: 'RFI_VELOCITY',
          averageValue: 15.5,
          impactSeverity: 'MEDIUM',
        },
        {
          patternType: 'CHANGE_ORDER_FREQUENCY',
          averageValue: 5.2,
          impactSeverity: 'LOW',
        },
      ];

      mockRecommendationsService.getRecommendations.mockResolvedValue(
        mockRecommendations,
      );
      mockRecommendationsService.findSimilarProjects.mockResolvedValue(
        mockSimilarProjects,
      );
      mockRecommendationsService.generateSmartDefaults.mockResolvedValue(
        mockSmartDefaults,
      );
      mockPatternCalculatorService.getOrganizationPatterns.mockResolvedValue(
        mockPatterns,
      );

      const result = await service.getProjectDashboardWidgets(
        projectId,
        organizationId,
      );

      expect(result).toBeDefined();
      expect(result.recommendations.pending).toBe(2);
      expect(result.recommendations.highPriority).toBe(1);
      expect(result.recommendations.recent).toHaveLength(3);
      expect(result.similarProjects).toHaveLength(2);
      expect(result.similarProjects[0].similarityScore).toBe(0.85);
      expect(result.smartEstimates.budgetEstimate).toBe(5200000);
      expect(result.smartEstimates.durationEstimate).toBe(350);
      expect(result.smartEstimates.confidence).toBeCloseTo(0.735, 2);
      expect(result.smartEstimates.basedOnProjects).toBe(3);
      expect(result.riskIndicators.costRisk).toBe('MEDIUM');
      expect(result.riskIndicators.scheduleRisk).toBe('HIGH');
      expect(result.riskIndicators.rfiRisk).toBe('MEDIUM');
      expect(result.riskIndicators.changeOrderRisk).toBe('LOW');
    });

    it('should return empty dashboard on error', async () => {
      mockRecommendationsService.getRecommendations.mockRejectedValue(
        new Error('Service error'),
      );

      const result = await service.getProjectDashboardWidgets(
        'project-1',
        'org-1',
      );

      expect(result.recommendations.pending).toBe(0);
      expect(result.recommendations.highPriority).toBe(0);
      expect(result.similarProjects).toHaveLength(0);
      expect(result.smartEstimates.budgetEstimate).toBeNull();
      expect(result.riskIndicators.costRisk).toBe('LOW');
    });

    it('should handle null smart defaults', async () => {
      mockRecommendationsService.getRecommendations.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 100,
      });
      mockRecommendationsService.findSimilarProjects.mockResolvedValue([]);
      mockRecommendationsService.generateSmartDefaults.mockResolvedValue(null);
      mockPatternCalculatorService.getOrganizationPatterns.mockResolvedValue([]);

      const result = await service.getProjectDashboardWidgets(
        'project-1',
        'org-1',
      );

      expect(result.smartEstimates.budgetEstimate).toBeNull();
      expect(result.smartEstimates.durationEstimate).toBeNull();
      expect(result.smartEstimates.confidence).toBe(0);
      expect(result.smartEstimates.basedOnProjects).toBe(0);
    });
  });

  describe('getOrganizationDashboardWidgets', () => {
    it('should return complete organization dashboard data', async () => {
      const organizationId = 'org-1';

      const mockPatterns = [
        {
          patternType: 'COST_VARIANCE',
          averageValue: 7.5,
          trendDirection: 'INCREASING',
          impactSeverity: 'MEDIUM',
        },
        {
          patternType: 'SCHEDULE_VARIANCE',
          averageValue: 10.2,
          trendDirection: 'STABLE',
          impactSeverity: 'MEDIUM',
        },
        {
          patternType: 'RFI_VELOCITY',
          averageValue: 12.8,
          trendDirection: 'DECREASING',
          impactSeverity: 'LOW',
        },
        {
          patternType: 'CHANGE_ORDER_FREQUENCY',
          averageValue: 4.5,
          trendDirection: 'STABLE',
          impactSeverity: 'LOW',
        },
      ];

      const mockLessons = {
        data: [
          {
            id: 'lesson-1',
            title: 'Cost Overrun Lesson',
            category: 'BUDGET_MANAGEMENT',
            impactType: 'COST_SAVINGS',
          },
          {
            id: 'lesson-2',
            title: 'Schedule Delay Lesson',
            category: 'SCHEDULE_MANAGEMENT',
            impactType: 'TIME_SAVINGS',
          },
        ],
        total: 15,
        page: 1,
        limit: 100,
      };

      mockPatternCalculatorService.getOrganizationPatterns.mockResolvedValue(
        mockPatterns,
      );
      mockRecommendationsService.getLessonsLearned.mockResolvedValue(mockLessons);

      const result = await service.getOrganizationDashboardWidgets(organizationId);

      expect(result).toBeDefined();
      expect(result.patternsOverview.costVariance.average).toBe(7.5);
      expect(result.patternsOverview.costVariance.trend).toBe('INCREASING');
      expect(result.patternsOverview.costVariance.risk).toBe('MEDIUM');
      expect(result.patternsOverview.scheduleVariance.average).toBe(10.2);
      expect(result.patternsOverview.rfiVelocity.average).toBe(12.8);
      expect(result.patternsOverview.changeOrderFrequency.average).toBe(4.5);
      expect(result.lessonsLearned.total).toBe(15);
      expect(result.lessonsLearned.recent).toHaveLength(2);
    });

    it('should handle missing patterns gracefully', async () => {
      mockPatternCalculatorService.getOrganizationPatterns.mockResolvedValue([]);
      mockRecommendationsService.getLessonsLearned.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 100,
      });

      const result = await service.getOrganizationDashboardWidgets('org-1');

      expect(result.patternsOverview.costVariance.average).toBe(0);
      expect(result.patternsOverview.costVariance.trend).toBe('STABLE');
      expect(result.patternsOverview.costVariance.risk).toBe('LOW');
      expect(result.lessonsLearned.total).toBe(0);
    });

    it('should return empty dashboard on error', async () => {
      mockPatternCalculatorService.getOrganizationPatterns.mockRejectedValue(
        new Error('Service error'),
      );

      const result = await service.getOrganizationDashboardWidgets('org-1');

      expect(result.patternsOverview.costVariance.average).toBe(0);
      expect(result.lessonsLearned.total).toBe(0);
      expect(result.recommendationsSummary.totalPending).toBe(0);
    });
  });

});
