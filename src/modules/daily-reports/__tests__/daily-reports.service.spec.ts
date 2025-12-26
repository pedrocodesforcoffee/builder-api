import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DailyReportsService } from '../services/daily-reports.service';
import { DailyReport } from '../entities/daily-report.entity';
import { DailyManpower } from '../entities/daily-manpower.entity';
import { DailyEquipment } from '../entities/daily-equipment.entity';
import { DailyWork } from '../entities/daily-work.entity';
import { DailyMaterial } from '../entities/daily-material.entity';
import { DailyInspection } from '../entities/daily-inspection.entity';
import { DailyIncident } from '../entities/daily-incident.entity';
import { DailyVisitor } from '../entities/daily-visitor.entity';
import { DailyDelay } from '../entities/daily-delay.entity';
import { DailyReportStatus, WeatherCondition, WorkImpact } from '../enums/daily-report.enum';
import { CreateDailyReportDto } from '../dto/create-daily-report.dto';
import { UpdateDailyReportDto } from '../dto/update-daily-report.dto';
import { SubmitDailyReportDto } from '../dto/submit-daily-report.dto';
import { ReviewDailyReportDto, ReviewAction } from '../dto/review-daily-report.dto';

describe('DailyReportsService', () => {
  let service: DailyReportsService;
  let reportRepository: jest.Mocked<Repository<DailyReport>>;
  let manpowerRepository: jest.Mocked<Repository<DailyManpower>>;
  let equipmentRepository: jest.Mocked<Repository<DailyEquipment>>;
  let workRepository: jest.Mocked<Repository<DailyWork>>;
  let materialRepository: jest.Mocked<Repository<DailyMaterial>>;
  let inspectionRepository: jest.Mocked<Repository<DailyInspection>>;
  let incidentRepository: jest.Mocked<Repository<DailyIncident>>;
  let visitorRepository: jest.Mocked<Repository<DailyVisitor>>;
  let delayRepository: jest.Mocked<Repository<DailyDelay>>;
  let dataSource: jest.Mocked<DataSource>;
  let queryRunner: jest.Mocked<QueryRunner>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
  };

  const mockProject = {
    id: 'project-123',
    name: 'Test Project',
  };

  const mockReport: Partial<DailyReport> = {
    id: 'report-123',
    projectId: 'project-123',
    reportDate: new Date('2025-01-15'),
    status: DailyReportStatus.DRAFT,
    weatherConditionAm: WeatherCondition.CLEAR,
    weatherConditionPm: WeatherCondition.CLEAR,
    temperatureHigh: 75,
    temperatureLow: 55,
    weatherImpact: WorkImpact.NONE,
    totalWorkers: 0,
    totalManHours: 0,
    createdById: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    project: mockProject as any,
    createdBy: mockUser as any,
    manpower: [],
    equipment: [],
    workLogs: [],
    materials: [],
    inspections: [],
    incidents: [],
    visitors: [],
    delays: [],
  };

  beforeEach(async () => {
    // Create mock query runner
    queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        save: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
        find: jest.fn(),
        count: jest.fn(),
      },
    } as any;

    // Mock data source
    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyReportsService,
        {
          provide: getRepositoryToken(DailyReport),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DailyManpower),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            find: jest.fn(),
            sum: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DailyEquipment),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DailyWork),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DailyMaterial),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DailyInspection),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DailyIncident),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DailyVisitor),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DailyDelay),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<DailyReportsService>(DailyReportsService);
    reportRepository = module.get(getRepositoryToken(DailyReport));
    manpowerRepository = module.get(getRepositoryToken(DailyManpower));
    equipmentRepository = module.get(getRepositoryToken(DailyEquipment));
    workRepository = module.get(getRepositoryToken(DailyWork));
    materialRepository = module.get(getRepositoryToken(DailyMaterial));
    inspectionRepository = module.get(getRepositoryToken(DailyInspection));
    incidentRepository = module.get(getRepositoryToken(DailyIncident));
    visitorRepository = module.get(getRepositoryToken(DailyVisitor));
    delayRepository = module.get(getRepositoryToken(DailyDelay));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateDailyReportDto = {
      projectId: 'project-123',
      reportDate: '2025-01-15',
      weatherConditionAm: WeatherCondition.CLEAR,
      weatherConditionPm: WeatherCondition.PARTLY_CLOUDY,
      temperatureHigh: 75,
      temperatureLow: 55,
      weatherImpact: WorkImpact.NONE,
      workSummary: 'Completed foundation work',
      manpower: [
        {
          tradeName: 'Concrete',
          companyName: 'ABC Concrete',
          headcount: 5,
          hoursWorked: 8,
        },
      ],
    };

    it('should create a daily report successfully', async () => {
      reportRepository.findOne.mockResolvedValue(null); // No duplicate
      reportRepository.create.mockReturnValue(mockReport as any);
      queryRunner.manager.save.mockResolvedValue(mockReport);
      reportRepository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(mockReport as any);
      manpowerRepository.create.mockReturnValue({ id: 'manpower-1' } as any);

      const result = await service.create(createDto, mockUser as any);

      expect(result).toBeDefined();
      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should throw BadRequestException if report already exists for date', async () => {
      reportRepository.findOne.mockResolvedValue(mockReport as any);

      await expect(service.create(createDto, mockUser as any)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto, mockUser as any)).rejects.toThrow(
        'A daily report already exists for 2025-01-15',
      );
    });

    it('should rollback transaction on error', async () => {
      reportRepository.findOne.mockResolvedValue(null);
      reportRepository.create.mockReturnValue(mockReport as any);
      queryRunner.manager.save.mockRejectedValue(new Error('Database error'));

      await expect(service.create(createDto, mockUser as any)).rejects.toThrow('Database error');
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a daily report by ID', async () => {
      reportRepository.findOne.mockResolvedValue(mockReport as any);

      const result = await service.findOne('report-123');

      expect(result).toEqual(mockReport);
      expect(reportRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'report-123', deletedAt: null },
        relations: expect.any(Array),
      });
    });

    it('should throw NotFoundException if report not found', async () => {
      reportRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('nonexistent')).rejects.toThrow(
        'Daily report not found',
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateDailyReportDto = {
      workSummary: 'Updated work summary',
      temperatureHigh: 80,
    };

    it('should update a draft report successfully', async () => {
      reportRepository.findOne.mockResolvedValue(mockReport as any);
      reportRepository.create.mockReturnValue(mockReport as any);
      queryRunner.manager.save.mockResolvedValue({ ...mockReport, ...updateDto });
      reportRepository.findOne
        .mockResolvedValueOnce(mockReport as any)
        .mockResolvedValueOnce({ ...mockReport, ...updateDto } as any);

      const result = await service.update('report-123', updateDto, mockUser as any);

      expect(result).toBeDefined();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if report is approved', async () => {
      const approvedReport = { ...mockReport, status: DailyReportStatus.APPROVED };
      reportRepository.findOne.mockResolvedValue(approvedReport as any);

      await expect(service.update('report-123', updateDto, mockUser as any)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.update('report-123', updateDto, mockUser as any)).rejects.toThrow(
        'Cannot edit an approved report',
      );
    });
  });

  describe('submit', () => {
    const submitDto: SubmitDailyReportDto = {
      signatureData: 'base64-signature-data',
    };

    it('should submit a draft report successfully', async () => {
      const reportWithData = {
        ...mockReport,
        manpower: [{ headcount: 5, hoursWorked: 8 }],
      };
      reportRepository.findOne.mockResolvedValue(reportWithData as any);
      reportRepository.save.mockResolvedValue({
        ...reportWithData,
        status: DailyReportStatus.SUBMITTED,
      } as any);
      reportRepository.findOne
        .mockResolvedValueOnce(reportWithData as any)
        .mockResolvedValueOnce({
          ...reportWithData,
          status: DailyReportStatus.SUBMITTED,
        } as any);

      const result = await service.submit('report-123', submitDto, mockUser as any, '127.0.0.1');

      expect(result.status).toBe(DailyReportStatus.SUBMITTED);
      expect(reportRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if report already submitted', async () => {
      const submittedReport = { ...mockReport, status: DailyReportStatus.SUBMITTED };
      reportRepository.findOne.mockResolvedValue(submittedReport as any);

      await expect(
        service.submit('report-123', submitDto, mockUser as any, '127.0.0.1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no work data provided', async () => {
      reportRepository.findOne.mockResolvedValue(mockReport as any);

      await expect(
        service.submit('report-123', submitDto, mockUser as any, '127.0.0.1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.submit('report-123', submitDto, mockUser as any, '127.0.0.1'),
      ).rejects.toThrow('Cannot submit an empty report');
    });
  });

  describe('review', () => {
    const approveDto: ReviewDailyReportDto = {
      action: ReviewAction.APPROVE,
    };

    const rejectDto: ReviewDailyReportDto = {
      action: ReviewAction.REJECT,
      rejectionReason: 'Incomplete information',
    };

    it('should approve a submitted report', async () => {
      const submittedReport = { ...mockReport, status: DailyReportStatus.SUBMITTED };
      reportRepository.findOne.mockResolvedValue(submittedReport as any);
      reportRepository.save.mockResolvedValue({
        ...submittedReport,
        status: DailyReportStatus.APPROVED,
      } as any);
      reportRepository.findOne
        .mockResolvedValueOnce(submittedReport as any)
        .mockResolvedValueOnce({
          ...submittedReport,
          status: DailyReportStatus.APPROVED,
        } as any);

      const result = await service.review('report-123', approveDto, mockUser as any);

      expect(result.status).toBe(DailyReportStatus.APPROVED);
    });

    it('should reject a submitted report with reason', async () => {
      const submittedReport = { ...mockReport, status: DailyReportStatus.SUBMITTED };
      reportRepository.findOne.mockResolvedValue(submittedReport as any);
      reportRepository.save.mockResolvedValue({
        ...submittedReport,
        status: DailyReportStatus.REJECTED,
        rejectionReason: rejectDto.rejectionReason,
      } as any);
      reportRepository.findOne
        .mockResolvedValueOnce(submittedReport as any)
        .mockResolvedValueOnce({
          ...submittedReport,
          status: DailyReportStatus.REJECTED,
        } as any);

      const result = await service.review('report-123', rejectDto, mockUser as any);

      expect(result.status).toBe(DailyReportStatus.REJECTED);
    });

    it('should throw BadRequestException if report not submitted', async () => {
      reportRepository.findOne.mockResolvedValue(mockReport as any);

      await expect(service.review('report-123', approveDto, mockUser as any)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.review('report-123', approveDto, mockUser as any)).rejects.toThrow(
        'Only submitted reports can be reviewed',
      );
    });

    it('should throw BadRequestException if rejection without reason', async () => {
      const submittedReport = { ...mockReport, status: DailyReportStatus.SUBMITTED };
      reportRepository.findOne.mockResolvedValue(submittedReport as any);

      const invalidRejectDto: ReviewDailyReportDto = {
        action: ReviewAction.REJECT,
      };

      await expect(
        service.review('report-123', invalidRejectDto, mockUser as any),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.review('report-123', invalidRejectDto, mockUser as any),
      ).rejects.toThrow('Rejection reason is required');
    });
  });

  describe('softDelete', () => {
    it('should soft delete a draft report', async () => {
      reportRepository.findOne.mockResolvedValue(mockReport as any);
      reportRepository.save.mockResolvedValue({
        ...mockReport,
        deletedAt: new Date(),
      } as any);

      await service.softDelete('report-123', mockUser as any);

      expect(reportRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if report is approved', async () => {
      const approvedReport = { ...mockReport, status: DailyReportStatus.APPROVED };
      reportRepository.findOne.mockResolvedValue(approvedReport as any);

      await expect(service.softDelete('report-123', mockUser as any)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.softDelete('report-123', mockUser as any)).rejects.toThrow(
        'Cannot delete an approved report',
      );
    });
  });

  describe('copyFromPrevious', () => {
    it('should copy manpower and equipment from previous report', async () => {
      const previousReport = {
        ...mockReport,
        manpower: [
          {
            tradeName: 'Concrete',
            companyName: 'ABC Concrete',
            headcount: 5,
            hoursWorked: 8,
            costCode: 'CC-001',
          },
        ],
        equipment: [
          {
            equipmentName: 'Excavator',
            quantity: 1,
            hoursUsed: 8,
          },
        ],
      };

      reportRepository.findOne
        .mockResolvedValueOnce(previousReport as any) // Previous report
        .mockResolvedValueOnce(null) // No duplicate check
        .mockResolvedValueOnce({ ...mockReport, id: 'new-report' } as any); // New report

      reportRepository.create.mockReturnValue({ id: 'new-report' } as any);
      queryRunner.manager.save.mockResolvedValue({ id: 'new-report' });

      const result = await service.copyFromPrevious('project-123', '2025-01-16', mockUser as any);

      expect(result).toBeDefined();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException if no previous report found', async () => {
      reportRepository.findOne.mockResolvedValue(null);

      await expect(
        service.copyFromPrevious('project-123', '2025-01-16', mockUser as any),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.copyFromPrevious('project-123', '2025-01-16', mockUser as any),
      ).rejects.toThrow('No previous report found to copy from');
    });
  });
});
