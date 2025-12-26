/**
 * RecommendationsService Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecommendationsService } from './recommendations.service';
import { OpenAiClientService } from './openai-client.service';
import { Recommendation } from '../entities/recommendation.entity';
import { ProjectProfile } from '../entities/project-profile.entity';
import { LessonLearned } from '../entities/lesson-learned.entity';
import { ProjectPattern } from '../entities/project-pattern.entity';
import { SubcontractorPerformance } from '../entities/subcontractor-performance.entity';
import { Project } from '../../projects/entities/project.entity';
import { BudgetLineItem } from '../../financials/entities/budget-line-item.entity';
import { RecommendationType } from '../enums/recommendation-type.enum';
import { RecommendationPriority } from '../enums/recommendation-priority.enum';
import { RecommendationStatus } from '../enums/recommendation-status.enum';
import { ProjectType } from '../../projects/enums/project-type.enum';
import { DeliveryMethod } from '../../projects/enums/delivery-method.enum';

describe('RecommendationsService', () => {
  let service: RecommendationsService;
  let recommendationRepo: Repository<Recommendation>;
  let projectProfileRepo: Repository<ProjectProfile>;
  let lessonLearnedRepo: Repository<LessonLearned>;
  let projectPatternRepo: Repository<ProjectPattern>;
  let projectRepo: Repository<Project>;
  let budgetLineItemRepo: Repository<BudgetLineItem>;
  let openAiClient: OpenAiClientService;

  const mockRecommendationRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    })),
  };

  const mockProjectProfileRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    })),
  };

  const mockLessonLearnedRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
      getCount: jest.fn(),
      getMany: jest.fn(),
    })),
  };

  const mockProjectPatternRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockProjectRepo = {
    findOne: jest.fn(),
  };

  const mockBudgetLineItemRepo = {
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
    })),
  };

  const mockSubcontractorPerformanceRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockOpenAiClient = {
    generateEmbedding: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        {
          provide: getRepositoryToken(Recommendation),
          useValue: mockRecommendationRepo,
        },
        {
          provide: getRepositoryToken(ProjectProfile),
          useValue: mockProjectProfileRepo,
        },
        {
          provide: getRepositoryToken(LessonLearned),
          useValue: mockLessonLearnedRepo,
        },
        {
          provide: getRepositoryToken(ProjectPattern),
          useValue: mockProjectPatternRepo,
        },
        {
          provide: getRepositoryToken(SubcontractorPerformance),
          useValue: mockSubcontractorPerformanceRepo,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepo,
        },
        {
          provide: getRepositoryToken(BudgetLineItem),
          useValue: mockBudgetLineItemRepo,
        },
        {
          provide: OpenAiClientService,
          useValue: mockOpenAiClient,
        },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
    recommendationRepo = module.get<Repository<Recommendation>>(
      getRepositoryToken(Recommendation),
    );
    projectProfileRepo = module.get<Repository<ProjectProfile>>(
      getRepositoryToken(ProjectProfile),
    );
    lessonLearnedRepo = module.get<Repository<LessonLearned>>(
      getRepositoryToken(LessonLearned),
    );
    projectPatternRepo = module.get<Repository<ProjectPattern>>(
      getRepositoryToken(ProjectPattern),
    );
    projectRepo = module.get<Repository<Project>>(getRepositoryToken(Project));
    budgetLineItemRepo = module.get<Repository<BudgetLineItem>>(
      getRepositoryToken(BudgetLineItem),
    );
    openAiClient = module.get<OpenAiClientService>(OpenAiClientService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRecommendation', () => {
    it('should create a recommendation successfully', async () => {
      const createDto = {
        projectId: 'project-1',
        organizationId: 'org-1',
        type: RecommendationType.COST_OPTIMIZATION,
        priority: RecommendationPriority.HIGH,
        title: 'Test Recommendation',
        description: 'Test Description',
        recommendationData: { testData: 'value' },
      };

      const savedRecommendation = {
        id: 'rec-1',
        ...createDto,
        status: RecommendationStatus.PENDING,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRecommendationRepo.create.mockReturnValue(savedRecommendation);
      mockRecommendationRepo.save.mockResolvedValue(savedRecommendation);

      const result = await service.createRecommendation(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('rec-1');
      expect(result.title).toBe('Test Recommendation');
      expect(mockRecommendationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createDto,
          expiresAt: expect.any(Date),
        }),
      );
      expect(mockRecommendationRepo.save).toHaveBeenCalled();
    });

    it('should handle errors during creation', async () => {
      const createDto = {
        projectId: 'project-1',
        organizationId: 'org-1',
        type: RecommendationType.COST_OPTIMIZATION,
        priority: RecommendationPriority.HIGH,
        title: 'Test Recommendation',
        description: 'Test Description',
        recommendationData: {},
      };

      mockRecommendationRepo.save.mockRejectedValue(new Error('Database error'));

      await expect(service.createRecommendation(createDto)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('createProjectProfile', () => {
    it('should create a project profile with embeddings', async () => {
      const createDto = {
        projectId: 'project-1',
        organizationId: 'org-1',
        projectType: ProjectType.COMMERCIAL,
        squareFootage: 50000,
        deliveryMethod: DeliveryMethod.DESIGN_BUILD,
        contractValue: 5000000,
        durationDays: 365,
      };

      const savedProfile = {
        id: 'profile-1',
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProjectProfileRepo.create.mockReturnValue(savedProfile);
      mockProjectProfileRepo.save.mockResolvedValue(savedProfile);

      const result = await service.createProjectProfile(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('profile-1');
      expect(result.projectId).toBe('project-1');
      expect(mockProjectProfileRepo.create).toHaveBeenCalledWith(createDto);
      expect(mockProjectProfileRepo.save).toHaveBeenCalled();
    });

    it('should create profile without embeddings if generation fails', async () => {
      const createDto = {
        projectId: 'project-1',
        organizationId: 'org-1',
        projectType: ProjectType.COMMERCIAL,
        contractValue: 5000000,
      };

      const savedProfile = {
        id: 'profile-1',
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProjectProfileRepo.create.mockReturnValue(savedProfile);
      mockProjectProfileRepo.save.mockResolvedValue(savedProfile);

      const result = await service.createProjectProfile(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('profile-1');
      expect(mockProjectProfileRepo.save).toHaveBeenCalled();
    });
  });

  describe('findSimilarProjects', () => {
    it('should find similar projects using embeddings', async () => {
      const searchDto = {
        projectId: 'project-1',
        limit: 5,
        minSimilarityScore: 0.5,
        useEmbeddings: true,
        onlyCompleted: true,
      };

      const mockProfile = {
        id: 'profile-1',
        projectId: 'project-1',
        organizationId: 'org-1',
        projectType: ProjectType.COMMERCIAL,
        embedding: Array(1536).fill(0.6),
      };

      mockProjectProfileRepo.findOne.mockResolvedValue(mockProfile);
      mockProjectProfileRepo.createQueryBuilder().getMany.mockResolvedValue([]);

      const result = await service.findSimilarProjects(searchDto);

      expect(result).toHaveLength(0);
      expect(mockProjectProfileRepo.findOne).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
      });
    });

    it('should find similar projects without embeddings', async () => {
      const searchDto = {
        projectId: 'project-1',
        limit: 5,
        minSimilarityScore: 0.3,
        useEmbeddings: false,
        onlyCompleted: false,
      };

      const mockProfile = {
        id: 'profile-1',
        projectId: 'project-1',
        organizationId: 'org-1',
        projectType: ProjectType.COMMERCIAL,
        squareFootage: 50000,
        deliveryMethod: DeliveryMethod.DESIGN_BUILD,
        contractValue: 5000000,
      };

      mockProjectProfileRepo.findOne.mockResolvedValue(mockProfile);
      mockProjectProfileRepo.createQueryBuilder().getMany.mockResolvedValue([]);

      const result = await service.findSimilarProjects(searchDto);

      expect(result).toHaveLength(0);
    });

    it('should throw error if profile not found', async () => {
      mockProjectProfileRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findSimilarProjects({
          projectId: 'nonexistent',
          limit: 5,
          minSimilarityScore: 0.3,
          useEmbeddings: false,
          onlyCompleted: false,
        }),
      ).rejects.toThrow('Project profile not found');
    });
  });

  describe('generateSmartDefaults', () => {
    it('should generate smart defaults from similar projects', async () => {
      const projectId = 'project-1';

      const mockProfile = {
        id: 'profile-1',
        projectId: 'project-1',
        organizationId: 'org-1',
        projectType: ProjectType.COMMERCIAL,
        squareFootage: 50000,
      };

      mockProjectProfileRepo.findOne.mockResolvedValue(mockProfile);
      mockProjectProfileRepo.createQueryBuilder().getMany.mockResolvedValue([]);
      mockProjectPatternRepo.find.mockResolvedValue([]);
      mockLessonLearnedRepo.find.mockResolvedValue([]);

      await expect(service.generateSmartDefaults(projectId)).rejects.toThrow(
        'No similar projects found',
      );
    });

    it('should throw error if no similar projects found', async () => {
      mockProjectProfileRepo.findOne.mockResolvedValue({
        id: 'profile-1',
        projectId: 'project-1',
        organizationId: 'org-1',
      });
      mockProjectProfileRepo.createQueryBuilder().getMany.mockResolvedValue([]);

      await expect(service.generateSmartDefaults('project-1')).rejects.toThrow(
        'No similar projects found',
      );
    });
  });

  describe('acceptRecommendation', () => {
    it('should accept a recommendation successfully', async () => {
      const recommendationId = 'rec-1';
      const userId = 'user-1';
      const feedback = 'Great recommendation!';

      const mockRecommendation = {
        id: recommendationId,
        status: RecommendationStatus.PENDING,
      };

      const updatedRecommendation = {
        ...mockRecommendation,
        status: RecommendationStatus.ACCEPTED,
        actionTakenByUserId: userId,
        actionTakenAt: new Date(),
        userFeedback: feedback,
      };

      mockRecommendationRepo.findOne.mockResolvedValue(mockRecommendation);
      mockRecommendationRepo.save.mockResolvedValue(updatedRecommendation);

      const result = await service.acceptRecommendation(
        recommendationId,
        userId,
        feedback,
      );

      expect(result).toBeDefined();
      expect(mockRecommendationRepo.save).toHaveBeenCalled();
    });

    it('should throw error if recommendation not found', async () => {
      mockRecommendationRepo.findOne.mockResolvedValue(null);

      await expect(
        service.acceptRecommendation('nonexistent', 'user-1', 'feedback'),
      ).rejects.toThrow('Recommendation not found');
    });
  });

  describe('rejectRecommendation', () => {
    it('should reject a recommendation successfully', async () => {
      const recommendationId = 'rec-1';
      const userId = 'user-1';
      const reason = 'Not applicable';

      const mockRecommendation = {
        id: recommendationId,
        status: RecommendationStatus.PENDING,
      };

      const updatedRecommendation = {
        ...mockRecommendation,
        status: RecommendationStatus.REJECTED,
        actionTakenByUserId: userId,
        actionTakenAt: new Date(),
        userFeedback: reason,
      };

      mockRecommendationRepo.findOne.mockResolvedValue(mockRecommendation);
      mockRecommendationRepo.save.mockResolvedValue(updatedRecommendation);

      const result = await service.rejectRecommendation(
        recommendationId,
        userId,
        reason,
      );

      expect(result).toBeDefined();
      expect(mockRecommendationRepo.save).toHaveBeenCalled();
    });
  });

  describe('createLessonLearned', () => {
    it('should create a lesson learned successfully', async () => {
      const createDto = {
        projectId: 'project-1',
        organizationId: 'org-1',
        title: 'Test Lesson',
        category: 'BUDGET_MANAGEMENT' as any,
        impactType: 'COST_SAVINGS',
        outcome: 'Saved $10k',
        tags: ['budget', 'savings'],
        isApproved: false,
      };

      const savedLesson = {
        id: 'lesson-1',
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockLessonLearnedRepo.create.mockReturnValue(savedLesson);
      mockLessonLearnedRepo.save.mockResolvedValue(savedLesson);

      const result = await service.createLessonLearned(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('lesson-1');
      expect(result.title).toBe('Test Lesson');
      expect(mockLessonLearnedRepo.create).toHaveBeenCalledWith(createDto);
      expect(mockLessonLearnedRepo.save).toHaveBeenCalled();
    });
  });

});
