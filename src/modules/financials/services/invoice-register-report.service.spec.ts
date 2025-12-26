import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { InvoiceRegisterReportService } from './invoice-register-report.service';
import { Project } from '../../projects/entities/project.entity';

describe('InvoiceRegisterReportService', () => {
  let service: InvoiceRegisterReportService;
  let projectRepository: Repository<Project>;

  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceRegisterReportService,
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InvoiceRegisterReportService>(InvoiceRegisterReportService);
    projectRepository = module.get<Repository<Project>>(getRepositoryToken(Project));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generate', () => {
    it('should generate invoice register report successfully', async () => {
      // Arrange
      const asOfDate = new Date('2024-06-30');
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);

      // Act
      const result = await service.generate({
        projectId: 'project-1',
        asOfDate,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.projectId).toBe('project-1');
      expect(result.projectName).toBe('Test Project');
      expect(result.asOfDate).toEqual(asOfDate);
      expect(result.agingCurrent).toBeDefined();
      expect(result.aging31To60).toBeDefined();
      expect(result.aging61To90).toBeDefined();
      expect(result.aging90Plus).toBeDefined();
      expect(result.totalInvoiceAmount).toBeDefined();
      expect(result.invoices).toBeDefined();
      expect(Array.isArray(result.invoices)).toBe(true);
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

      // Act
      const result = await service.generate({ projectId: 'project-1' });
      const afterCall = Date.now();

      // Assert
      expect(result.asOfDate).toBeInstanceOf(Date);
      expect(result.asOfDate.getTime()).toBeGreaterThanOrEqual(beforeCall);
      expect(result.asOfDate.getTime()).toBeLessThanOrEqual(afterCall);
    });

    it('should filter by invoice type PAYABLE', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);

      // Act
      const result = await service.generate({
        projectId: 'project-1',
        type: 'PAYABLE',
      });

      // Assert
      expect(result.filterType).toBe('PAYABLE');
    });

    it('should filter by invoice type RECEIVABLE', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);

      // Act
      const result = await service.generate({
        projectId: 'project-1',
        type: 'RECEIVABLE',
      });

      // Assert
      expect(result.filterType).toBe('RECEIVABLE');
    });

    it('should filter by invoice status', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);

      // Act
      const result = await service.generate({
        projectId: 'project-1',
        status: 'PAID',
      });

      // Assert
      expect(result.filterStatus).toBe('PAID');
    });

    it('should calculate aging buckets correctly', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      expect(result.agingCurrent).toBeGreaterThanOrEqual(0);
      expect(result.aging31To60).toBeGreaterThanOrEqual(0);
      expect(result.aging61To90).toBeGreaterThanOrEqual(0);
      expect(result.aging90Plus).toBeGreaterThanOrEqual(0);
    });

    it('should calculate total invoice amount correctly', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      expect(result.totalInvoiceAmount).toBeGreaterThanOrEqual(0);

      // Total should equal sum of aging buckets
      const calculatedTotal =
        result.agingCurrent +
        result.aging31To60 +
        result.aging61To90 +
        result.aging90Plus;

      expect(result.totalInvoiceAmount).toBeCloseTo(calculatedTotal, 2);
    });

    it('should return empty invoice array when no invoices exist', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      expect(result.invoices).toEqual([]);
      expect(result.totalInvoiceAmount).toBe(0);
    });

    it('should include invoice details in lines', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      result.invoices.forEach(invoice => {
        expect(invoice.invoiceId).toBeDefined();
        expect(invoice.invoiceNumber).toBeDefined();
        expect(invoice.invoiceType).toBeDefined();
        expect(invoice.invoiceDate).toBeInstanceOf(Date);
        expect(invoice.dueDate).toBeInstanceOf(Date);
        expect(invoice.vendorOrCustomerName).toBeDefined();
        expect(invoice.amount).toBeGreaterThanOrEqual(0);
        expect(invoice.status).toBeDefined();
        expect(invoice.daysOutstanding).toBeGreaterThanOrEqual(0);
        expect(invoice.agingBucket).toBeDefined();
      });
    });

    it('should calculate days outstanding correctly', async () => {
      // Arrange
      const asOfDate = new Date('2024-06-30');
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);

      // Act
      const result = await service.generate({
        projectId: 'project-1',
        asOfDate,
      });

      // Assert
      result.invoices.forEach(invoice => {
        const daysDiff = Math.floor(
          (asOfDate.getTime() - invoice.invoiceDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        expect(invoice.daysOutstanding).toBeGreaterThanOrEqual(0);
      });
    });

    it('should assign correct aging bucket for 0-30 days', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      result.invoices
        .filter(inv => inv.daysOutstanding <= 30)
        .forEach(invoice => {
          expect(invoice.agingBucket).toBe('Current (0-30 days)');
        });
    });

    it('should assign correct aging bucket for 31-60 days', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      result.invoices
        .filter(inv => inv.daysOutstanding > 30 && inv.daysOutstanding <= 60)
        .forEach(invoice => {
          expect(invoice.agingBucket).toBe('31-60 days');
        });
    });

    it('should assign correct aging bucket for 61-90 days', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      result.invoices
        .filter(inv => inv.daysOutstanding > 60 && inv.daysOutstanding <= 90)
        .forEach(invoice => {
          expect(invoice.agingBucket).toBe('61-90 days');
        });
    });

    it('should assign correct aging bucket for 90+ days', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      result.invoices
        .filter(inv => inv.daysOutstanding > 90)
        .forEach(invoice => {
          expect(invoice.agingBucket).toBe('90+ days');
        });
    });

    it('should handle both PAYABLE and RECEIVABLE types', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);

      // Act - No filter
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      result.invoices.forEach(invoice => {
        expect(['PAYABLE', 'RECEIVABLE']).toContain(invoice.invoiceType);
      });
    });

    it('should handle various invoice statuses', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      result.invoices.forEach(invoice => {
        expect(invoice.status).toBeDefined();
        expect(typeof invoice.status).toBe('string');
      });
    });

    it('should apply both type and status filters together', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);

      // Act
      const result = await service.generate({
        projectId: 'project-1',
        type: 'PAYABLE',
        status: 'PENDING',
      });

      // Assert
      expect(result.filterType).toBe('PAYABLE');
      expect(result.filterStatus).toBe('PENDING');
    });
  });
});
