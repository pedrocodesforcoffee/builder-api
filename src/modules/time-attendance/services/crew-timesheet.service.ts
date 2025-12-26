import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CrewTimesheet } from '../entities/crew-timesheet.entity';
import { TimeEntry } from '../entities/time-entry.entity';
import { WorkerProfile } from '../entities/worker-profile.entity';
import { Project } from '../../projects/entities/project.entity';
import {
  CreateCrewTimesheetDto,
  UpdateCrewTimesheetDto,
  QueryCrewTimesheetsDto,
  SubmitCrewTimesheetDto,
  ApproveCrewTimesheetDto,
  CrewTimesheetResponseDto,
} from '../dto/crew-timesheet.dto';
import { CrewTimesheetStatus, TimeEntryStatus } from '../enums/time-attendance.enum';

/**
 * CrewTimesheetService
 *
 * Handles bulk time entry for entire crews:
 * - Foremen create crew timesheets with default times
 * - System generates individual TimeEntry records for each worker
 * - Workers can override their individual time entries
 * - Foremen submit crew timesheets for approval
 * - Superintendents approve crew timesheets (auto-approves all time entries)
 */
@Injectable()
export class CrewTimesheetService {
  constructor(
    @InjectRepository(CrewTimesheet)
    private readonly crewTimesheetRepository: Repository<CrewTimesheet>,
    @InjectRepository(TimeEntry)
    private readonly timeEntryRepository: Repository<TimeEntry>,
    @InjectRepository(WorkerProfile)
    private readonly workerProfileRepository: Repository<WorkerProfile>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  /**
   * Create a new crew timesheet with default times for all workers
   */
  async create(dto: CreateCrewTimesheetDto, userId: string): Promise<CrewTimesheet> {
    // Validate project exists
    const project = await this.projectRepository.findOne({ where: { id: dto.projectId } });
    if (!project) {
      throw new NotFoundException(`Project with ID ${dto.projectId} not found`);
    }

    // Validate all workers exist and belong to the project
    const workers = await this.workerProfileRepository.find({
      where: {
        id: In(dto.workerIds),
        projectId: dto.projectId,
        isActive: true,
      },
    });

    if (workers.length !== dto.workerIds.length) {
      throw new BadRequestException('One or more worker IDs are invalid or not assigned to this project');
    }

    // Validate times (parse to compare)
    const clockIn = dto.defaultClockInTime.split(':').map(Number);
    const clockOut = dto.defaultClockOutTime.split(':').map(Number);

    const clockInMinutes = clockIn[0] * 60 + clockIn[1];
    const clockOutMinutes = clockOut[0] * 60 + clockOut[1];

    if (clockOutMinutes <= clockInMinutes) {
      throw new BadRequestException('Clock out time must be after clock in time');
    }

    // Check for duplicate crew timesheet
    const existingTimesheet = await this.crewTimesheetRepository.findOne({
      where: {
        projectId: dto.projectId,
        timesheetDate: new Date(dto.timesheetDate),
        foremanId: userId,
      },
    });

    if (existingTimesheet) {
      throw new BadRequestException('A crew timesheet already exists for this date and foreman');
    }

    // Create crew timesheet
    const crewTimesheet = this.crewTimesheetRepository.create({
      projectId: dto.projectId,
      foremanId: userId,
      timesheetDate: new Date(dto.timesheetDate),
      workerIds: dto.workerIds,
      defaultClockInTime: dto.defaultClockInTime,
      defaultClockOutTime: dto.defaultClockOutTime,
      defaultBreakMinutes: dto.defaultBreakMinutes ?? 0,
      defaultLunchMinutes: dto.defaultLunchMinutes ?? 30,
      status: CrewTimesheetStatus.DRAFT,
      notes: dto.notes,
      createdById: userId,
    });

    const savedTimesheet = await this.crewTimesheetRepository.save(crewTimesheet);

    // Generate individual time entries for each worker
    await this.generateTimeEntries(savedTimesheet.id);

    return savedTimesheet;
  }

  /**
   * Generate individual TimeEntry records for each worker from crew defaults
   */
  async generateTimeEntries(crewTimesheetId: string): Promise<TimeEntry[]> {
    const crewTimesheet = await this.crewTimesheetRepository.findOne({
      where: { id: crewTimesheetId },
    });

    if (!crewTimesheet) {
      throw new NotFoundException(`Crew timesheet with ID ${crewTimesheetId} not found`);
    }

    const entries: TimeEntry[] = [];

    for (const workerId of crewTimesheet.workerIds) {
      // Check if time entry already exists for this worker and date
      const existingEntry = await this.timeEntryRepository.findOne({
        where: {
          workerId,
          projectId: crewTimesheet.projectId,
          entryDate: crewTimesheet.timesheetDate,
        },
      });

      if (existingEntry) {
        // Update existing entry with crew defaults (if still in DRAFT)
        if (existingEntry.status === TimeEntryStatus.DRAFT) {
          existingEntry.clockInTime = this.combineDateTime(crewTimesheet.timesheetDate, crewTimesheet.defaultClockInTime);
          existingEntry.clockOutTime = this.combineDateTime(crewTimesheet.timesheetDate, crewTimesheet.defaultClockOutTime);
          existingEntry.breakMinutes = crewTimesheet.defaultBreakMinutes;
          existingEntry.lunchMinutes = crewTimesheet.defaultLunchMinutes;
          existingEntry.crewTimesheetId = crewTimesheetId;

          // Calculate hours
          this.calculateHours(existingEntry);

          await this.timeEntryRepository.save(existingEntry);
          entries.push(existingEntry);
        }
      } else {
        // Create new time entry
        const timeEntry = this.timeEntryRepository.create({
          workerId,
          projectId: crewTimesheet.projectId,
          entryDate: crewTimesheet.timesheetDate,
          clockInTime: this.combineDateTime(crewTimesheet.timesheetDate, crewTimesheet.defaultClockInTime),
          clockOutTime: this.combineDateTime(crewTimesheet.timesheetDate, crewTimesheet.defaultClockOutTime),
          breakMinutes: crewTimesheet.defaultBreakMinutes,
          lunchMinutes: crewTimesheet.defaultLunchMinutes,
          status: TimeEntryStatus.DRAFT,
          crewTimesheetId: crewTimesheetId,
          createdById: crewTimesheet.createdById,
        });

        // Calculate hours
        this.calculateHours(timeEntry);

        await this.timeEntryRepository.save(timeEntry);
        entries.push(timeEntry);
      }
    }

    return entries;
  }

  /**
   * Combine a date with a time string to create a full timestamp
   */
  private combineDateTime(date: Date, timeString: string | null): Date | null {
    if (!timeString) return null;

    const dateStr = new Date(date).toISOString().split('T')[0];
    const combinedStr = `${dateStr}T${timeString}`;
    return new Date(combinedStr);
  }

  /**
   * Calculate hours worked from clock times
   */
  private calculateHours(timeEntry: TimeEntry): void {
    if (!timeEntry.clockInTime || !timeEntry.clockOutTime) {
      return;
    }

    const durationMs = new Date(timeEntry.clockOutTime).getTime() - new Date(timeEntry.clockInTime).getTime();
    const grossHours = durationMs / (1000 * 60 * 60);

    // Subtract unpaid lunch
    const lunchHours = timeEntry.lunchMinutes / 60;
    const netHours = Math.max(0, grossHours - lunchHours);

    // For crew timesheets, we calculate total hours but leave overtime calculation for weekly recalc
    timeEntry.totalHoursWorked = Number(netHours.toFixed(2));
    timeEntry.regularHours = Number(netHours.toFixed(2));
    timeEntry.overtimeHours = 0;
    timeEntry.doubleTimeHours = 0;
  }

  /**
   * Find all crew timesheets with filters
   */
  async findAll(query: QueryCrewTimesheetsDto): Promise<{
    data: CrewTimesheet[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const queryBuilder = this.crewTimesheetRepository
      .createQueryBuilder('crewTimesheet')
      .leftJoinAndSelect('crewTimesheet.project', 'project')
      .leftJoinAndSelect('crewTimesheet.foreman', 'foreman')
      .leftJoinAndSelect('crewTimesheet.approvedBy', 'approvedBy');

    // Apply filters
    if (query.projectId) {
      queryBuilder.andWhere('crewTimesheet.projectId = :projectId', { projectId: query.projectId });
    }

    if (query.foremanId) {
      queryBuilder.andWhere('crewTimesheet.foremanId = :foremanId', { foremanId: query.foremanId });
    }

    if (query.status) {
      queryBuilder.andWhere('crewTimesheet.status = :status', { status: query.status });
    }

    if (query.startDate) {
      queryBuilder.andWhere('crewTimesheet.timesheetDate >= :startDate', { startDate: query.startDate });
    }

    if (query.endDate) {
      queryBuilder.andWhere('crewTimesheet.timesheetDate <= :endDate', { endDate: query.endDate });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination and ordering
    const data = await queryBuilder
      .orderBy('crewTimesheet.timesheetDate', 'DESC')
      .addOrderBy('crewTimesheet.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find a crew timesheet by ID
   */
  async findOne(id: string): Promise<CrewTimesheet> {
    const crewTimesheet = await this.crewTimesheetRepository.findOne({
      where: { id },
      relations: ['project', 'foreman', 'approvedBy'],
    });

    if (!crewTimesheet) {
      throw new NotFoundException(`Crew timesheet with ID ${id} not found`);
    }

    return crewTimesheet;
  }

  /**
   * Update a crew timesheet (only allowed in DRAFT status)
   */
  async update(id: string, dto: UpdateCrewTimesheetDto, userId: string): Promise<CrewTimesheet> {
    const crewTimesheet = await this.findOne(id);

    if (crewTimesheet.status !== CrewTimesheetStatus.DRAFT) {
      throw new ForbiddenException('Can only update crew timesheets in DRAFT status');
    }

    // Validate times if provided
    if (dto.defaultClockInTime || dto.defaultClockOutTime) {
      const clockIn = dto.defaultClockInTime ? new Date(dto.defaultClockInTime) : crewTimesheet.defaultClockInTime;
      const clockOut = dto.defaultClockOutTime ? new Date(dto.defaultClockOutTime) : crewTimesheet.defaultClockOutTime;

      if (clockOut <= clockIn) {
        throw new BadRequestException('Clock out time must be after clock in time');
      }
    }

    // Update crew timesheet
    Object.assign(crewTimesheet, {
      ...dto,
      defaultClockInTime: dto.defaultClockInTime ? new Date(dto.defaultClockInTime) : crewTimesheet.defaultClockInTime,
      defaultClockOutTime: dto.defaultClockOutTime ? new Date(dto.defaultClockOutTime) : crewTimesheet.defaultClockOutTime,
    });

    const savedTimesheet = await this.crewTimesheetRepository.save(crewTimesheet);

    // Regenerate time entries with updated defaults
    if (dto.workerIds || dto.defaultClockInTime || dto.defaultClockOutTime || dto.defaultBreakMinutes !== undefined || dto.defaultLunchMinutes !== undefined) {
      await this.generateTimeEntries(savedTimesheet.id);
    }

    return savedTimesheet;
  }

  /**
   * Submit crew timesheet for approval
   */
  async submitForApproval(id: string, dto: SubmitCrewTimesheetDto, userId: string): Promise<CrewTimesheet> {
    const crewTimesheet = await this.findOne(id);

    if (crewTimesheet.status !== CrewTimesheetStatus.DRAFT) {
      throw new BadRequestException('Can only submit crew timesheets in DRAFT status');
    }

    // Validate all time entries exist and are in DRAFT or SUBMITTED status
    const timeEntries = await this.timeEntryRepository.find({
      where: {
        crewTimesheetId: id,
      },
    });

    if (timeEntries.length === 0) {
      throw new BadRequestException('No time entries found for this crew timesheet');
    }

    // Update crew timesheet status
    crewTimesheet.status = CrewTimesheetStatus.SUBMITTED;
    crewTimesheet.submittedAt = new Date();
    crewTimesheet.submittedById = userId;
    if (dto.notes) {
      crewTimesheet.notes = dto.notes;
    }

    await this.crewTimesheetRepository.save(crewTimesheet);

    // Submit all related time entries
    for (const timeEntry of timeEntries) {
      if (timeEntry.status === TimeEntryStatus.DRAFT) {
        timeEntry.status = TimeEntryStatus.SUBMITTED;
        timeEntry.submittedAt = new Date();
        timeEntry.submittedById = userId;
        await this.timeEntryRepository.save(timeEntry);
      }
    }

    return crewTimesheet;
  }

  /**
   * Approve crew timesheet (auto-approves all related time entries)
   */
  async approve(id: string, dto: ApproveCrewTimesheetDto, userId: string): Promise<CrewTimesheet> {
    const crewTimesheet = await this.findOne(id);

    if (crewTimesheet.status !== CrewTimesheetStatus.SUBMITTED) {
      throw new BadRequestException('Can only approve crew timesheets in SUBMITTED status');
    }

    // Update crew timesheet status
    crewTimesheet.status = CrewTimesheetStatus.APPROVED;
    crewTimesheet.approvedAt = new Date();
    crewTimesheet.approvedById = userId;
    if (dto.comments) {
      crewTimesheet.approvalNotes = dto.comments;
    }

    await this.crewTimesheetRepository.save(crewTimesheet);

    // Auto-approve all related time entries
    const timeEntries = await this.timeEntryRepository.find({
      where: {
        crewTimesheetId: id,
        status: TimeEntryStatus.SUBMITTED,
      },
    });

    for (const timeEntry of timeEntries) {
      timeEntry.status = TimeEntryStatus.APPROVED;
      timeEntry.approvedAt = new Date();
      timeEntry.approvedById = userId;
      await this.timeEntryRepository.save(timeEntry);
    }

    return crewTimesheet;
  }

  /**
   * Reject crew timesheet (reverts all related time entries to DRAFT)
   */
  async reject(id: string, reason: string, userId: string): Promise<CrewTimesheet> {
    const crewTimesheet = await this.findOne(id);

    if (crewTimesheet.status !== CrewTimesheetStatus.SUBMITTED) {
      throw new BadRequestException('Can only reject crew timesheets in SUBMITTED status');
    }

    // Update crew timesheet status
    crewTimesheet.status = CrewTimesheetStatus.REJECTED;
    crewTimesheet.rejectedAt = new Date();
    crewTimesheet.rejectedById = userId;
    crewTimesheet.rejectionReason = reason;

    await this.crewTimesheetRepository.save(crewTimesheet);

    // Revert all related time entries to DRAFT
    const timeEntries = await this.timeEntryRepository.find({
      where: {
        crewTimesheetId: id,
      },
    });

    for (const timeEntry of timeEntries) {
      if (timeEntry.status === TimeEntryStatus.SUBMITTED) {
        timeEntry.status = TimeEntryStatus.DRAFT;
        timeEntry.submittedAt = null;
        timeEntry.submittedById = null;
        await this.timeEntryRepository.save(timeEntry);
      }
    }

    return crewTimesheet;
  }

  /**
   * Delete a crew timesheet (only allowed in DRAFT status)
   */
  async remove(id: string): Promise<void> {
    const crewTimesheet = await this.findOne(id);

    if (crewTimesheet.status !== CrewTimesheetStatus.DRAFT) {
      throw new ForbiddenException('Can only delete crew timesheets in DRAFT status');
    }

    // Delete all related time entries that are still in DRAFT
    await this.timeEntryRepository.delete({
      crewTimesheetId: id,
      status: TimeEntryStatus.DRAFT,
    });

    // Delete crew timesheet
    await this.crewTimesheetRepository.remove(crewTimesheet);
  }

  /**
   * Get time entries for a crew timesheet
   */
  async getTimeEntries(id: string): Promise<TimeEntry[]> {
    const crewTimesheet = await this.findOne(id);

    return await this.timeEntryRepository.find({
      where: { crewTimesheetId: id },
      relations: ['workerProfile', 'workerProfile.user'],
      order: { clockInTime: 'ASC' },
    });
  }

  /**
   * Map crew timesheet entity to response DTO
   */
  mapToResponseDto(crewTimesheet: CrewTimesheet): CrewTimesheetResponseDto {
    return {
      id: crewTimesheet.id,
      projectId: crewTimesheet.projectId,
      foremanId: crewTimesheet.foremanId,
      timesheetDate: crewTimesheet.timesheetDate,
      workerIds: crewTimesheet.workerIds,
      defaultClockInTime: crewTimesheet.defaultClockInTime,
      defaultClockOutTime: crewTimesheet.defaultClockOutTime,
      defaultBreakMinutes: crewTimesheet.defaultBreakMinutes,
      defaultLunchMinutes: crewTimesheet.defaultLunchMinutes,
      status: crewTimesheet.status,
      notes: crewTimesheet.notes,
      generatedEntriesCount: crewTimesheet.generatedEntriesCount,
      submittedAt: crewTimesheet.submittedAt,
      submittedById: crewTimesheet.submittedById,
      approvedAt: crewTimesheet.approvedAt,
      approvedById: crewTimesheet.approvedById,
      approvalNotes: crewTimesheet.approvalNotes,
      rejectedAt: crewTimesheet.rejectedAt,
      rejectedById: crewTimesheet.rejectedById,
      rejectionReason: crewTimesheet.rejectionReason,
      createdAt: crewTimesheet.createdAt,
      updatedAt: crewTimesheet.updatedAt,
      project: crewTimesheet.project
        ? {
            id: crewTimesheet.project.id,
            name: crewTimesheet.project.name,
            projectNumber: crewTimesheet.project.number || '',
          }
        : undefined,
      foreman: crewTimesheet.foreman
        ? {
            id: crewTimesheet.foreman.id,
            firstName: crewTimesheet.foreman.firstName,
            lastName: crewTimesheet.foreman.lastName,
            fullName: `${crewTimesheet.foreman.firstName} ${crewTimesheet.foreman.lastName}`,
          }
        : undefined,
      approvedBy: crewTimesheet.approvedBy
        ? {
            id: crewTimesheet.approvedBy.id,
            email: crewTimesheet.approvedBy.email,
            firstName: crewTimesheet.approvedBy.firstName,
            lastName: crewTimesheet.approvedBy.lastName,
            fullName: `${crewTimesheet.approvedBy.firstName} ${crewTimesheet.approvedBy.lastName}`,
          }
        : undefined,
      canEdit: crewTimesheet.status === CrewTimesheetStatus.DRAFT,
      canSubmit: crewTimesheet.status === CrewTimesheetStatus.DRAFT,
      canApprove: crewTimesheet.status === CrewTimesheetStatus.SUBMITTED,
      workerCount: crewTimesheet.workerIds.length,
      expectedWorkHours: 0, // Would need to calculate from time range
    };
  }
}
