import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { TimeEntry } from '../entities/time-entry.entity';
import { ClockEvent } from '../entities/clock-event.entity';
import { TimeEntryCostAllocation } from '../entities/time-entry-cost-allocation.entity';
import { WorkerProfile } from '../entities/worker-profile.entity';
import { GeofenceService } from './geofence.service';
import { OvertimeCalculatorService } from './overtime-calculator.service';
import { WorkerProfileService } from './worker-profile.service';
import {
  ClockInDto,
  ClockOutDto,
  BreakStartDto,
  BreakEndDto,
  LunchStartDto,
  LunchEndDto,
  ManualClockEventDto,
  ClockEventResponseDto
} from '../dto/clock-event.dto';
import {
  CreateTimeEntryDto,
  UpdateTimeEntryDto,
  QueryTimeEntriesDto,
  SubmitTimeEntryDto,
  ApproveTimeEntryDto,
  RejectTimeEntryDto,
  LockTimeEntryDto,
  AllocateToCostCodesDto,
  TimeEntryResponseDto,
} from '../dto/time-entry.dto';
import { TimeEntryStatus, EventType, ClockMethod } from '../enums/time-attendance.enum';

/**
 * TimeAttendanceService
 *
 * Main service for time tracking and attendance management.
 * Handles clock in/out, break tracking, overtime calculation, approvals, and payroll export.
 */
@Injectable()
export class TimeAttendanceService {
  constructor(
    @InjectRepository(TimeEntry)
    private readonly timeEntryRepository: Repository<TimeEntry>,
    @InjectRepository(ClockEvent)
    private readonly clockEventRepository: Repository<ClockEvent>,
    @InjectRepository(TimeEntryCostAllocation)
    private readonly costAllocationRepository: Repository<TimeEntryCostAllocation>,
    @InjectRepository(WorkerProfile)
    private readonly workerProfileRepository: Repository<WorkerProfile>,
    private readonly geofenceService: GeofenceService,
    private readonly overtimeCalculatorService: OvertimeCalculatorService,
    private readonly workerProfileService: WorkerProfileService,
  ) {}

  /**
   * Clock in a worker
   */
  async clockIn(dto: ClockInDto, userId: string): Promise<{ timeEntry: TimeEntry; clockEvent: ClockEvent; warning?: string }> {
    // Get worker profile
    const workerProfile = await this.workerProfileService.findOne(dto.workerId);

    if (!workerProfile.isCurrentlyEmployed()) {
      throw new BadRequestException('Worker is not currently employed');
    }

    // Check for existing time entry for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let timeEntry = await this.timeEntryRepository.findOne({
      where: {
        workerId: dto.workerId,
        projectId: dto.projectId,
        entryDate: today,
      },
      relations: ['clockEvents'],
    });

    // Check if already clocked in
    if (timeEntry?.clockInTime && !timeEntry.clockOutTime) {
      throw new BadRequestException('Worker is already clocked in. Clock out first.');
    }

    // Validate GPS location against geofences
    const geoValidation = await this.geofenceService.validateLocation(
      dto.projectId,
      { latitude: dto.latitude, longitude: dto.longitude, accuracy: dto.accuracy }
    );

    // Create or update time entry
    if (!timeEntry) {
      timeEntry = this.timeEntryRepository.create({
        workerId: dto.workerId,
        projectId: dto.projectId,
        entryDate: today,
        clockInTime: new Date(),
        status: TimeEntryStatus.DRAFT,
        createdById: userId,
      });
      await this.timeEntryRepository.save(timeEntry);
    } else {
      // Clocking in again after previous clock out
      timeEntry.clockInTime = new Date();
      timeEntry.status = TimeEntryStatus.DRAFT;
      await this.timeEntryRepository.save(timeEntry);
    }

    // Create clock event
    const clockEvent = this.clockEventRepository.create({
      timeEntryId: timeEntry.id,
      eventType: EventType.CLOCK_IN,
      eventTime: new Date(),
      latitude: dto.latitude,
      longitude: dto.longitude,
      accuracy: dto.accuracy,
      clockMethod: dto.clockMethod,
      deviceInfo: dto.deviceInfo,
      geofenceValidated: geoValidation.isInsideGeofence,
      distanceFromGeofence: geoValidation.distanceFromGeofence,
      geofenceName: geoValidation.geofenceName,
      notes: dto.notes,
      ipAddress: dto.ipAddress,
      createdById: userId,
    });

    await this.clockEventRepository.save(clockEvent);

    return {
      timeEntry,
      clockEvent,
      warning: geoValidation.warning,
    };
  }

  /**
   * Clock out a worker
   */
  async clockOut(dto: ClockOutDto, userId: string): Promise<{ timeEntry: TimeEntry; clockEvent: ClockEvent; warning?: string }> {
    // Get today's time entry
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const timeEntry = await this.timeEntryRepository.findOne({
      where: {
        workerId: dto.workerId,
        projectId: dto.projectId,
        entryDate: today,
      },
      relations: ['clockEvents', 'worker'],
    });

    if (!timeEntry) {
      throw new NotFoundException('No clock-in found for today. Clock in first.');
    }

    if (!timeEntry.clockInTime) {
      throw new BadRequestException('No clock-in time recorded. Clock in first.');
    }

    if (timeEntry.clockOutTime) {
      throw new BadRequestException('Already clocked out for today.');
    }

    // Validate GPS location
    const geoValidation = await this.geofenceService.validateLocation(
      dto.projectId,
      { latitude: dto.latitude, longitude: dto.longitude, accuracy: dto.accuracy }
    );

    // Update time entry
    timeEntry.clockOutTime = new Date();
    await this.timeEntryRepository.save(timeEntry);

    // Create clock event
    const clockEvent = this.clockEventRepository.create({
      timeEntryId: timeEntry.id,
      eventType: EventType.CLOCK_OUT,
      eventTime: new Date(),
      latitude: dto.latitude,
      longitude: dto.longitude,
      accuracy: dto.accuracy,
      clockMethod: dto.clockMethod,
      deviceInfo: dto.deviceInfo,
      geofenceValidated: geoValidation.isInsideGeofence,
      distanceFromGeofence: geoValidation.distanceFromGeofence,
      geofenceName: geoValidation.geofenceName,
      notes: dto.notes,
      ipAddress: dto.ipAddress,
      createdById: userId,
    });

    await this.clockEventRepository.save(clockEvent);

    // Calculate hours worked
    await this.calculateHoursWorked(timeEntry);

    // Reload with calculated hours
    const updatedEntry = await this.timeEntryRepository.findOne({
      where: { id: timeEntry.id },
      relations: ['clockEvents', 'worker'],
    });

    return {
      timeEntry: updatedEntry!,
      clockEvent,
      warning: geoValidation.warning,
    };
  }

  /**
   * Start a break
   */
  async breakStart(timeEntryId: string, dto: BreakStartDto, userId: string): Promise<ClockEvent> {
    const timeEntry = await this.findOne(timeEntryId);

    if (!timeEntry.clockInTime || timeEntry.clockOutTime) {
      throw new BadRequestException('Worker must be clocked in to start a break');
    }

    const clockEvent = this.clockEventRepository.create({
      timeEntryId,
      eventType: EventType.BREAK_START,
      eventTime: new Date(),
      latitude: dto.latitude,
      longitude: dto.longitude,
      accuracy: dto.accuracy,
      clockMethod: dto.clockMethod,
      deviceInfo: dto.deviceInfo,
      notes: dto.notes,
      ipAddress: dto.ipAddress,
      createdById: userId,
    });

    return await this.clockEventRepository.save(clockEvent);
  }

  /**
   * End a break
   */
  async breakEnd(timeEntryId: string, dto: BreakEndDto, userId: string): Promise<ClockEvent> {
    const timeEntry = await this.findOne(timeEntryId);

    // Find matching break start
    const breakStart = await this.clockEventRepository.findOne({
      where: {
        timeEntryId,
        eventType: EventType.BREAK_START,
      },
      order: { eventTime: 'DESC' },
    });

    if (!breakStart) {
      throw new BadRequestException('No break start found');
    }

    const clockEvent = this.clockEventRepository.create({
      timeEntryId,
      eventType: EventType.BREAK_END,
      eventTime: new Date(),
      latitude: dto.latitude,
      longitude: dto.longitude,
      accuracy: dto.accuracy,
      clockMethod: dto.clockMethod,
      deviceInfo: dto.deviceInfo,
      notes: dto.notes,
      ipAddress: dto.ipAddress,
      createdById: userId,
    });

    await this.clockEventRepository.save(clockEvent);

    // Update break minutes on time entry
    await this.calculateBreakMinutes(timeEntry);

    return clockEvent;
  }

  /**
   * Calculate total hours worked from clock events
   */
  private async calculateHoursWorked(timeEntry: TimeEntry): Promise<void> {
    if (!timeEntry.clockInTime || !timeEntry.clockOutTime) {
      return;
    }

    // Calculate gross hours
    const durationMs = new Date(timeEntry.clockOutTime).getTime() - new Date(timeEntry.clockInTime).getTime();
    const grossHours = durationMs / (1000 * 60 * 60);

    // Subtract unpaid lunch
    const lunchHours = timeEntry.lunchMinutes / 60;
    const netHours = grossHours - lunchHours;

    // Get worker profile to determine overtime rule
    const workerProfile = await this.workerProfileRepository.findOne({
      where: { id: timeEntry.workerId },
    });

    if (!workerProfile) {
      throw new NotFoundException('Worker profile not found');
    }

    // Calculate overtime for this single entry
    const overtimeResult = this.overtimeCalculatorService.calculateOvertimeForEntry(
      workerProfile,
      grossHours,
      timeEntry.breakMinutes,
      timeEntry.lunchMinutes
    );

    // Update time entry
    timeEntry.totalHoursWorked = Number(netHours.toFixed(2));
    timeEntry.regularHours = Number(overtimeResult.regularHours.toFixed(2));
    timeEntry.overtimeHours = Number(overtimeResult.overtimeHours.toFixed(2));
    timeEntry.doubleTimeHours = Number(overtimeResult.doubleTimeHours.toFixed(2));

    await this.timeEntryRepository.save(timeEntry);
  }

  /**
   * Calculate break minutes from clock events
   */
  private async calculateBreakMinutes(timeEntry: TimeEntry): Promise<void> {
    const events = await this.clockEventRepository.find({
      where: { timeEntryId: timeEntry.id },
      order: { eventTime: 'ASC' },
    });

    let totalBreakMinutes = 0;

    for (let i = 0; i < events.length - 1; i++) {
      const event = events[i];
      const nextEvent = events[i + 1];

      if (event.eventType === EventType.BREAK_START && nextEvent.eventType === EventType.BREAK_END) {
        const durationMs = new Date(nextEvent.eventTime).getTime() - new Date(event.eventTime).getTime();
        totalBreakMinutes += durationMs / (1000 * 60);
      }
    }

    timeEntry.breakMinutes = Math.round(totalBreakMinutes);
    await this.timeEntryRepository.save(timeEntry);
  }

  /**
   * Create a manual time entry
   */
  async create(dto: CreateTimeEntryDto, userId: string): Promise<TimeEntry> {
    // Check for duplicate
    const existing = await this.timeEntryRepository.findOne({
      where: {
        workerId: dto.workerId,
        projectId: dto.projectId,
        entryDate: new Date(dto.entryDate),
      },
    });

    if (existing) {
      throw new BadRequestException('Time entry already exists for this worker on this date');
    }

    const timeEntry = this.timeEntryRepository.create({
      ...dto,
      entryDate: new Date(dto.entryDate),
      clockInTime: new Date(dto.clockInTime),
      clockOutTime: new Date(dto.clockOutTime),
      status: TimeEntryStatus.DRAFT,
      createdById: userId,
    });

    await this.timeEntryRepository.save(timeEntry);

    // Calculate hours
    await this.calculateHoursWorked(timeEntry);

    // Handle cost allocations if provided
    if (dto.costAllocations && dto.costAllocations.length > 0) {
      await this.allocateToCostCodes(timeEntry.id, { allocations: dto.costAllocations });
    }

    return await this.findOne(timeEntry.id);
  }

  /**
   * Find all time entries with filters
   */
  async findAll(query: QueryTimeEntriesDto): Promise<any> {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const queryBuilder = this.timeEntryRepository
      .createQueryBuilder('timeEntry')
      .leftJoinAndSelect('timeEntry.worker', 'worker')
      .leftJoinAndSelect('worker.user', 'user')
      .leftJoinAndSelect('timeEntry.project', 'project')
      .leftJoinAndSelect('timeEntry.clockEvents', 'clockEvents')
      .leftJoinAndSelect('timeEntry.costAllocations', 'costAllocations');

    // Apply filters
    if (query.projectId) {
      queryBuilder.andWhere('timeEntry.projectId = :projectId', { projectId: query.projectId });
    }

    if (query.workerId) {
      queryBuilder.andWhere('timeEntry.workerId = :workerId', { workerId: query.workerId });
    }

    if (query.status) {
      queryBuilder.andWhere('timeEntry.status = :status', { status: query.status });
    }

    if (query.startDate && query.endDate) {
      queryBuilder.andWhere('timeEntry.entryDate BETWEEN :startDate AND :endDate', {
        startDate: query.startDate,
        endDate: query.endDate,
      });
    }

    if (query.isLocked !== undefined) {
      queryBuilder.andWhere('timeEntry.isLocked = :isLocked', { isLocked: query.isLocked });
    }

    if (query.payrollExported !== undefined) {
      if (query.payrollExported) {
        queryBuilder.andWhere('timeEntry.payrollExportedAt IS NOT NULL');
      } else {
        queryBuilder.andWhere('timeEntry.payrollExportedAt IS NULL');
      }
    }

    // Sorting
    const sortBy = query.sortBy || 'entryDate';
    const sortOrder = query.sortOrder || 'DESC';
    queryBuilder.orderBy(`timeEntry.${sortBy}`, sortOrder);

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const data = await queryBuilder.skip(skip).take(limit).getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find a time entry by ID
   */
  async findOne(id: string): Promise<TimeEntry> {
    const timeEntry = await this.timeEntryRepository.findOne({
      where: { id },
      relations: ['worker', 'worker.user', 'project', 'clockEvents', 'costAllocations'],
    });

    if (!timeEntry) {
      throw new NotFoundException(`Time entry with ID ${id} not found`);
    }

    return timeEntry;
  }

  /**
   * Update a time entry
   */
  async update(id: string, dto: UpdateTimeEntryDto, userId: string): Promise<TimeEntry> {
    const timeEntry = await this.findOne(id);

    if (!timeEntry.canEdit()) {
      throw new ForbiddenException('Time entry cannot be edited (locked or already exported)');
    }

    Object.assign(timeEntry, {
      ...dto,
      clockInTime: dto.clockInTime ? new Date(dto.clockInTime) : timeEntry.clockInTime,
      clockOutTime: dto.clockOutTime ? new Date(dto.clockOutTime) : timeEntry.clockOutTime,
    });

    await this.timeEntryRepository.save(timeEntry);

    // Recalculate hours if times changed
    if (dto.clockInTime || dto.clockOutTime) {
      await this.calculateHoursWorked(timeEntry);
    }

    return await this.findOne(id);
  }

  /**
   * Submit a time entry for approval
   */
  async submit(id: string, dto: SubmitTimeEntryDto, userId: string): Promise<TimeEntry> {
    const timeEntry = await this.findOne(id);

    if (!timeEntry.canSubmit()) {
      throw new BadRequestException('Time entry cannot be submitted');
    }

    timeEntry.status = TimeEntryStatus.SUBMITTED;
    if (dto.notes) {
      timeEntry.notes = dto.notes;
    }

    return await this.timeEntryRepository.save(timeEntry);
  }

  /**
   * Approve a time entry
   */
  async approve(id: string, dto: ApproveTimeEntryDto, userId: string): Promise<TimeEntry> {
    const timeEntry = await this.findOne(id);

    if (!timeEntry.canApprove()) {
      throw new BadRequestException('Time entry cannot be approved');
    }

    timeEntry.status = TimeEntryStatus.APPROVED;
    timeEntry.approvedById = userId;
    timeEntry.approvedAt = new Date();

    return await this.timeEntryRepository.save(timeEntry);
  }

  /**
   * Reject a time entry
   */
  async reject(id: string, dto: RejectTimeEntryDto, userId: string): Promise<TimeEntry> {
    const timeEntry = await this.findOne(id);

    if (!timeEntry.canReject()) {
      throw new BadRequestException('Time entry cannot be rejected');
    }

    timeEntry.status = TimeEntryStatus.REJECTED;
    timeEntry.rejectedById = userId;
    timeEntry.rejectedAt = new Date();
    timeEntry.rejectionReason = dto.rejectionReason;

    return await this.timeEntryRepository.save(timeEntry);
  }

  /**
   * Lock a time entry for payroll
   */
  async lock(id: string, userId: string): Promise<TimeEntry> {
    const timeEntry = await this.findOne(id);

    if (!timeEntry.canLock()) {
      throw new BadRequestException('Time entry cannot be locked');
    }

    timeEntry.status = TimeEntryStatus.LOCKED;
    timeEntry.isLocked = true;
    timeEntry.lockedAt = new Date();
    timeEntry.lockedById = userId;

    return await this.timeEntryRepository.save(timeEntry);
  }

  /**
   * Allocate time to cost codes
   */
  async allocateToCostCodes(id: string, dto: AllocateToCostCodesDto): Promise<TimeEntry> {
    const timeEntry = await this.findOne(id);

    if (!timeEntry.canEdit()) {
      throw new ForbiddenException('Time entry cannot be edited');
    }

    // Delete existing allocations
    await this.costAllocationRepository.delete({ timeEntryId: id });

    // Validate allocations sum
    const totalPercentage = dto.allocations
      .filter(a => a.percentageAllocated !== undefined)
      .reduce((sum, a) => sum + a.percentageAllocated!, 0);

    const totalHours = dto.allocations
      .filter(a => a.hoursAllocated !== undefined)
      .reduce((sum, a) => sum + a.hoursAllocated!, 0);

    if (totalPercentage > 0 && Math.abs(totalPercentage - 100) > 0.01) {
      throw new BadRequestException('Cost allocation percentages must sum to 100%');
    }

    if (totalHours > 0 && Math.abs(totalHours - timeEntry.totalHoursWorked) > 0.01) {
      throw new BadRequestException('Cost allocation hours must sum to total hours worked');
    }

    // Create new allocations
    const allocations = dto.allocations.map(allocation =>
      this.costAllocationRepository.create({
        timeEntryId: id,
        ...allocation,
      })
    );

    await this.costAllocationRepository.save(allocations);

    return await this.findOne(id);
  }

  /**
   * Submit time entry for approval (alias for submit method)
   */
  async submitForApproval(id: string, dto: SubmitTimeEntryDto, userId: string): Promise<TimeEntry> {
    return this.submit(id, dto, userId);
  }

  /**
   * Start lunch break
   */
  async lunchStart(timeEntryId: string, dto: LunchStartDto, userId: string): Promise<ClockEvent> {
    const timeEntry = await this.findOne(timeEntryId);

    if (!timeEntry.canEdit()) {
      throw new ForbiddenException('Time entry cannot be edited');
    }

    // Validate GPS
    const validationResult = await this.geofenceService.validateLocation(
      timeEntry.projectId,
      {
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracy: dto.accuracy,
      }
    );

    // Create clock event
    const clockEvent = this.clockEventRepository.create({
      timeEntryId,
      eventType: EventType.LUNCH_START,
      eventTime: new Date(),
      latitude: dto.latitude,
      longitude: dto.longitude,
      accuracy: dto.accuracy,
      clockMethod: dto.clockMethod,
      deviceInfo: dto.deviceInfo,
      ipAddress: dto.ipAddress,
      notes: dto.notes,
      geofenceValidated: validationResult.isValid,
      distanceFromGeofence: validationResult.distanceFromGeofence,
    });

    return await this.clockEventRepository.save(clockEvent);
  }

  /**
   * End lunch break
   */
  async lunchEnd(timeEntryId: string, dto: LunchEndDto, userId: string): Promise<ClockEvent> {
    const timeEntry = await this.findOne(timeEntryId);

    if (!timeEntry.canEdit()) {
      throw new ForbiddenException('Time entry cannot be edited');
    }

    // Validate GPS
    const validationResult = await this.geofenceService.validateLocation(
      timeEntry.projectId,
      {
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracy: dto.accuracy,
      }
    );

    // Create clock event
    const clockEvent = this.clockEventRepository.create({
      timeEntryId,
      eventType: EventType.LUNCH_END,
      eventTime: new Date(),
      latitude: dto.latitude,
      longitude: dto.longitude,
      accuracy: dto.accuracy,
      clockMethod: dto.clockMethod,
      deviceInfo: dto.deviceInfo,
      ipAddress: dto.ipAddress,
      notes: dto.notes,
      geofenceValidated: validationResult.isValid,
      distanceFromGeofence: validationResult.distanceFromGeofence,
    });

    await this.clockEventRepository.save(clockEvent);

    // Recalculate lunch minutes
    await this.calculateBreakMinutes(timeEntry);

    return clockEvent;
  }

  /**
   * Map TimeEntry entity to response DTO
   */
  mapToResponseDto(timeEntry: TimeEntry): TimeEntryResponseDto {
    return {
      id: timeEntry.id,
      workerId: timeEntry.workerId,
      projectId: timeEntry.projectId,
      entryDate: timeEntry.entryDate,
      clockInTime: timeEntry.clockInTime,
      clockOutTime: timeEntry.clockOutTime,
      totalHoursWorked: timeEntry.totalHoursWorked,
      regularHours: timeEntry.regularHours,
      overtimeHours: timeEntry.overtimeHours,
      doubleTimeHours: timeEntry.doubleTimeHours,
      breakMinutes: timeEntry.breakMinutes,
      lunchMinutes: timeEntry.lunchMinutes,
      status: timeEntry.status,
      submittedAt: timeEntry.submittedAt,
      submittedById: timeEntry.submittedById,
      approvedById: timeEntry.approvedById,
      approvedAt: timeEntry.approvedAt,
      rejectedById: timeEntry.rejectedById,
      rejectedAt: timeEntry.rejectedAt,
      rejectionReason: timeEntry.rejectionReason,
      notes: timeEntry.notes,
      isLocked: timeEntry.isLocked,
      lockedAt: timeEntry.lockedAt,
      lockedById: timeEntry.lockedById,
      payrollExportedAt: timeEntry.payrollExportedAt,
      crewTimesheetId: timeEntry.crewTimesheetId,
      createdAt: timeEntry.createdAt,
      updatedAt: timeEntry.updatedAt,
      worker: timeEntry.worker ? {
        id: timeEntry.worker.id,
        userId: timeEntry.worker.userId,
        trade: timeEntry.worker.trade,
        hourlyRate: timeEntry.worker.hourlyRate,
        user: {
          firstName: timeEntry.worker.user?.firstName || '',
          lastName: timeEntry.worker.user?.lastName || '',
          fullName: `${timeEntry.worker.user?.firstName || ''} ${timeEntry.worker.user?.lastName || ''}`.trim(),
        },
      } : undefined,
      project: timeEntry.project ? {
        id: timeEntry.project.id,
        name: timeEntry.project.name,
        projectNumber: timeEntry.project.number || '',
      } : undefined,
      clockEvents: timeEntry.clockEvents,
      costAllocations: timeEntry.costAllocations,
      canEdit: timeEntry.canEdit(),
      canSubmit: timeEntry.canSubmit(),
      canApprove: timeEntry.canApprove(),
      canLock: timeEntry.canLock(),
    };
  }

  /**
   * Generate daily attendance report
   */
  async generateDailyReport(query: any): Promise<any> {
    const { projectId, date } = query;

    // Query time entries for the specific date
    const timeEntries = await this.timeEntryRepository
      .createQueryBuilder('timeEntry')
      .leftJoinAndSelect('timeEntry.worker', 'worker')
      .leftJoinAndSelect('worker.user', 'user')
      .where('timeEntry.projectId = :projectId', { projectId })
      .andWhere('timeEntry.entryDate = :date', { date })
      .getMany();

    // Aggregate by worker
    const workerData = timeEntries.map((entry) => ({
      workerId: entry.workerId,
      workerName: entry.worker?.user
        ? `${entry.worker.user.firstName} ${entry.worker.user.lastName}`
        : 'Unknown',
      trade: entry.worker?.trade || 'Unknown',
      clockInTime: entry.clockInTime,
      clockOutTime: entry.clockOutTime,
      totalHours: Number(entry.totalHoursWorked),
      regularHours: Number(entry.regularHours),
      overtimeHours: Number(entry.overtimeHours),
      doubleTimeHours: Number(entry.doubleTimeHours),
      status: entry.status,
    }));

    // Calculate totals
    const totalHours = workerData.reduce((sum, w) => sum + w.totalHours, 0);
    const totalRegularHours = workerData.reduce((sum, w) => sum + w.regularHours, 0);
    const totalOvertimeHours = workerData.reduce((sum, w) => sum + w.overtimeHours, 0);
    const totalDoubleTimeHours = workerData.reduce((sum, w) => sum + w.doubleTimeHours, 0);

    // Group by trade
    const tradeBreakdown = workerData.reduce((acc, worker) => {
      if (!acc[worker.trade]) {
        acc[worker.trade] = { count: 0, hours: 0 };
      }
      acc[worker.trade].count++;
      acc[worker.trade].hours += worker.totalHours;
      return acc;
    }, {} as Record<string, { count: number; hours: number }>);

    return {
      date,
      projectId,
      totalWorkers: workerData.length,
      totalHours: Math.round(totalHours * 100) / 100,
      totalRegularHours: Math.round(totalRegularHours * 100) / 100,
      totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
      totalDoubleTimeHours: Math.round(totalDoubleTimeHours * 100) / 100,
      workers: workerData,
      tradeBreakdown,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate weekly attendance report
   */
  async generateWeeklyReport(query: any): Promise<any> {
    const { projectId, weekStart, weekEnd } = query;

    // Query time entries for the week
    const timeEntries = await this.timeEntryRepository
      .createQueryBuilder('timeEntry')
      .leftJoinAndSelect('timeEntry.worker', 'worker')
      .leftJoinAndSelect('worker.user', 'user')
      .where('timeEntry.projectId = :projectId', { projectId })
      .andWhere('timeEntry.entryDate >= :weekStart', { weekStart })
      .andWhere('timeEntry.entryDate <= :weekEnd', { weekEnd })
      .orderBy('timeEntry.entryDate', 'ASC')
      .getMany();

    // Group by date
    const dailyData = timeEntries.reduce((acc, entry) => {
      const dateKey = entry.entryDate.toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          workers: [],
          totalHours: 0,
          totalWorkers: 0,
        };
      }

      acc[dateKey].workers.push({
        workerId: entry.workerId,
        workerName: entry.worker?.user
          ? `${entry.worker.user.firstName} ${entry.worker.user.lastName}`
          : 'Unknown',
        trade: entry.worker?.trade || 'Unknown',
        totalHours: Number(entry.totalHoursWorked),
        status: entry.status,
      });

      acc[dateKey].totalHours += Number(entry.totalHoursWorked);
      acc[dateKey].totalWorkers = acc[dateKey].workers.length;

      return acc;
    }, {} as Record<string, any>);

    // Convert to array and calculate weekly totals
    const dailyBreakdown = Object.values(dailyData);
    const totalHours = dailyBreakdown.reduce((sum, day: any) => sum + day.totalHours, 0);
    const uniqueWorkers = new Set(timeEntries.map((e) => e.workerId));

    // Calculate average daily hours
    const avgDailyHours = dailyBreakdown.length > 0 ? totalHours / dailyBreakdown.length : 0;

    // Group by worker for the week
    const workerSummary = timeEntries.reduce((acc, entry) => {
      if (!acc[entry.workerId]) {
        acc[entry.workerId] = {
          workerId: entry.workerId,
          workerName: entry.worker?.user
            ? `${entry.worker.user.firstName} ${entry.worker.user.lastName}`
            : 'Unknown',
          trade: entry.worker?.trade || 'Unknown',
          totalHours: 0,
          regularHours: 0,
          overtimeHours: 0,
          doubleTimeHours: 0,
          daysWorked: 0,
        };
      }

      acc[entry.workerId].totalHours += Number(entry.totalHoursWorked);
      acc[entry.workerId].regularHours += Number(entry.regularHours);
      acc[entry.workerId].overtimeHours += Number(entry.overtimeHours);
      acc[entry.workerId].doubleTimeHours += Number(entry.doubleTimeHours);
      acc[entry.workerId].daysWorked++;

      return acc;
    }, {} as Record<string, any>);

    return {
      weekStart,
      weekEnd,
      projectId,
      totalWorkers: uniqueWorkers.size,
      totalHours: Math.round(totalHours * 100) / 100,
      avgDailyHours: Math.round(avgDailyHours * 100) / 100,
      dailyBreakdown,
      workerSummary: Object.values(workerSummary),
      generatedAt: new Date(),
    };
  }

  /**
   * Export payroll data
   */
  async exportPayroll(dto: any, userId: string): Promise<any> {
    const { projectId, startDate, endDate, format = 'CSV' } = dto;

    // Query approved and locked time entries for payroll
    const timeEntries = await this.timeEntryRepository
      .createQueryBuilder('timeEntry')
      .leftJoinAndSelect('timeEntry.worker', 'worker')
      .leftJoinAndSelect('worker.user', 'user')
      .leftJoinAndSelect('timeEntry.project', 'project')
      .leftJoinAndSelect('timeEntry.costAllocations', 'costAllocations')
      .leftJoinAndSelect('costAllocations.costCode', 'costCode')
      .where('timeEntry.projectId = :projectId', { projectId })
      .andWhere('timeEntry.entryDate >= :startDate', { startDate })
      .andWhere('timeEntry.entryDate <= :endDate', { endDate })
      .andWhere('timeEntry.status IN (:...statuses)', {
        statuses: [TimeEntryStatus.APPROVED, TimeEntryStatus.LOCKED],
      })
      .orderBy('timeEntry.entryDate', 'ASC')
      .addOrderBy('worker.user.lastName', 'ASC')
      .getMany();

    // Format payroll entries
    const payrollEntries = timeEntries.map((entry) => ({
      employeeId: entry.worker?.userId || '',
      employeeName: entry.worker?.user
        ? `${entry.worker.user.lastName}, ${entry.worker.user.firstName}`
        : 'Unknown',
      date: entry.entryDate.toISOString().split('T')[0],
      regularHours: Number(entry.regularHours),
      overtimeHours: Number(entry.overtimeHours),
      doubleTimeHours: Number(entry.doubleTimeHours),
      totalHours: Number(entry.totalHoursWorked),
      hourlyRate: entry.worker?.hourlyRate || 0,
      regularPay: Number(entry.regularHours) * (entry.worker?.hourlyRate || 0),
      overtimePay: Number(entry.overtimeHours) * (entry.worker?.hourlyRate || 0) * 1.5,
      doubleTimePay: Number(entry.doubleTimeHours) * (entry.worker?.hourlyRate || 0) * 2.0,
      totalPay:
        Number(entry.regularHours) * (entry.worker?.hourlyRate || 0) +
        Number(entry.overtimeHours) * (entry.worker?.hourlyRate || 0) * 1.5 +
        Number(entry.doubleTimeHours) * (entry.worker?.hourlyRate || 0) * 2.0,
      project: entry.project?.name || '',
      projectNumber: entry.project?.number || '',
      trade: entry.worker?.trade || '',
      costCodes: entry.costAllocations?.map((a: any) => ({
        code: a.costCode?.code || '',
        description: a.costCode?.description || '',
        hours: a.hoursAllocated,
        percentage: a.percentageAllocated,
      })) || [],
    }));

    // Calculate totals
    const summary = {
      totalEntries: payrollEntries.length,
      totalRegularHours: payrollEntries.reduce((sum, e) => sum + e.regularHours, 0),
      totalOvertimeHours: payrollEntries.reduce((sum, e) => sum + e.overtimeHours, 0),
      totalDoubleTimeHours: payrollEntries.reduce((sum, e) => sum + e.doubleTimeHours, 0),
      totalHours: payrollEntries.reduce((sum, e) => sum + e.totalHours, 0),
      totalPayAmount: payrollEntries.reduce((sum, e) => sum + e.totalPay, 0),
    };

    // Format based on requested format
    let exportData: string | any[];

    switch (format.toUpperCase()) {
      case 'CSV':
        // Generate CSV format
        const csvHeaders = [
          'Employee ID',
          'Employee Name',
          'Date',
          'Regular Hours',
          'OT Hours',
          'DT Hours',
          'Total Hours',
          'Hourly Rate',
          'Regular Pay',
          'OT Pay',
          'DT Pay',
          'Total Pay',
          'Project',
          'Project Number',
          'Trade',
        ];

        const csvRows = payrollEntries.map((entry) => [
          entry.employeeId,
          entry.employeeName,
          entry.date,
          entry.regularHours.toFixed(2),
          entry.overtimeHours.toFixed(2),
          entry.doubleTimeHours.toFixed(2),
          entry.totalHours.toFixed(2),
          entry.hourlyRate.toFixed(2),
          entry.regularPay.toFixed(2),
          entry.overtimePay.toFixed(2),
          entry.doubleTimePay.toFixed(2),
          entry.totalPay.toFixed(2),
          entry.project,
          entry.projectNumber,
          entry.trade,
        ]);

        exportData = [csvHeaders.join(','), ...csvRows.map((row) => row.join(','))].join('\n');
        break;

      case 'JSON':
      default:
        exportData = payrollEntries;
        break;
    }

    // Mark entries as exported
    await this.timeEntryRepository
      .createQueryBuilder()
      .update(TimeEntry)
      .set({ payrollExportedAt: new Date() })
      .where('id IN (:...ids)', { ids: timeEntries.map((e) => e.id) })
      .execute();

    return {
      format,
      projectId,
      startDate,
      endDate,
      entries: exportData,
      summary,
      exportedAt: new Date(),
      exportedBy: userId,
    };
  }

  /**
   * Get time entry statistics
   */
  async getStats(projectId: string, startDate?: string, endDate?: string): Promise<any> {
    const query = this.timeEntryRepository
      .createQueryBuilder('timeEntry')
      .where('timeEntry.projectId = :projectId', { projectId });

    if (startDate) {
      query.andWhere('timeEntry.entryDate >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('timeEntry.entryDate <= :endDate', { endDate });
    }

    const [entries, total] = await query.getManyAndCount();

    const stats = entries.reduce((acc, entry) => {
      acc.totalHours += Number(entry.totalHoursWorked);
      acc.regularHours += Number(entry.regularHours);
      acc.overtimeHours += Number(entry.overtimeHours);
      acc.doubleTimeHours += Number(entry.doubleTimeHours);

      if (!acc.statusBreakdown[entry.status]) {
        acc.statusBreakdown[entry.status] = 0;
      }
      acc.statusBreakdown[entry.status]++;

      return acc;
    }, {
      totalEntries: total,
      totalHours: 0,
      regularHours: 0,
      overtimeHours: 0,
      doubleTimeHours: 0,
      statusBreakdown: {} as Record<string, number>,
    });

    return stats;
  }
}
