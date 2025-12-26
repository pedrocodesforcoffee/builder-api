/**
 * PatternCalculatorService Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PatternCalculatorService } from './pattern-calculator.service';
import { ProjectPattern } from '../entities/project-pattern.entity';
import { ProjectProfile } from '../entities/project-profile.entity';
import { PatternType } from '../enums/pattern-type.enum';

describe('PatternCalculatorService', () => {
  let service: PatternCalculatorService;
  let projectPatternRepo: Repository<ProjectPattern>;
  let projectProfileRepo: Repository<ProjectProfile>;

  const mockProjectPatternRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
  };

  const mockProjectProfileRepo = {
    find: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatternCalculatorService,
        {
          provide: getRepositoryToken(ProjectPattern),
          useValue: mockProjectPatternRepo,
        },
        {
          provide: getRepositoryToken(ProjectProfile),
          useValue: mockProjectProfileRepo,
        },
      ],
    }).compile();

    service = module.get<PatternCalculatorService>(PatternCalculatorService);
    projectPatternRepo = module.get<Repository<ProjectPattern>>(
      getRepositoryToken(ProjectPattern),
    );
    projectProfileRepo = module.get<Repository<ProjectProfile>>(
      getRepositoryToken(ProjectProfile),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateOrganizationPatterns', () => {
    it('should calculate cost variance pattern', async () => {
      const organizationId = 'org-1';

      const mockProfiles = [
        {
          id: 'profile-1',
          organizationId,
          contractValue: 1000000,
          actualCost: 1100000,
          costVariancePercent: 10,
          completedAt: new Date('2024-01-01'),
        },
        {
          id: 'profile-2',
          organizationId,
          contractValue: 2000000,
          actualCost: 2200000,
          costVariancePercent: 10,
          completedAt: new Date('2024-02-01'),
        },
        {
          id: 'profile-3',
          organizationId,
          contractValue: 1500000,
          actualCost: 1575000,
          costVariancePercent: 5,
          completedAt: new Date('2024-03-01'),
        },
      ];

      mockProjectProfileRepo.find.mockResolvedValue(mockProfiles);
      mockProjectPatternRepo.create.mockImplementation((data) => data);
      mockProjectPatternRepo.save.mockImplementation((pattern) =>
        Promise.resolve({ ...pattern, id: 'pattern-1' }),
      );

      await service.calculateOrganizationPatterns(organizationId);

      expect(mockProjectPatternRepo.save).toHaveBeenCalled();
      const savedPattern = mockProjectPatternRepo.save.mock.calls[0][0];
      expect(savedPattern.patternType).toBe(PatternType.COST_VARIANCE);
      expect(savedPattern.averageValue).toBeCloseTo(8.33, 1);
      expect(savedPattern.sampleSize).toBe(3);
    });

    it('should calculate schedule variance pattern', async () => {
      const organizationId = 'org-1';

      const mockProfiles = [
        {
          id: 'profile-1',
          organizationId,
          durationDays: 365,
          actualDuration: 380,
          scheduleVarianceDays: 15,
          completedAt: new Date(),
        },
        {
          id: 'profile-2',
          organizationId,
          durationDays: 180,
          actualDuration: 195,
          scheduleVarianceDays: 15,
          completedAt: new Date(),
        },
        {
          id: 'profile-3',
          organizationId,
          durationDays: 270,
          actualDuration: 275,
          scheduleVarianceDays: 5,
          completedAt: new Date(),
        },
      ];

      mockProjectProfileRepo.find.mockResolvedValue(mockProfiles);
      mockProjectPatternRepo.create.mockImplementation((data) => data);
      mockProjectPatternRepo.save.mockImplementation((pattern) =>
        Promise.resolve({ ...pattern, id: 'pattern-1' }),
      );

      await service.calculateOrganizationPatterns(organizationId);

      const savedPattern = mockProjectPatternRepo.save.mock.calls[0][0];
      expect(savedPattern.patternType).toBe(PatternType.SCHEDULE_VARIANCE);
      expect(savedPattern.averageValue).toBeCloseTo(11.67, 1);
    });

    it('should skip patterns with insufficient data', async () => {
      const organizationId = 'org-1';

      const mockProfiles = [
        {
          id: 'profile-1',
          organizationId,
          contractValue: 1000000,
          actualCost: 1100000,
          costVariancePercent: 10,
          completedAt: new Date(),
        },
      ];

      mockProjectProfileRepo.find.mockResolvedValue(mockProfiles);

      await service.calculateOrganizationPatterns(organizationId);

      // Should not save pattern with only 1 data point (minimum is 3)
      expect(mockProjectPatternRepo.save).not.toHaveBeenCalled();
    });

    it('should detect trend direction', async () => {
      const organizationId = 'org-1';

      const mockProfiles = [
        {
          id: 'profile-1',
          organizationId,
          costVariancePercent: 5,
          completedAt: new Date('2024-01-01'),
        },
        {
          id: 'profile-2',
          organizationId,
          costVariancePercent: 7,
          completedAt: new Date('2024-02-01'),
        },
        {
          id: 'profile-3',
          organizationId,
          costVariancePercent: 9,
          completedAt: new Date('2024-03-01'),
        },
      ];

      mockProjectProfileRepo.find.mockResolvedValue(mockProfiles);
      mockProjectPatternRepo.create.mockImplementation((data) => data);
      mockProjectPatternRepo.save.mockImplementation((pattern) =>
        Promise.resolve({ ...pattern, id: 'pattern-1' }),
      );

      await service.calculateOrganizationPatterns(organizationId);

      const savedPattern = mockProjectPatternRepo.save.mock.calls[0][0];
      expect(savedPattern.trendDirection).toBe('INCREASING');
    });

    it('should determine impact severity', async () => {
      const organizationId = 'org-1';

      const mockProfiles = [
        {
          id: 'profile-1',
          organizationId,
          costVariancePercent: 15,
          completedAt: new Date(),
        },
        {
          id: 'profile-2',
          organizationId,
          costVariancePercent: 18,
          completedAt: new Date(),
        },
        {
          id: 'profile-3',
          organizationId,
          costVariancePercent: 20,
          completedAt: new Date(),
        },
      ];

      mockProjectProfileRepo.find.mockResolvedValue(mockProfiles);
      mockProjectPatternRepo.create.mockImplementation((data) => data);
      mockProjectPatternRepo.save.mockImplementation((pattern) =>
        Promise.resolve({ ...pattern, id: 'pattern-1' }),
      );

      await service.calculateOrganizationPatterns(organizationId);

      const savedPattern = mockProjectPatternRepo.save.mock.calls[0][0];
      expect(savedPattern.impactSeverity).toBe('HIGH');
    });
  });

  describe('getOrganizationPatterns', () => {
    it('should retrieve all patterns for an organization', async () => {
      const organizationId = 'org-1';

      const mockPatterns = [
        {
          id: 'pattern-1',
          organizationId,
          patternType: PatternType.COST_VARIANCE,
          averageValue: 8.5,
          standardDeviation: 2.1,
          sampleSize: 5,
          trendDirection: 'STABLE',
          impactSeverity: 'MEDIUM',
        },
        {
          id: 'pattern-2',
          organizationId,
          patternType: PatternType.SCHEDULE_VARIANCE,
          averageValue: 12.3,
          standardDeviation: 3.5,
          sampleSize: 5,
          trendDirection: 'INCREASING',
          impactSeverity: 'HIGH',
        },
      ];

      mockProjectPatternRepo.find.mockResolvedValue(mockPatterns);

      const result = await service.getOrganizationPatterns(organizationId);

      expect(result).toEqual(mockPatterns);
      expect(mockProjectPatternRepo.find).toHaveBeenCalledWith({
        where: { organizationId },
        order: { calculatedAt: 'DESC' },
      });
    });
  });

  describe('getPattern', () => {
    it('should retrieve a specific pattern', async () => {
      const organizationId = 'org-1';
      const patternType = PatternType.COST_VARIANCE;

      const mockPattern = {
        id: 'pattern-1',
        organizationId,
        patternType,
        averageValue: 8.5,
        standardDeviation: 2.1,
        sampleSize: 5,
      };

      mockProjectPatternRepo.findOne.mockResolvedValue(mockPattern);

      const result = await service.getPattern(organizationId, patternType);

      expect(result).toEqual(mockPattern);
      expect(mockProjectPatternRepo.findOne).toHaveBeenCalledWith({
        where: { organizationId, patternType },
        order: { calculatedAt: 'DESC' },
      });
    });

    it('should return null if pattern not found', async () => {
      mockProjectPatternRepo.findOne.mockResolvedValue(null);

      const result = await service.getPattern('org-1', PatternType.COST_VARIANCE);

      expect(result).toBeNull();
    });
  });

});
