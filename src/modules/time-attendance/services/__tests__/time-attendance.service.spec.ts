import { Test, TestingModule } from '@nestjs/testing';
import { TimeAttendanceService } from '../time-attendance.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TimeEntry } from '../../entities/time-entry.entity';
import { ClockEvent } from '../../entities/clock-event.entity';
import { TimeEntryCostAllocation } from '../../entities/time-entry-cost-allocation.entity';
import { WorkerProfile } from '../../entities/worker-profile.entity';
import { GeofenceService } from '../geofence.service';
import { OvertimeCalculatorService } from '../overtime-calculator.service';
import { WorkerProfileService } from '../worker-profile.service';
import { Repository } from 'typeorm';
import {
  TimeEntryStatus,
  EventType,
  ClockMethod,
} from '../../enums/time-attendance.enum';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('TimeAttendanceService', () => {
  let service: TimeAttendanceService;
  let timeEntryRepository: Repository<TimeEntry>;
  let clockEventRepository: Repository<ClockEvent>;
  let geofenceService: GeofenceService;

  const mockTimeEntryRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockClockEventRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockGeofenceService = {
    validateLocation: jest.fn(),
  };

  const mockOvertimeCalculatorService = {
    calculateHours: jest.fn(),
  };

  const mockWorkerProfileService = {
    findOne: jest.fn(),
  };

  const mockCostAllocationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockWorkerProfileRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeAttendanceService,
        {
          provide: getRepositoryToken(TimeEntry),
          useValue: mockTimeEntryRepository,
        },
        {
          provide: getRepositoryToken(ClockEvent),
          useValue: mockClockEventRepository,
        },
        {
          provide: getRepositoryToken(TimeEntryCostAllocation),
          useValue: mockCostAllocationRepository,
        },
        {
          provide: getRepositoryToken(WorkerProfile),
          useValue: mockWorkerProfileRepository,
        },
        {
          provide: GeofenceService,
          useValue: mockGeofenceService,
        },
        {
          provide: OvertimeCalculatorService,
          useValue: mockOvertimeCalculatorService,
        },
        {
          provide: WorkerProfileService,
          useValue: mockWorkerProfileService,
        },
      ],
    }).compile();

    service = module.get<TimeAttendanceService>(TimeAttendanceService);
    timeEntryRepository = module.get(getRepositoryToken(TimeEntry));
    clockEventRepository = module.get(getRepositoryToken(ClockEvent));
    geofenceService = module.get(GeofenceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('clockIn', () => {
    it('should create a new time entry and clock event on first clock in', async () => {
      const dto = {
        workerId: 'worker-123',
        projectId: 'project-123',
        latitude: 37.7794,
        longitude: -122.4194,
        accuracy: 10,
        clockMethod: ClockMethod.MOBILE_APP,
      };

      // No existing time entry
      mockTimeEntryRepository.findOne.mockResolvedValue(null);

      // Geofence validation passes
      mockGeofenceService.validateLocation.mockResolvedValue({
        isValid: true,
        isInsideGeofence: true,
        validatedAt: new Date(),
      });

      const mockTimeEntry = {
        id: 'entry-123',
        workerId: dto.workerId,
        projectId: dto.projectId,
        entryDate: new Date(),
        clockInTime: new Date(),
        status: TimeEntryStatus.DRAFT,
      };

      mockTimeEntryRepository.create.mockReturnValue(mockTimeEntry);
      mockTimeEntryRepository.save.mockResolvedValue(mockTimeEntry);

      const mockClockEvent = {
        id: 'event-123',
        timeEntryId: mockTimeEntry.id,
        eventType: EventType.CLOCK_IN,
        eventTime: new Date(),
      };

      mockClockEventRepository.create.mockReturnValue(mockClockEvent);
      mockClockEventRepository.save.mockResolvedValue(mockClockEvent);

      const result = await service.clockIn(dto, 'user-123');

      expect(result.timeEntry).toBeDefined();
      expect(result.clockEvent).toBeDefined();
      expect(mockTimeEntryRepository.create).toHaveBeenCalled();
      expect(mockClockEventRepository.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if already clocked in', async () => {
      const dto = {
        workerId: 'worker-123',
        projectId: 'project-123',
        latitude: 37.7794,
        longitude: -122.4194,
        accuracy: 10,
        clockMethod: ClockMethod.MOBILE_APP,
      };

      // Existing time entry with clock in time set
      mockTimeEntryRepository.findOne.mockResolvedValue({
        id: 'entry-123',
        clockInTime: new Date(),
        clockOutTime: null,
      });

      await expect(service.clockIn(dto, 'user-123')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should include warning if clocked in outside geofence', async () => {
      const dto = {
        workerId: 'worker-123',
        projectId: 'project-123',
        latitude: 37.7794,
        longitude: -122.4194,
        accuracy: 10,
        clockMethod: ClockMethod.MOBILE_APP,
      };

      mockTimeEntryRepository.findOne.mockResolvedValue(null);

      // Geofence validation fails
      mockGeofenceService.validateLocation.mockResolvedValue({
        isValid: false,
        isInsideGeofence: false,
        distanceFromGeofence: 150,
        warning: 'Clocked in 150m outside geofence boundary',
        validatedAt: new Date(),
      });

      const mockTimeEntry = { id: 'entry-123' };
      const mockClockEvent = { id: 'event-123' };

      mockTimeEntryRepository.create.mockReturnValue(mockTimeEntry);
      mockTimeEntryRepository.save.mockResolvedValue(mockTimeEntry);
      mockClockEventRepository.create.mockReturnValue(mockClockEvent);
      mockClockEventRepository.save.mockResolvedValue(mockClockEvent);

      const result = await service.clockIn(dto, 'user-123');

      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('150m outside geofence');
    });
  });

  describe('approve', () => {
    it('should approve a submitted time entry', async () => {
      const timeEntry = {
        id: 'entry-123',
        status: TimeEntryStatus.SUBMITTED,
        canApprove: () => true,
      };

      mockTimeEntryRepository.findOne.mockResolvedValue(timeEntry);
      mockTimeEntryRepository.save.mockResolvedValue({
        ...timeEntry,
        status: TimeEntryStatus.APPROVED,
        approvedById: 'user-123',
        approvedAt: new Date(),
      });

      const result = await service.approve('entry-123', {}, 'user-123');

      expect(result.status).toBe(TimeEntryStatus.APPROVED);
      expect(result.approvedById).toBe('user-123');
    });

    it('should throw BadRequestException if not in SUBMITTED status', async () => {
      const timeEntry = {
        id: 'entry-123',
        status: TimeEntryStatus.DRAFT,
        canApprove: () => false,
      };

      mockTimeEntryRepository.findOne.mockResolvedValue(timeEntry);

      await expect(service.approve('entry-123', {}, 'user-123')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('lock', () => {
    it('should lock an approved time entry', async () => {
      const timeEntry = {
        id: 'entry-123',
        status: TimeEntryStatus.APPROVED,
        isLocked: false,
        canLock: () => true,
      };

      mockTimeEntryRepository.findOne.mockResolvedValue(timeEntry);
      mockTimeEntryRepository.save.mockResolvedValue({
        ...timeEntry,
        status: TimeEntryStatus.LOCKED,
        isLocked: true,
        lockedById: 'user-123',
        lockedAt: new Date(),
      });

      const result = await service.lock('entry-123', 'user-123');

      expect(result.status).toBe(TimeEntryStatus.LOCKED);
      expect(result.isLocked).toBe(true);
    });

    it('should throw BadRequestException if not approved', async () => {
      const timeEntry = {
        id: 'entry-123',
        status: TimeEntryStatus.DRAFT,
        canLock: () => false,
      };

      mockTimeEntryRepository.findOne.mockResolvedValue(timeEntry);

      await expect(service.lock('entry-123', 'user-123')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('findOne', () => {
    it('should return a time entry by ID', async () => {
      const mockTimeEntry = {
        id: 'entry-123',
        workerId: 'worker-123',
        projectId: 'project-123',
      };

      mockTimeEntryRepository.findOne.mockResolvedValue(mockTimeEntry);

      const result = await service.findOne('entry-123');

      expect(result).toEqual(mockTimeEntry);
    });

    it('should throw NotFoundException if time entry not found', async () => {
      mockTimeEntryRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
