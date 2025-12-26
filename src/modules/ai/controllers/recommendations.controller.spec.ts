/**
 * RecommendationsController Integration Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from '../services/recommendations.service';
import { PatternCalculatorService } from '../services/pattern-calculator.service';
import { RecommendationType } from '../enums/recommendation-type.enum';
import { RecommendationPriority } from '../enums/recommendation-priority.enum';
import { RecommendationStatus } from '../enums/recommendation-status.enum';
import { ProjectType } from '../../projects/enums/project-type.enum';
import { DeliveryMethod } from '../../projects/enums/delivery-method.enum';

describe('RecommendationsController', () => {
  let controller: RecommendationsController;
  let service: RecommendationsService;

  const mockRecommendationsService = {
    createRecommendation: jest.fn(),
    getRecommendations: jest.fn(),
    getRecommendationById: jest.fn(),
    acceptRecommendation: jest.fn(),
    rejectRecommendation: jest.fn(),
    archiveRecommendation: jest.fn(),
    createProjectProfile: jest.fn(),
    updateProjectProfile: jest.fn(),
    getProjectProfile: jest.fn(),
    findSimilarProjects: jest.fn(),
    generateSmartDefaults: jest.fn(),
    createLessonLearned: jest.fn(),
    updateLessonLearned: jest.fn(),
    getLessonsLearned: jest.fn(),
    getLessonLearnedById: jest.fn(),
    approveLessonLearned: jest.fn(),
    generateLessonLearnedEmbedding: jest.fn().mockResolvedValue(undefined),
  };

  const mockPatternCalculatorService = {
    calculateOrganizationPatterns: jest.fn(),
    getOrganizationPatterns: jest.fn(),
    getPattern: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationsController],
      providers: [
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

    controller = module.get<RecommendationsController>(
      RecommendationsController,
    );
    service = module.get<RecommendationsService>(RecommendationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRecommendation', () => {
    it('should create a recommendation', async () => {
      const createDto = {
        projectId: 'project-1',
        organizationId: 'org-1',
        type: RecommendationType.COST_OPTIMIZATION,
        priority: RecommendationPriority.HIGH,
        title: 'Test Recommendation',
        description: 'Test Description',
        recommendationData: { test: 'data' },
      };

      const expectedResult = {
        id: 'rec-1',
        ...createDto,
        status: RecommendationStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRecommendationsService.createRecommendation.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.createRecommendation(createDto);

      expect(result).toEqual(expectedResult);
      expect(service.createRecommendation).toHaveBeenCalledWith(createDto);
    });
  });

  describe('getRecommendations', () => {
    it('should return paginated recommendations', async () => {
      const query = {
        projectId: 'project-1',
        page: 1,
        limit: 10,
      };

      const expectedResult = {
        data: [
          {
            id: 'rec-1',
            title: 'Recommendation 1',
            status: RecommendationStatus.PENDING,
          },
          {
            id: 'rec-2',
            title: 'Recommendation 2',
            status: RecommendationStatus.ACCEPTED,
          },
        ],
        total: 2,
        page: 1,
        limit: 10,
      };

      mockRecommendationsService.getRecommendations.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.getProjectRecommendations(
        query.projectId,
        undefined,
        undefined,
        undefined,
        query.page,
        query.limit,
      );

      expect(result).toEqual(expectedResult);
      expect(service.getRecommendations).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'project-1',
          page: 1,
          limit: 10,
        }),
      );
    });

    it('should filter recommendations by status', async () => {
      const query = {
        projectId: 'project-1',
        statuses: [RecommendationStatus.PENDING, RecommendationStatus.ACCEPTED],
        page: 1,
        limit: 10,
      };

      mockRecommendationsService.getRecommendations.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      await controller.getProjectRecommendations(
        query.projectId,
        query.statuses.join(','),
        undefined,
        undefined,
        query.page,
        query.limit,
      );

      expect(service.getRecommendations).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'project-1',
          statuses: query.statuses,
        }),
      );
    });
  });

  describe('getRecommendationById', () => {
    it('should return a single recommendation', async () => {
      const recommendationId = 'rec-1';
      const expectedResult = {
        id: recommendationId,
        title: 'Test Recommendation',
        status: RecommendationStatus.PENDING,
      };

      mockRecommendationsService.getRecommendationById.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.getRecommendationById(recommendationId);

      expect(result).toEqual(expectedResult);
      expect(service.getRecommendationById).toHaveBeenCalledWith(recommendationId);
    });
  });

  describe('acceptRecommendation', () => {
    it('should accept a recommendation', async () => {
      const recommendationId = 'rec-1';
      const body = {
        userId: 'user-1',
        feedback: 'Great suggestion!',
      };

      const expectedResult = {
        id: recommendationId,
        status: RecommendationStatus.ACCEPTED,
        actionTakenBy: body.userId,
        userFeedback: body.feedback,
      };

      mockRecommendationsService.acceptRecommendation.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.acceptRecommendation(
        recommendationId,
        body,
      );

      expect(result).toEqual(expectedResult);
      expect(service.acceptRecommendation).toHaveBeenCalledWith(
        recommendationId,
        body.userId,
        body.feedback,
      );
    });
  });

  describe('rejectRecommendation', () => {
    it('should reject a recommendation', async () => {
      const recommendationId = 'rec-1';
      const body = {
        userId: 'user-1',
        reason: 'Not applicable',
      };

      const expectedResult = {
        id: recommendationId,
        status: RecommendationStatus.REJECTED,
        actionTakenBy: body.userId,
        userFeedback: body.reason,
      };

      mockRecommendationsService.rejectRecommendation.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.rejectRecommendation(
        recommendationId,
        body,
      );

      expect(result).toEqual(expectedResult);
      expect(service.rejectRecommendation).toHaveBeenCalledWith(
        recommendationId,
        body.userId,
        body.reason,
      );
    });
  });

  describe('createProjectProfile', () => {
    it('should create a project profile', async () => {
      const createDto = {
        projectId: 'project-1',
        organizationId: 'org-1',
        projectType: ProjectType.COMMERCIAL,
        squareFootage: 50000,
        deliveryMethod: DeliveryMethod.DESIGN_BUILD,
        contractValue: 5000000,
        durationDays: 365,
      };

      const expectedResult = {
        id: 'profile-1',
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRecommendationsService.createProjectProfile.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.createProjectProfile('project-1', createDto, {} as any);

      expect(result).toEqual(expectedResult);
      expect(service.createProjectProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'project-1',
        }),
      );
    });
  });

  describe('findSimilarProjects', () => {
    it('should find similar projects', async () => {
      const projectId = 'project-1';
      const query = {
        limit: '5',
        minSimilarityScore: '0.5',
        useEmbeddings: 'true',
        onlyCompleted: 'true',
      };

      const expectedResult = [
        {
          profile: {
            projectId: 'project-2',
            projectType: ProjectType.COMMERCIAL,
            contractValue: 4800000,
          },
          similarityScore: 0.85,
        },
        {
          profile: {
            projectId: 'project-3',
            projectType: ProjectType.COMMERCIAL,
            contractValue: 5200000,
          },
          similarityScore: 0.78,
        },
      ];

      mockRecommendationsService.findSimilarProjects.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.findSimilarProjects(
        projectId,
        query.limit,
        query.minSimilarityScore,
        query.useEmbeddings,
        query.onlyCompleted,
      );

      expect(result).toEqual(expectedResult);
      expect(service.findSimilarProjects).toHaveBeenCalledWith({
        projectId,
        limit: 5,
        minSimilarityScore: 0.5,
        useEmbeddings: true,
        onlyCompleted: true,
      });
    });
  });

  describe('generateSmartDefaults', () => {
    it('should generate smart defaults for a project', async () => {
      const projectId = 'project-1';

      const expectedResult = {
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

      mockRecommendationsService.generateSmartDefaults.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.generateSmartDefaults(projectId);

      expect(result).toEqual(expectedResult);
      expect(service.generateSmartDefaults).toHaveBeenCalledWith(projectId);
    });

    it('should return null if no similar projects found', async () => {
      mockRecommendationsService.generateSmartDefaults.mockResolvedValue(null);

      const result = await controller.generateSmartDefaults('project-1');

      expect(result).toBeNull();
    });
  });

  describe('createLessonLearned', () => {
    it('should create a lesson learned', async () => {
      const createDto = {
        projectId: 'project-1',
        organizationId: 'org-1',
        title: 'Test Lesson',
        description: 'Test Description',
        category: 'BUDGET_MANAGEMENT' as any,
        impactType: 'COST_SAVINGS',
        outcome: 'Saved $10k',
        recommendations: 'Do this next time',
        tags: ['budget', 'savings'],
        isApproved: false,
      };

      const expectedResult = {
        id: 'lesson-1',
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRecommendationsService.createLessonLearned.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.createLessonLearned(createDto);

      expect(result).toEqual(expectedResult);
      expect(service.createLessonLearned).toHaveBeenCalledWith(createDto);
    });
  });

  describe('getLessonsLearned', () => {
    it('should return paginated lessons learned', async () => {
      const query = {
        organizationId: 'org-1',
        projectId: 'project-1',
        approvedOnly: 'true',
        page: '1',
        limit: '10',
      };

      const expectedResult = {
        data: [
          {
            id: 'lesson-1',
            title: 'Lesson 1',
            isApproved: true,
          },
          {
            id: 'lesson-2',
            title: 'Lesson 2',
            isApproved: true,
          },
        ],
        total: 2,
        page: 1,
        limit: 10,
      };

      mockRecommendationsService.getLessonsLearned.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.getLessonsLearned(
        query.organizationId,
        query.projectId,
        undefined, // categories
        undefined, // tags
        undefined, // search
        query.approvedOnly,
        undefined, // publicOnly
        query.page,
        query.limit,
      );

      expect(result).toEqual(expectedResult);
      expect(service.getLessonsLearned).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          projectId: 'project-1',
          approvedOnly: true,
        }),
      );
    });
  });

});
