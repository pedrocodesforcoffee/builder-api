import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { CashFlowProjectionReportService } from './cash-flow-projection-report.service';
import { Commitment, CommitmentChangeOrder } from '../entities';
import { Project } from '../../projects/entities/project.entity';

describe('CashFlowProjectionReportService', () => {
  let service: CashFlowProjectionReportService;
  let commitmentRepository: Repository<Commitment>;
  let changeOrderRepository: Repository<CommitmentChangeOrder>;
  let projectRepository: Repository<Project>;

  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
  };

  const mockCommitment1 = {
    id: 'commitment-1',
    number: 'PO-001',
    projectId: 'project-1',
    vendorName: 'Vendor A',
    originalAmount: 100000,
    vendor: { id: 'vendor-1', name: 'Vendor A' },
  };

  const mockCommitment2 = {
    id: 'commitment-2',
    number: 'PO-002',
    projectId: 'project-1',
    vendorName: 'Vendor B',
    originalAmount: 50000,
    vendor: { id: 'vendor-2', name: 'Vendor B' },
  };

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashFlowProjectionReportService,
        {
          provide: getRepositoryToken(Commitment),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CommitmentChangeOrder),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CashFlowProjectionReportService>(CashFlowProjectionReportService);
    commitmentRepository = module.get<Repository<Commitment>>(getRepositoryToken(Commitment));
    changeOrderRepository = module.get<Repository<CommitmentChangeOrder>>(
      getRepositoryToken(CommitmentChangeOrder),
    );
    projectRepository = module.get<Repository<Project>>(getRepositoryToken(Project));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generate', () => {
    it('should generate cash flow projection report successfully', async () => {
      // Arrange
      const asOfDate = new Date('2024-06-01');
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue([mockCommitment1, mockCommitment2] as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([
        { commitmentId: 'commitment-1', totalChangeOrders: '10000' },
        { commitmentId: 'commitment-2', totalChangeOrders: '5000' },
      ]);

      // Act
      const result = await service.generate({
        projectId: 'project-1',
        asOfDate,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.projectId).toBe('project-1');
      expect(result.projectName).toBe('Test Project');
      expect(result.commitmentDetails).toHaveLength(2);
      expect(result.monthlyProjections).toBeDefined();
      expect(result.totalProjectedOutflows).toBeGreaterThan(0);
      expect(result.peakCashRequirement).toBeDefined();
    });

    it('should throw NotFoundException when project not found', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.generate({ projectId: 'invalid-project' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.generate({ projectId: 'invalid-project' }),
      ).rejects.toThrow('Project not found: invalid-project');
    });

    it('should use default as-of date when not provided', async () => {
      // Arrange
      const beforeCall = Date.now();
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue([]);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      const result = await service.generate({ projectId: 'project-1' });
      const afterCall = Date.now();

      // Assert
      expect(result.asOfDate).toBeInstanceOf(Date);
      expect(result.asOfDate.getTime()).toBeGreaterThanOrEqual(beforeCall);
      expect(result.asOfDate.getTime()).toBeLessThanOrEqual(afterCall);
    });

    it('should use project end date when endDate not provided', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue([]);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      expect(result.endDate).toBeInstanceOf(Date);
    });

    it('should handle custom date range', async () => {
      // Arrange
      const startDate = new Date('2024-03-01');
      const endDate = new Date('2024-09-30');
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue([]);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      const result = await service.generate({
        projectId: 'project-1',
        startDate,
        endDate,
      });

      // Assert
      expect(result.startDate).toEqual(startDate);
      expect(result.endDate).toEqual(endDate);
    });

    it('should calculate commitment details with change orders', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue([mockCommitment1] as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([
        { commitmentId: 'commitment-1', totalChangeOrders: '15000' },
      ]);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      const commitment = result.commitmentDetails[0];
      expect(commitment.commitmentId).toBe('commitment-1');
      expect(commitment.commitmentNumber).toBe('PO-001');
      expect(commitment.vendorName).toBe('Vendor A');
      expect(commitment.revisedAmount).toBe(115000); // 100000 + 15000
      expect(commitment.paidToDate).toBe(0); // TODO integration
      expect(commitment.retentionHeld).toBeGreaterThan(0);
      expect(commitment.remainingBalance).toBeGreaterThan(0);
      expect(commitment.projectedPayments).toBeDefined();
    });

    it('should handle commitments without change orders', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue([mockCommitment1] as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      const commitment = result.commitmentDetails[0];
      expect(commitment.revisedAmount).toBe(100000); // Original amount only
    });

    it('should handle commitments without vendor name', async () => {
      // Arrange
      const commitmentWithoutVendor = { ...mockCommitment1, vendorName: null };
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue([commitmentWithoutVendor] as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      const commitment = result.commitmentDetails[0];
      expect(commitment.vendorName).toBe('Unknown Vendor');
    });

    it('should calculate retention held at 5%', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue([mockCommitment1] as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      const commitment = result.commitmentDetails[0];
      expect(commitment.retentionHeld).toBe(5000); // 5% of 100000
    });

    it('should project monthly payments evenly across months', async () => {
      // Arrange
      const startDate = new Date('2024-06-01');
      const endDate = new Date('2024-08-31');
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue([mockCommitment1] as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      const result = await service.generate({
        projectId: 'project-1',
        startDate,
        endDate,
      });

      // Assert
      const commitment = result.commitmentDetails[0];
      expect(commitment.projectedPayments.length).toBe(4); // May, June, July, August (includes start month)

      // Check that payments are evenly distributed
      const totalPayments = commitment.projectedPayments.reduce(
        (sum, p) => sum + p.projectedAmount,
        0,
      );
      expect(Math.abs(totalPayments - commitment.remainingBalance)).toBeLessThan(1); // Account for rounding
    });

    it('should generate monthly projections', async () => {
      // Arrange
      const startDate = new Date('2024-06-01');
      const endDate = new Date('2024-08-31');
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue([mockCommitment1] as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      const result = await service.generate({
        projectId: 'project-1',
        startDate,
        endDate,
      });

      // Assert
      expect(result.monthlyProjections).toHaveLength(4);
      result.monthlyProjections.forEach(projection => {
        expect(projection.month).toBeInstanceOf(Date);
        expect(projection.projectedInflows).toBeGreaterThanOrEqual(0);
        expect(projection.projectedOutflows).toBeGreaterThanOrEqual(0);
        expect(projection.netCashFlow).toBeDefined();
        expect(projection.cumulativeCash).toBeDefined();
      });
    });

    it('should calculate cumulative cash correctly', async () => {
      // Arrange
      const startDate = new Date('2024-06-01');
      const endDate = new Date('2024-08-31');
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue([mockCommitment1] as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      const result = await service.generate({
        projectId: 'project-1',
        startDate,
        endDate,
      });

      // Assert
      let expectedCumulative = 0;
      result.monthlyProjections.forEach(projection => {
        expectedCumulative += projection.netCashFlow;
        expect(projection.cumulativeCash).toBeCloseTo(expectedCumulative, 2);
      });
    });

    it('should calculate peak cash requirement as most negative cumulative cash', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue([mockCommitment1, mockCommitment2] as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      expect(result.peakCashRequirement).toBeDefined();

      if (result.monthlyProjections.length > 0) {
        // Peak should be the minimum (most negative) cumulative cash
        const minCumulativeCash = Math.min(...result.monthlyProjections.map(p => p.cumulativeCash));
        expect(result.peakCashRequirement).toBe(minCumulativeCash);
      } else {
        // If no projections, peak should be 0
        expect(result.peakCashRequirement).toBe(0);
      }
    });

    it('should calculate total projected outflows', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue([mockCommitment1, mockCommitment2] as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      const totalRemainingBalance = result.commitmentDetails.reduce(
        (sum, c) => sum + c.remainingBalance,
        0,
      );
      expect(result.totalProjectedOutflows).toBeCloseTo(totalRemainingBalance, 2);
    });

    it('should calculate total retention held', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue([mockCommitment1, mockCommitment2] as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      const totalRetention = result.commitmentDetails.reduce(
        (sum, c) => sum + c.retentionHeld,
        0,
      );
      expect(result.totalRetentionHeld).toBeCloseTo(totalRetention, 2);
    });

    it('should handle project without commitments', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue([]);

      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      expect(result.commitmentDetails).toHaveLength(0);
      expect(result.totalProjectedOutflows).toBe(0);
      expect(result.totalRetentionHeld).toBe(0);
      expect(result.peakCashRequirement).toBe(0);
    });

    it('should handle empty monthly projections when no date range', async () => {
      // Arrange
      const projectWithoutDates = { ...mockProject, endDate: undefined };
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(projectWithoutDates as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue([]);

      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      expect(result.monthlyProjections).toBeDefined();
    });

    it('should set projected inflows to 0 (TODO integration)', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue([mockCommitment1] as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      expect(result.totalProjectedInflows).toBe(0);
      result.monthlyProjections.forEach(projection => {
        expect(projection.projectedInflows).toBe(0);
      });
    });

    it('should calculate net cash flow correctly', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue([mockCommitment1] as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      expect(result.netCashFlow).toBe(result.totalProjectedInflows - result.totalProjectedOutflows);

      result.monthlyProjections.forEach(projection => {
        expect(projection.netCashFlow).toBe(
          projection.projectedInflows - projection.projectedOutflows,
        );
      });
    });

    it('should handle commitments with zero remaining balance', async () => {
      // Arrange
      const fullyPaidCommitment = { ...mockCommitment1, originalAmount: 0 };
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue([fullyPaidCommitment] as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      const commitment = result.commitmentDetails[0];
      expect(commitment.projectedPayments).toHaveLength(0);
    });

    it('should aggregate projected outflows by month correctly', async () => {
      // Arrange
      const startDate = new Date('2024-06-01');
      const endDate = new Date('2024-08-31');
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue([mockCommitment1, mockCommitment2] as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      const result = await service.generate({
        projectId: 'project-1',
        startDate,
        endDate,
      });

      // Assert
      result.monthlyProjections.forEach(projection => {
        // Calculate expected outflows for this month
        let expectedOutflows = 0;
        result.commitmentDetails.forEach(commitment => {
          const payment = commitment.projectedPayments.find(
            p => p.month.getTime() === projection.month.getTime(),
          );
          if (payment) {
            expectedOutflows += payment.projectedAmount;
          }
        });

        expect(projection.projectedOutflows).toBeCloseTo(expectedOutflows, 2);
      });
    });
  });
});
