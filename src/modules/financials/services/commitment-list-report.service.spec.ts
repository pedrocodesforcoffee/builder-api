import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { CommitmentListReportService } from './commitment-list-report.service';
import { ReportExcelExportService } from './report-excel-export.service';
import { Commitment, CostCode, CommitmentChangeOrder } from '../entities';
import { Project } from '../../projects/entities/project.entity';

describe('CommitmentListReportService', () => {
  let service: CommitmentListReportService;
  let commitmentRepo: Repository<Commitment>;
  let changeOrderRepo: Repository<CommitmentChangeOrder>;
  let projectRepo: Repository<Project>;
  let excelExportService: ReportExcelExportService;

  const mockQueryBuilder: any = {
    createQueryBuilder: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getRawMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommitmentListReportService,
        {
          provide: getRepositoryToken(Commitment),
          useValue: {
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(CostCode),
          useValue: {},
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
        {
          provide: ReportExcelExportService,
          useValue: {
            exportCommitmentListToExcel: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CommitmentListReportService>(CommitmentListReportService);
    commitmentRepo = module.get(getRepositoryToken(Commitment));
    changeOrderRepo = module.get(getRepositoryToken(CommitmentChangeOrder));
    projectRepo = module.get(getRepositoryToken(Project));
    excelExportService = module.get<ReportExcelExportService>(ReportExcelExportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generate', () => {
    const projectId = 'project-123';

    const mockProject = {
      id: projectId,
      name: 'Test Project',
    };

    const mockCommitments = [
      {
        id: 'commitment-1',
        number: 'SC-001',
        type: 'SUBCONTRACT',
        vendorName: 'Test Vendor',
        originalAmount: 100000,
        currentAmount: 110000,
        status: 'APPROVED',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      },
    ];

    it('should generate commitment list report successfully', async () => {
      // Arrange
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject as any);

      jest.spyOn(commitmentRepo, 'createQueryBuilder').mockReturnValue({
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue(mockCommitments),
      } as any);

      jest.spyOn(changeOrderRepo, 'createQueryBuilder').mockReturnValue({
        ...mockQueryBuilder,
        getRawMany: jest.fn().mockResolvedValue([
          { commitmentId: 'commitment-1', totalChangeOrders: '10000' },
        ]),
      } as any);

      // Act
      const result = await service.generate({ projectId });

      // Assert
      expect(result).toBeDefined();
      expect(result.projectId).toBe(projectId);
      expect(result.lines).toHaveLength(1);
      expect(result.lines[0].commitmentNumber).toBe('SC-001');
      expect(result.lines[0].originalAmount).toBe(100000);
      expect(result.lines[0].revisedAmount).toBe(110000);
      expect(result.lines[0].changeOrders).toBe(10000);
    });

    it('should throw NotFoundException if project not found', async () => {
      // Arrange
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.generate({ projectId })).rejects.toThrow(NotFoundException);
    });

    it('should handle empty commitments list', async () => {
      // Arrange
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(commitmentRepo, 'createQueryBuilder').mockReturnValue({
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([]),
      } as any);

      // Act
      const result = await service.generate({ projectId });

      // Assert
      expect(result.lines).toHaveLength(0);
      expect(result.totalOriginalAmount).toBe(0);
    });

    it('should filter by commitment type', async () => {
      // Arrange
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject as any);
      const queryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue(mockCommitments),
      };
      jest.spyOn(commitmentRepo, 'createQueryBuilder').mockReturnValue(queryBuilder as any);
      jest.spyOn(changeOrderRepo, 'createQueryBuilder').mockReturnValue({
        ...mockQueryBuilder,
        getRawMany: jest.fn().mockResolvedValue([]),
      } as any);

      // Act
      await service.generate({ projectId, type: 'SUBCONTRACT' as any });

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('commitment.type = :type', { type: 'SUBCONTRACT' });
    });
  });

  describe('exportToExcel', () => {
    it('should export report to Excel buffer', async () => {
      // Arrange
      const projectId = 'project-123';
      const mockBuffer = Buffer.from('mock-excel-data');
      const mockProject = { id: projectId, name: 'Test Project' };

      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(commitmentRepo, 'createQueryBuilder').mockReturnValue({
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([]),
      } as any);
      jest.spyOn(excelExportService, 'exportCommitmentListToExcel').mockResolvedValue(mockBuffer);

      // Act
      const result = await service.exportToExcel({ projectId });

      // Assert
      expect(result).toBe(mockBuffer);
      expect(excelExportService.exportCommitmentListToExcel).toHaveBeenCalled();
    });
  });
});
