import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Between,
  LessThanOrEqual,
  MoreThanOrEqual,
  DataSource,
  IsNull,
} from 'typeorm';
import { DailyReport } from '../entities/daily-report.entity';
import { DailyManpower } from '../entities/daily-manpower.entity';
import { DailyEquipment } from '../entities/daily-equipment.entity';
import { DailyWork } from '../entities/daily-work.entity';
import { DailyMaterial } from '../entities/daily-material.entity';
import { DailyInspection } from '../entities/daily-inspection.entity';
import { DailyIncident } from '../entities/daily-incident.entity';
import { DailyVisitor } from '../entities/daily-visitor.entity';
import { DailyDelay } from '../entities/daily-delay.entity';
import { CreateDailyReportDto } from '../dto/create-daily-report.dto';
import { UpdateDailyReportDto } from '../dto/update-daily-report.dto';
import { QueryDailyReportsDto } from '../dto/query-daily-reports.dto';
import { SubmitDailyReportDto } from '../dto/submit-daily-report.dto';
import {
  ReviewDailyReportDto,
  ReviewAction,
} from '../dto/review-daily-report.dto';
import { DailyReportStatus } from '../enums/daily-report.enum';
import { User } from '../../users/entities/user.entity';

/**
 * Daily Reports Service
 * Core business logic for managing construction daily reports
 */
@Injectable()
export class DailyReportsService {
  private readonly logger = new Logger(DailyReportsService.name);

  constructor(
    @InjectRepository(DailyReport)
    private readonly dailyReportRepository: Repository<DailyReport>,
    @InjectRepository(DailyManpower)
    private readonly manpowerRepository: Repository<DailyManpower>,
    @InjectRepository(DailyEquipment)
    private readonly equipmentRepository: Repository<DailyEquipment>,
    @InjectRepository(DailyWork)
    private readonly workRepository: Repository<DailyWork>,
    @InjectRepository(DailyMaterial)
    private readonly materialRepository: Repository<DailyMaterial>,
    @InjectRepository(DailyInspection)
    private readonly inspectionRepository: Repository<DailyInspection>,
    @InjectRepository(DailyIncident)
    private readonly incidentRepository: Repository<DailyIncident>,
    @InjectRepository(DailyVisitor)
    private readonly visitorRepository: Repository<DailyVisitor>,
    @InjectRepository(DailyDelay)
    private readonly delayRepository: Repository<DailyDelay>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new daily report
   * Uses transaction to ensure atomicity of main report + nested entities
   */
  async create(
    createDto: CreateDailyReportDto,
    user: User,
  ): Promise<DailyReport> {
    this.logger.log(
      `Creating daily report for project ${createDto.projectId} on ${createDto.reportDate}`,
    );

    // Check for existing report on same date
    const existing = await this.dailyReportRepository.findOne({
      where: {
        projectId: createDto.projectId,
        reportDate: new Date(createDto.reportDate),
        deletedAt: IsNull(),
      },
    });

    if (existing) {
      throw new BadRequestException(
        `A daily report already exists for ${createDto.reportDate}. Edit the existing report instead.`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create main report
      const report = this.dailyReportRepository.create({
        projectId: createDto.projectId,
        reportDate: new Date(createDto.reportDate),
        weatherConditionAm: createDto.weatherConditionAm,
        weatherConditionPm: createDto.weatherConditionPm,
        temperatureHigh: createDto.temperatureHigh,
        temperatureLow: createDto.temperatureLow,
        precipitationInches: createDto.precipitationInches,
        windSpeedMph: createDto.windSpeedMph,
        humidity: createDto.humidity,
        weatherImpact: createDto.weatherImpact,
        weatherNotes: createDto.weatherNotes,
        workSummary: createDto.workSummary,
        generalNotes: createDto.generalNotes,
        tomorrowPlan: createDto.tomorrowPlan,
        createdBy: user,
        createdById: user.id,
        status: DailyReportStatus.DRAFT,
      });

      const savedReport = await queryRunner.manager.save(report);

      // Save nested entities
      if (createDto.manpower?.length) {
        await this.saveManpower(
          savedReport.id,
          createDto.manpower,
          queryRunner.manager,
        );
      }
      if (createDto.equipment?.length) {
        await this.saveEquipment(
          savedReport.id,
          createDto.equipment,
          queryRunner.manager,
        );
      }
      if (createDto.workLogs?.length) {
        await this.saveWorkLogs(
          savedReport.id,
          createDto.workLogs,
          queryRunner.manager,
        );
      }
      if (createDto.materials?.length) {
        await this.saveMaterials(
          savedReport.id,
          createDto.materials,
          queryRunner.manager,
        );
      }
      if (createDto.inspections?.length) {
        await this.saveInspections(
          savedReport.id,
          createDto.inspections,
          queryRunner.manager,
        );
      }
      if (createDto.incidents?.length) {
        await this.saveIncidents(
          savedReport.id,
          createDto.incidents,
          queryRunner.manager,
        );
      }
      if (createDto.visitors?.length) {
        await this.saveVisitors(
          savedReport.id,
          createDto.visitors,
          queryRunner.manager,
        );
      }
      if (createDto.delays?.length) {
        await this.saveDelays(
          savedReport.id,
          createDto.delays,
          queryRunner.manager,
        );
      }

      // Calculate totals
      await this.updateTotals(savedReport.id, queryRunner.manager);

      await queryRunner.commitTransaction();

      this.logger.log(`Daily report created successfully: ${savedReport.id}`);
      return this.findOne(savedReport.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create daily report: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Find all reports with filtering and pagination
   */
  async findAll(query: QueryDailyReportsDto): Promise<{
    data: DailyReport[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { projectId, startDate, endDate, status, createdById, page, limit } =
      query;

    const whereClause: any = { projectId, deletedAt: IsNull() };

    // Date range filtering
    if (startDate && endDate) {
      whereClause.reportDate = Between(new Date(startDate), new Date(endDate));
    } else if (startDate) {
      whereClause.reportDate = MoreThanOrEqual(new Date(startDate));
    } else if (endDate) {
      whereClause.reportDate = LessThanOrEqual(new Date(endDate));
    }

    if (status) {
      whereClause.status = status;
    }

    if (createdById) {
      whereClause.createdById = createdById;
    }

    const [data, total] = await this.dailyReportRepository.findAndCount({
      where: whereClause,
      relations: ['createdBy', 'approvedBy'],
      order: { reportDate: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  /**
   * Find a single report by ID with all relations loaded
   */
  async findOne(id: string): Promise<DailyReport> {
    const report = await this.dailyReportRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: [
        'project',
        'createdBy',
        'approvedBy',
        'manpower',
        'equipment',
        'workLogs',
        'materials',
        'inspections',
        'incidents',
        'visitors',
        'delays',
      ],
    });

    if (!report) {
      throw new NotFoundException(`Daily report with ID ${id} not found`);
    }

    return report;
  }

  /**
   * Find report by project and date
   */
  async findByDate(
    projectId: string,
    date: string,
  ): Promise<DailyReport | null> {
    return this.dailyReportRepository.findOne({
      where: {
        projectId,
        reportDate: new Date(date),
        deletedAt: IsNull(),
      },
      relations: [
        'manpower',
        'equipment',
        'workLogs',
        'materials',
        'inspections',
        'incidents',
        'visitors',
        'delays',
      ],
    });
  }

  /**
   * Update an existing report
   * Uses replace strategy for nested entities
   */
  async update(
    id: string,
    updateDto: UpdateDailyReportDto,
    user: User,
  ): Promise<DailyReport> {
    const report = await this.findOne(id);

    if (report.status === DailyReportStatus.APPROVED) {
      throw new ForbiddenException('Cannot edit an approved report');
    }

    // If report was rejected, reset to draft on edit
    if (report.status === DailyReportStatus.REJECTED) {
      report.status = DailyReportStatus.DRAFT;
      report.rejectionReason = null;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update main fields
      Object.assign(report, {
        ...updateDto,
        updatedBy: user,
        updatedById: user.id,
      });

      await queryRunner.manager.save(report);

      // Update nested entities using replace strategy
      if (updateDto.manpower !== undefined) {
        await queryRunner.manager.delete(DailyManpower, {
          dailyReportId: id,
        });
        if (updateDto.manpower.length) {
          await this.saveManpower(id, updateDto.manpower, queryRunner.manager);
        }
      }

      if (updateDto.equipment !== undefined) {
        await queryRunner.manager.delete(DailyEquipment, {
          dailyReportId: id,
        });
        if (updateDto.equipment.length) {
          await this.saveEquipment(
            id,
            updateDto.equipment,
            queryRunner.manager,
          );
        }
      }

      if (updateDto.workLogs !== undefined) {
        await queryRunner.manager.delete(DailyWork, { dailyReportId: id });
        if (updateDto.workLogs.length) {
          await this.saveWorkLogs(id, updateDto.workLogs, queryRunner.manager);
        }
      }

      if (updateDto.materials !== undefined) {
        await queryRunner.manager.delete(DailyMaterial, {
          dailyReportId: id,
        });
        if (updateDto.materials.length) {
          await this.saveMaterials(
            id,
            updateDto.materials,
            queryRunner.manager,
          );
        }
      }

      if (updateDto.inspections !== undefined) {
        await queryRunner.manager.delete(DailyInspection, {
          dailyReportId: id,
        });
        if (updateDto.inspections.length) {
          await this.saveInspections(
            id,
            updateDto.inspections,
            queryRunner.manager,
          );
        }
      }

      if (updateDto.incidents !== undefined) {
        await queryRunner.manager.delete(DailyIncident, {
          dailyReportId: id,
        });
        if (updateDto.incidents.length) {
          await this.saveIncidents(
            id,
            updateDto.incidents,
            queryRunner.manager,
          );
        }
      }

      if (updateDto.visitors !== undefined) {
        await queryRunner.manager.delete(DailyVisitor, { dailyReportId: id });
        if (updateDto.visitors.length) {
          await this.saveVisitors(id, updateDto.visitors, queryRunner.manager);
        }
      }

      if (updateDto.delays !== undefined) {
        await queryRunner.manager.delete(DailyDelay, { dailyReportId: id });
        if (updateDto.delays.length) {
          await this.saveDelays(id, updateDto.delays, queryRunner.manager);
        }
      }

      // Recalculate totals
      await this.updateTotals(id, queryRunner.manager);

      await queryRunner.commitTransaction();

      this.logger.log(`Daily report updated successfully: ${id}`);
      return this.findOne(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to update daily report: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Submit a report for approval with digital signature
   */
  async submit(
    id: string,
    submitDto: SubmitDailyReportDto,
    user: User,
    ip: string,
  ): Promise<DailyReport> {
    const report = await this.findOne(id);

    if (
      report.status !== DailyReportStatus.DRAFT &&
      report.status !== DailyReportStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Only draft or rejected reports can be submitted',
      );
    }

    // Validate report has minimum required data
    this.validateReportForSubmission(report);

    report.status = DailyReportStatus.SUBMITTED;
    report.signatureData = submitDto.signatureData;
    report.signedAt = new Date();
    report.signedIp = ip;
    report.submittedAt = new Date();

    await this.dailyReportRepository.save(report);

    this.logger.log(`Daily report submitted: ${id}`);
    return this.findOne(id);
  }

  /**
   * Approve or reject a submitted report
   */
  async review(
    id: string,
    reviewDto: ReviewDailyReportDto,
    user: User,
  ): Promise<DailyReport> {
    const report = await this.findOne(id);

    if (report.status !== DailyReportStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted reports can be reviewed');
    }

    if (reviewDto.action === ReviewAction.APPROVE) {
      report.status = DailyReportStatus.APPROVED;
      report.approvedAt = new Date();
      report.approvedBy = user;
      report.approvedById = user.id;
      this.logger.log(`Daily report approved: ${id}`);
    } else {
      if (!reviewDto.rejectionReason) {
        throw new BadRequestException('Rejection reason is required');
      }
      report.status = DailyReportStatus.REJECTED;
      report.rejectionReason = reviewDto.rejectionReason;
      this.logger.log(`Daily report rejected: ${id}`);
    }

    await this.dailyReportRepository.save(report);

    return this.findOne(id);
  }

  /**
   * Copy manpower and equipment from most recent previous report
   */
  async copyFromPrevious(
    projectId: string,
    targetDate: string,
    user: User,
  ): Promise<DailyReport> {
    // Find most recent report before target date
    const previousReport = await this.dailyReportRepository.findOne({
      where: {
        projectId,
        reportDate: LessThanOrEqual(new Date(targetDate)),
        deletedAt: IsNull(),
      },
      relations: ['manpower', 'equipment'],
      order: { reportDate: 'DESC' },
    });

    if (!previousReport) {
      throw new NotFoundException('No previous report found to copy from');
    }

    // Create new report with copied manpower and equipment
    const createDto: CreateDailyReportDto = {
      projectId,
      reportDate: targetDate,
      manpower: previousReport.manpower.map((m) => ({
        tradeName: m.tradeName,
        companyName: m.companyName,
        subcontractorId: m.subcontractorId,
        headcount: m.headcount,
        hoursWorked: m.hoursWorked,
        costCode: m.costCode,
      })),
      equipment: previousReport.equipment.map((e) => ({
        equipmentName: e.equipmentName,
        equipmentId: e.equipmentId,
        quantity: e.quantity,
        hoursUsed: e.hoursUsed,
        operatorName: e.operatorName,
        isRental: e.isRental,
        rentalCompany: e.rentalCompany,
        costCode: e.costCode,
      })),
    };

    this.logger.log(
      `Copying data from report ${previousReport.id} to new report for ${targetDate}`,
    );
    return this.create(createDto, user);
  }

  /**
   * Soft delete a report
   */
  async softDelete(id: string, user: User): Promise<void> {
    const report = await this.findOne(id);

    if (report.status === DailyReportStatus.APPROVED) {
      throw new ForbiddenException('Cannot delete an approved report');
    }

    report.deletedAt = new Date();
    await this.dailyReportRepository.save(report);

    this.logger.log(`Daily report soft deleted: ${id}`);
  }

  // ========================================
  // Private Helper Methods
  // ========================================

  private async saveManpower(
    reportId: string,
    items: any[],
    manager?: any,
  ): Promise<void> {
    if (!items?.length) return;
    const entities = items.map((item) =>
      this.manpowerRepository.create({ ...item, dailyReportId: reportId }),
    );
    if (manager) {
      await manager.save(DailyManpower, entities);
    } else {
      await this.manpowerRepository.save(entities as any);
    }
  }

  private async saveEquipment(
    reportId: string,
    items: any[],
    manager?: any,
  ): Promise<void> {
    if (!items?.length) return;
    const entities = items.map((item) =>
      this.equipmentRepository.create({ ...item, dailyReportId: reportId }),
    );
    if (manager) {
      await manager.save(DailyEquipment, entities);
    } else {
      await this.equipmentRepository.save(entities as any);
    }
  }

  private async saveWorkLogs(
    reportId: string,
    items: any[],
    manager?: any,
  ): Promise<void> {
    if (!items?.length) return;
    const entities = items.map((item) =>
      this.workRepository.create({ ...item, dailyReportId: reportId }),
    );
    if (manager) {
      await manager.save(DailyWork, entities);
    } else {
      await this.workRepository.save(entities as any);
    }
  }

  private async saveMaterials(
    reportId: string,
    items: any[],
    manager?: any,
  ): Promise<void> {
    if (!items?.length) return;
    const entities = items.map((item) =>
      this.materialRepository.create({ ...item, dailyReportId: reportId }),
    );
    if (manager) {
      await manager.save(DailyMaterial, entities);
    } else {
      await this.materialRepository.save(entities as any);
    }
  }

  private async saveInspections(
    reportId: string,
    items: any[],
    manager?: any,
  ): Promise<void> {
    if (!items?.length) return;
    const entities = items.map((item) =>
      this.inspectionRepository.create({ ...item, dailyReportId: reportId }),
    );
    if (manager) {
      await manager.save(DailyInspection, entities);
    } else {
      await this.inspectionRepository.save(entities as any);
    }
  }

  private async saveIncidents(
    reportId: string,
    items: any[],
    manager?: any,
  ): Promise<void> {
    if (!items?.length) return;
    const entities = items.map((item) =>
      this.incidentRepository.create({ ...item, dailyReportId: reportId }),
    );
    if (manager) {
      await manager.save(DailyIncident, entities);
    } else {
      await this.incidentRepository.save(entities as any);
    }
  }

  private async saveVisitors(
    reportId: string,
    items: any[],
    manager?: any,
  ): Promise<void> {
    if (!items?.length) return;
    const entities = items.map((item) =>
      this.visitorRepository.create({ ...item, dailyReportId: reportId }),
    );
    if (manager) {
      await manager.save(DailyVisitor, entities);
    } else {
      await this.visitorRepository.save(entities as any);
    }
  }

  private async saveDelays(
    reportId: string,
    items: any[],
    manager?: any,
  ): Promise<void> {
    if (!items?.length) return;
    const entities = items.map((item) =>
      this.delayRepository.create({ ...item, dailyReportId: reportId }),
    );
    if (manager) {
      await manager.save(DailyDelay, entities);
    } else {
      await this.delayRepository.save(entities as any);
    }
  }

  /**
   * Calculate and update total workers and man-hours
   */
  private async updateTotals(reportId: string, manager?: any): Promise<void> {
    const manpower = await this.manpowerRepository.find({
      where: { dailyReportId: reportId },
    });

    const totalWorkers = manpower.reduce((sum, m) => sum + m.headcount, 0);
    const totalManHours = manpower.reduce(
      (sum, m) =>
        sum + m.headcount * (m.hoursWorked + (m.overtimeHours || 0)),
      0,
    );

    if (manager) {
      await manager.update(DailyReport, reportId, {
        totalWorkers,
        totalManHours,
      });
    } else {
      await this.dailyReportRepository.update(reportId, {
        totalWorkers,
        totalManHours,
      });
    }
  }

  /**
   * Validate report has minimum required data for submission
   */
  private validateReportForSubmission(report: DailyReport): void {
    const errors: string[] = [];

    if (!report.weatherConditionAm && !report.weatherConditionPm) {
      errors.push('Weather conditions are required');
    }

    if (!report.manpower?.length) {
      errors.push('At least one manpower entry is required');
    }

    if (!report.workLogs?.length) {
      errors.push('At least one work log entry is required');
    }

    if (errors.length) {
      throw new BadRequestException({
        message: 'Report validation failed',
        errors,
      });
    }
  }
}
