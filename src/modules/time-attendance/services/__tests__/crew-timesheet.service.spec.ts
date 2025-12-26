import { Test, TestingModule } from '@nestjs/testing';
import { CrewTimesheetService } from '../crew-timesheet.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CrewTimesheet } from '../../entities/crew-timesheet.entity';
import { TimeEntry } from '../../entities/time-entry.entity';
import { WorkerProfile } from '../../entities/worker-profile.entity';
import { Repository } from 'typeorm';
import {
  CrewTimesheetStatus,
  TimeEntryStatus,
} from '../../enums/time-attendance.enum';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CrewTimesheetService', () => {
  let service: CrewTimesheetService;
  let crewTimesheetRepository: Repository<CrewTimesheet>;
  let timeEntryRepository: Repository<TimeEntry>;
  let workerProfileRepository: Repository<WorkerProfile>;

  const mockCrewTimesheetRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    })),
    delete: jest.fn(),
  };

  const mockTimeEntryRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  };

  const mockWorkerProfileRepository = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrewTimesheetService,
        {
          provide: getRepositoryToken(CrewTimesheet),
          useValue: mockCrewTimesheetRepository,
        },
        {
          provide: getRepositoryToken(TimeEntry),
          useValue: mockTimeEntryRepository,
        },
        {
          provide: getRepositoryToken(WorkerProfile),
          useValue: mockWorkerProfileRepository,
        },
      ],
    }).compile();

    service = module.get<CrewTimesheetService>(CrewTimesheetService);
    crewTimesheetRepository = module.get(getRepositoryToken(CrewTimesheet));
    timeEntryRepository = module.get(getRepositoryToken(TimeEntry));
    workerProfileRepository = module.get(getRepositoryToken(WorkerProfile));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new crew timesheet with valid data', async () => {
      const dto = {
        projectId: 'project-123',
        timesheetDate: '2024-12-22',
        workerIds: ['worker-1', 'worker-2', 'worker-3'],
        defaultClockInTime: '08:00:00',
        defaultClockOutTime: '17:00:00',
        defaultBreakMinutes: 30,
        defaultLunchMinutes: 30,
      };

      // Mock worker profiles exist
      mockWorkerProfileRepository.find.mockResolvedValue([
        { id: 'worker-1' },
        { id: 'worker-2' },
        { id: 'worker-3' },
      ]);

      // No existing crew timesheet
      mockCrewTimesheetRepository.findOne.mockResolvedValue(null);

      const mockCrewTimesheet = {
        id: 'crew-123',
        ...dto,
        status: CrewTimesheetStatus.DRAFT,
        generatedEntriesCount: 0,
      };

      mockCrewTimesheetRepository.create.mockReturnValue(mockCrewTimesheet);
      mockCrewTimesheetRepository.save.mockResolvedValue(mockCrewTimesheet);

      // Mock time entry generation
      mockTimeEntryRepository.findOne.mockResolvedValue(null);
      mockTimeEntryRepository.create.mockReturnValue({ id: 'entry-1' });
      mockTimeEntryRepository.save.mockResolvedValue({ id: 'entry-1' });

      const result = await service.create(dto, 'user-123');

      expect(result).toBeDefined();
      expect(result.status).toBe(CrewTimesheetStatus.DRAFT);
      expect(mockCrewTimesheetRepository.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if clock out time is before clock in time', async () => {
      const dto = {
        projectId: 'project-123',
        timesheetDate: '2024-12-22',
        workerIds: ['worker-1'],
        defaultClockInTime: '17:00:00',
        defaultClockOutTime: '08:00:00', // Before clock in
        defaultBreakMinutes: 0,
        defaultLunchMinutes: 30,
      };

      mockWorkerProfileRepository.find.mockResolvedValue([{ id: 'worker-1' }]);

      await expect(service.create(dto, 'user-123')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if duplicate crew timesheet exists', async () => {
      const dto = {
        projectId: 'project-123',
        timesheetDate: '2024-12-22',
        workerIds: ['worker-1'],
        defaultClockInTime: '08:00:00',
        defaultClockOutTime: '17:00:00',
        defaultBreakMinutes: 0,
        defaultLunchMinutes: 30,
      };

      mockWorkerProfileRepository.find.mockResolvedValue([{ id: 'worker-1' }]);

      // Existing crew timesheet for same date and foreman
      mockCrewTimesheetRepository.findOne.mockResolvedValue({
        id: 'existing-crew-123',
        projectId: 'project-123',
        foremanId: 'user-123',
        timesheetDate: new Date('2024-12-22'),
      });

      await expect(service.create(dto, 'user-123')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('generateTimeEntries', () => {
    it('should generate time entries for all workers', async () => {
      const crewTimesheet = {
        id: 'crew-123',
        projectId: 'project-123',
        timesheetDate: new Date('2024-12-22'),
        workerIds: ['worker-1', 'worker-2'],
        defaultClockInTime: '08:00:00',
        defaultClockOutTime: '17:00:00',
        defaultBreakMinutes: 30,
        defaultLunchMinutes: 30,
        createdById: 'user-123',
      };

      mockCrewTimesheetRepository.findOne.mockResolvedValue(crewTimesheet);
      mockTimeEntryRepository.findOne.mockResolvedValue(null);

      const mockTimeEntry = { id: 'entry-1' };
      mockTimeEntryRepository.create.mockReturnValue(mockTimeEntry);
      mockTimeEntryRepository.save.mockResolvedValue(mockTimeEntry);

      const result = await service.generateTimeEntries('crew-123');

      expect(result).toHaveLength(2);
      expect(mockTimeEntryRepository.create).toHaveBeenCalledTimes(2);
      expect(mockTimeEntryRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should update existing time entries in DRAFT status', async () => {
      const crewTimesheet = {
        id: 'crew-123',
        projectId: 'project-123',
        timesheetDate: new Date('2024-12-22'),
        workerIds: ['worker-1'],
        defaultClockInTime: '09:00:00',
        defaultClockOutTime: '18:00:00',
        defaultBreakMinutes: 15,
        defaultLunchMinutes: 30,
        createdById: 'user-123',
      };

      const existingEntry = {
        id: 'entry-1',
        workerId: 'worker-1',
        status: TimeEntryStatus.DRAFT,
        clockInTime: new Date('2024-12-22T08:00:00'),
        clockOutTime: new Date('2024-12-22T17:00:00'),
      };

      mockCrewTimesheetRepository.findOne.mockResolvedValue(crewTimesheet);
      mockTimeEntryRepository.findOne.mockResolvedValue(existingEntry);
      mockTimeEntryRepository.save.mockResolvedValue(existingEntry);

      const result = await service.generateTimeEntries('crew-123');

      expect(result).toHaveLength(1);
      expect(mockTimeEntryRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if crew timesheet not found', async () => {
      mockCrewTimesheetRepository.findOne.mockResolvedValue(null);

      await expect(service.generateTimeEntries('nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('submitForApproval', () => {
    it('should submit crew timesheet and related time entries', async () => {
      const crewTimesheet = {
        id: 'crew-123',
        status: CrewTimesheetStatus.DRAFT,
        canSubmit: () => true,
      };

      mockCrewTimesheetRepository.findOne.mockResolvedValue(crewTimesheet);
      mockCrewTimesheetRepository.save.mockResolvedValue({
        ...crewTimesheet,
        status: CrewTimesheetStatus.SUBMITTED,
        submittedAt: new Date(),
        submittedById: 'user-123',
      });

      mockTimeEntryRepository.find.mockResolvedValue([
        { id: 'entry-1', status: TimeEntryStatus.DRAFT },
        { id: 'entry-2', status: TimeEntryStatus.DRAFT },
      ]);

      mockTimeEntryRepository.update.mockResolvedValue({ affected: 2 });

      const result = await service.submitForApproval('crew-123', {}, 'user-123');

      expect(result.status).toBe(CrewTimesheetStatus.SUBMITTED);
      expect(mockTimeEntryRepository.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException if not in DRAFT status', async () => {
      const crewTimesheet = {
        id: 'crew-123',
        status: CrewTimesheetStatus.SUBMITTED,
        canSubmit: () => false,
      };

      mockCrewTimesheetRepository.findOne.mockResolvedValue(crewTimesheet);

      await expect(
        service.submitForApproval('crew-123', {}, 'user-123')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approve', () => {
    it('should approve crew timesheet and all related time entries', async () => {
      const crewTimesheet = {
        id: 'crew-123',
        status: CrewTimesheetStatus.SUBMITTED,
        canApprove: () => true,
      };

      mockCrewTimesheetRepository.findOne.mockResolvedValue(crewTimesheet);
      mockCrewTimesheetRepository.save.mockResolvedValue({
        ...crewTimesheet,
        status: CrewTimesheetStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: 'user-123',
      });

      mockTimeEntryRepository.find.mockResolvedValue([
        { id: 'entry-1', status: TimeEntryStatus.SUBMITTED },
        { id: 'entry-2', status: TimeEntryStatus.SUBMITTED },
      ]);

      mockTimeEntryRepository.update.mockResolvedValue({ affected: 2 });

      const result = await service.approve('crew-123', { comments: 'Approved!' }, 'user-123');

      expect(result.status).toBe(CrewTimesheetStatus.APPROVED);
      expect(mockTimeEntryRepository.update).toHaveBeenCalled();
    });
  });
});
