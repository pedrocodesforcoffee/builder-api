import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Repository } from 'typeorm';
import { Queue } from 'bull';
import {
  ReportSchedule,
  ScheduleFrequency,
} from '../entities/report-schedule.entity';
import { ReportExecution } from '../entities/report-execution.entity';
import {
  CreateReportScheduleDto,
  UpdateReportScheduleDto,
  QueryReportSchedulesDto,
  ExecuteReportScheduleDto,
} from '../dto/report/report-schedule.dto';

/**
 * Report Schedule Service
 *
 * Manages CRUD operations and scheduling logic for automated financial reports.
 * Integrates with Bull queue for background job processing.
 *
 * Features:
 * - Create, read, update, delete report schedules
 * - Manual execution with optional parameter overrides
 * - Activate/deactivate schedules
 * - Calculate next run times based on frequency/cron
 * - Add jobs to Bull queue with proper timing
 * - Reschedule all active schedules (called on app startup)
 *
 * Business Rules:
 * - Cron expression required for CUSTOM frequency
 * - Email recipients validated for proper format
 * - Next run time calculated on create and frequency changes
 * - Jobs automatically added to queue when schedules are created/updated
 * - Manual executions have high priority
 */
@Injectable()
export class ReportScheduleService {
  private readonly logger = new Logger(ReportScheduleService.name);

  constructor(
    @InjectRepository(ReportSchedule)
    private readonly reportScheduleRepo: Repository<ReportSchedule>,
    @InjectRepository(ReportExecution)
    private readonly reportExecutionRepository: Repository<ReportExecution>,
    @InjectQueue('report-schedule')
    private readonly reportQueue: Queue,
  ) {}

  /**
   * Create a new report schedule
   *
   * @param projectId - Project ID
   * @param dto - Create report schedule DTO
   * @param userId - ID of user creating the schedule
   * @returns Created report schedule
   */
  async create(
    projectId: string,
    dto: CreateReportScheduleDto,
    userId: string,
  ): Promise<ReportSchedule> {
    this.logger.log(
      `Creating report schedule for project ${projectId}: ${dto.reportName}`,
    );

    // Validate cron if CUSTOM frequency
    if (dto.frequency === ScheduleFrequency.CUSTOM && !dto.cronExpression) {
      throw new BadRequestException(
        'Cron expression required for CUSTOM frequency',
      );
    }

    // Validate email recipients
    this.validateEmailRecipients(dto.emailRecipients);

    // Calculate next run time
    const nextRunAt = this.calculateNextRun(dto.frequency, dto.cronExpression);

    const schedule = this.reportScheduleRepo.create({
      ...dto,
      projectId,
      createdById: userId,
      nextRunAt,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });

    const saved = await this.reportScheduleRepo.save(schedule);

    // Schedule first run if active
    if (saved.isActive) {
      await this.scheduleNextRun(saved);
    }

    this.logger.log(
      `Created report schedule ${saved.id}. Next run: ${saved.nextRunAt?.toISOString()}`,
    );

    return saved;
  }

  /**
   * Find all report schedules for a project with filtering and pagination
   *
   * @param projectId - Project ID
   * @param query - Query parameters for filtering and pagination
   * @returns Tuple of [schedules, total count]
   */
  async findAll(
    projectId: string,
    query: QueryReportSchedulesDto,
  ): Promise<[ReportSchedule[], number]> {
    const qb = this.reportScheduleRepo.createQueryBuilder('schedule');
    qb.where('schedule.projectId = :projectId', { projectId });

    // Apply filters
    if (query.reportType) {
      qb.andWhere('schedule.reportType = :reportType', {
        reportType: query.reportType,
      });
    }

    if (query.format) {
      qb.andWhere('schedule.format = :format', { format: query.format });
    }

    if (query.frequency) {
      qb.andWhere('schedule.frequency = :frequency', {
        frequency: query.frequency,
      });
    }

    if (query.isActive !== undefined) {
      qb.andWhere('schedule.isActive = :isActive', { isActive: query.isActive });
    }

    // Apply pagination
    qb.skip(query.skip || 0);
    qb.take(query.take || 50);

    // Order by creation date (newest first)
    qb.orderBy('schedule.createdAt', 'DESC');

    return await qb.getManyAndCount();
  }

  /**
   * Find a single report schedule by ID
   *
   * @param id - Schedule ID
   * @param projectId - Project ID for authorization
   * @returns Report schedule
   * @throws NotFoundException if schedule not found
   */
  async findOne(id: string, projectId: string): Promise<ReportSchedule> {
    const schedule = await this.reportScheduleRepo.findOne({
      where: { id, projectId },
      relations: ['project', 'createdBy'],
    });

    if (!schedule) {
      throw new NotFoundException(`Report schedule with ID ${id} not found`);
    }

    return schedule;
  }

  /**
   * Update an existing report schedule
   *
   * @param id - Schedule ID
   * @param projectId - Project ID for authorization
   * @param dto - Update report schedule DTO
   * @returns Updated report schedule
   */
  async update(
    id: string,
    projectId: string,
    dto: UpdateReportScheduleDto,
  ): Promise<ReportSchedule> {
    const schedule = await this.findOne(id, projectId);

    this.logger.log(`Updating report schedule ${id}`);

    // Validate cron if changing to CUSTOM frequency
    if (
      dto.frequency === ScheduleFrequency.CUSTOM &&
      !dto.cronExpression &&
      !schedule.cronExpression
    ) {
      throw new BadRequestException(
        'Cron expression required for CUSTOM frequency',
      );
    }

    // Validate email if provided
    if (dto.emailRecipients) {
      this.validateEmailRecipients(dto.emailRecipients);
    }

    // Update fields
    Object.assign(schedule, dto);

    // Recalculate nextRunAt if frequency or cron changed
    const frequencyChanged = dto.frequency && dto.frequency !== schedule.frequency;
    const cronChanged = dto.cronExpression && dto.cronExpression !== schedule.cronExpression;

    if (frequencyChanged || cronChanged) {
      schedule.nextRunAt = this.calculateNextRun(
        schedule.frequency,
        schedule.cronExpression,
      );

      // Reschedule if active
      if (schedule.isActive) {
        await this.scheduleNextRun(schedule);
      }

      this.logger.log(
        `Recalculated next run for schedule ${id}: ${schedule.nextRunAt?.toISOString()}`,
      );
    }

    const updated = await this.reportScheduleRepo.save(schedule);

    this.logger.log(`Updated report schedule ${id}`);

    return updated;
  }

  /**
   * Delete a report schedule
   *
   * @param id - Schedule ID
   * @param projectId - Project ID for authorization
   */
  async delete(id: string, projectId: string): Promise<void> {
    const schedule = await this.findOne(id, projectId);

    this.logger.log(`Deleting report schedule ${id}`);

    await this.reportScheduleRepo.remove(schedule);

    this.logger.log(`Deleted report schedule ${id}`);

    // Note: Bull jobs will fail gracefully if schedule doesn't exist
  }

  /**
   * Manually execute a report schedule
   *
   * @param id - Schedule ID
   * @param projectId - Project ID for authorization
   * @param dto - Optional execution overrides
   */
  async execute(
    id: string,
    projectId: string,
    dto?: ExecuteReportScheduleDto,
  ): Promise<void> {
    const schedule = await this.findOne(id, projectId);

    this.logger.log(`Manually executing report schedule ${id}`);

    // Add immediate job to queue with high priority
    await this.reportQueue.add(
      'generate-report',
      {
        scheduleId: id,
        overrides: dto,
      },
      {
        priority: 1, // High priority for manual execution
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );

    this.logger.log(
      `Queued manual execution for report schedule ${id} (high priority)`,
    );
  }

  /**
   * Activate a report schedule
   *
   * @param id - Schedule ID
   * @param projectId - Project ID for authorization
   * @returns Updated report schedule
   */
  async activate(id: string, projectId: string): Promise<ReportSchedule> {
    const schedule = await this.findOne(id, projectId);

    this.logger.log(`Activating report schedule ${id}`);

    schedule.isActive = true;

    const updated = await this.reportScheduleRepo.save(schedule);

    // Schedule next run
    await this.scheduleNextRun(updated);

    this.logger.log(
      `Activated report schedule ${id}. Next run: ${updated.nextRunAt?.toISOString()}`,
    );

    return updated;
  }

  /**
   * Deactivate a report schedule
   *
   * @param id - Schedule ID
   * @param projectId - Project ID for authorization
   * @returns Updated report schedule
   */
  async deactivate(id: string, projectId: string): Promise<ReportSchedule> {
    const schedule = await this.findOne(id, projectId);

    this.logger.log(`Deactivating report schedule ${id}`);

    schedule.isActive = false;

    const updated = await this.reportScheduleRepo.save(schedule);

    this.logger.log(`Deactivated report schedule ${id}`);

    return updated;
  }

  /**
   * Schedule next run by adding job to Bull queue with delay
   *
   * @param schedule - Report schedule entity
   */
  async scheduleNextRun(schedule: ReportSchedule): Promise<void> {
    if (!schedule.isActive || !schedule.nextRunAt) {
      this.logger.debug(
        `Skipping schedule for ${schedule.id} (active: ${schedule.isActive}, nextRunAt: ${schedule.nextRunAt})`,
      );
      return;
    }

    const delay = schedule.nextRunAt.getTime() - Date.now();

    if (delay < 0) {
      this.logger.warn(
        `Next run time for schedule ${schedule.id} has already passed. Skipping.`,
      );
      return;
    }

    await this.reportQueue.add(
      'generate-report',
      {
        scheduleId: schedule.id,
      },
      {
        delay,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 10000,
        },
        removeOnComplete: true, // Clean up completed jobs
        removeOnFail: false, // Keep failed jobs for debugging
      },
    );

    this.logger.log(
      `Scheduled report ${schedule.id} (${schedule.reportName}) to run at ${schedule.nextRunAt.toISOString()} (in ${Math.round(delay / 1000)}s)`,
    );
  }

  /**
   * Reschedule all active report schedules
   * Called on application startup to restore schedule state
   */
  async rescheduleAll(): Promise<void> {
    this.logger.log('Rescheduling all active report schedules...');

    const activeSchedules = await this.reportScheduleRepo.find({
      where: { isActive: true },
    });

    let scheduledCount = 0;

    for (const schedule of activeSchedules) {
      try {
        await this.scheduleNextRun(schedule);
        scheduledCount++;
      } catch (error) {
        this.logger.error(
          `Failed to reschedule report ${schedule.id}:`,
          (error as Error).stack,
        );
      }
    }

    this.logger.log(
      `Rescheduled ${scheduledCount} of ${activeSchedules.length} active report schedules`,
    );
  }

  /**
   * Calculate next run time based on frequency and cron expression
   *
   * @param frequency - Schedule frequency
   * @param cronExpression - Cron expression (for CUSTOM frequency)
   * @returns Next run date/time
   */
  private calculateNextRun(
    frequency: ScheduleFrequency,
    cronExpression?: string,
  ): Date {
    const now = new Date();

    switch (frequency) {
      case ScheduleFrequency.DAILY:
        // Add 1 day
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);

      case ScheduleFrequency.WEEKLY:
        // Add 7 days
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      case ScheduleFrequency.MONTHLY:
        // Add 1 month
        const next = new Date(now);
        next.setMonth(next.getMonth() + 1);
        return next;

      case ScheduleFrequency.CUSTOM:
        // For now, simple implementation - just add 1 day
        // In production, use a cron parser library like 'cron-parser'
        // Example with cron-parser:
        // const interval = parser.parseExpression(cronExpression);
        // return interval.next().toDate();
        this.logger.warn(
          'CUSTOM frequency with cron expression not fully implemented. Using 1-day default.',
        );
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);

      default:
        // Fallback: 1 day
        this.logger.warn(
          `Unknown frequency ${frequency}. Using 1-day default.`,
        );
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Validate email recipients format
   *
   * @param recipients - Comma-separated email addresses
   * @throws BadRequestException if any email is invalid
   */
  private validateEmailRecipients(recipients: string): void {
    const emails = recipients.split(',').map((e) => e.trim());
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const email of emails) {
      if (!emailRegex.test(email)) {
        throw new BadRequestException(`Invalid email address: ${email}`);
      }
    }

    if (emails.length === 0) {
      throw new BadRequestException('At least one email recipient is required');
    }

    this.logger.debug(
      `Validated ${emails.length} email recipient(s): ${emails.join(', ')}`,
    );
  }

  /**
   * Get Execution History
   *
   * Retrieves execution history for a specific report schedule with pagination.
   *
   * @param scheduleId - Report schedule ID
   * @param skip - Number of records to skip (default: 0)
   * @param take - Number of records to take (default: 50, max: 100)
   * @returns Tuple of [executions, total count]
   */
  async getExecutionHistory(
    scheduleId: string,
    skip: number = 0,
    take: number = 50,
  ): Promise<[ReportExecution[], number]> {
    this.logger.log(`Getting execution history for schedule ${scheduleId} (skip: ${skip}, take: ${take})`);

    // Limit maximum take to prevent performance issues
    const limitedTake = Math.min(take, 100);

    const [executions, total] = await this.reportExecutionRepository.findAndCount({
      where: {
        scheduledReportId: scheduleId,
      },
      order: {
        startedAt: 'DESC', // Most recent first
      },
      skip,
      take: limitedTake,
    });

    this.logger.log(`Found ${executions.length} executions (total: ${total}) for schedule ${scheduleId}`);

    return [executions, total];
  }
}
