import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubmittalLeadTime } from '../entities/submittal-lead-time.entity';
import { Submittal, SubmittalType } from '../entities/submittal.entity';
import { ProjectSubmittalSettings } from '../entities/project-submittal-settings.entity';
import { CalculateLeadTimeDto } from '../dto/calculate-lead-time.dto';

export interface LeadTimeCalculationResult {
  requiredOnSiteDate: Date;
  submittalDueDate: Date;
  fabricationStartDate: Date;
  deliveryStartDate: Date;
  reviewStartDate: Date;
  totalDays: number;
  fabricationDays: number;
  deliveryDays: number;
  reviewDays: number;
  businessDaysRequired: number;
  warningThresholdDate: Date;
  isCritical: boolean;
}

export interface LeadTimeWarning {
  submittal: Submittal;
  daysUntilDue: number;
  daysOverdue: number;
  requiredOnSiteDate: Date;
  submittalDueDate: Date;
  currentStatus: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

@Injectable()
export class SubmittalLeadTimeService {
  private readonly logger = new Logger(SubmittalLeadTimeService.name);

  constructor(
    @InjectRepository(SubmittalLeadTime)
    private readonly leadTimeRepository: Repository<SubmittalLeadTime>,
    @InjectRepository(Submittal)
    private readonly submittalRepository: Repository<Submittal>,
    @InjectRepository(ProjectSubmittalSettings)
    private readonly settingsRepository: Repository<ProjectSubmittalSettings>,
  ) {}

  /**
   * Calculate lead time and critical dates working backward from required on-site date
   */
  async calculateLeadTime(
    projectId: string,
    dto: CalculateLeadTimeDto,
  ): Promise<LeadTimeCalculationResult> {
    const requiredOnSiteDate = new Date(dto.requiredOnSiteDate);

    // Get lead time data from configuration or DTO overrides
    const leadTimeData = await this.getLeadTimeData(
      projectId,
      dto.specSection,
      dto.submittalType as SubmittalType,
    );

    const fabricationDays = dto.fabricationDays ?? leadTimeData.fabricationDays;
    const deliveryDays = dto.deliveryDays ?? leadTimeData.deliveryDays;
    const reviewDays = dto.reviewDays ?? leadTimeData.reviewDays;
    const totalDays = fabricationDays + deliveryDays + reviewDays;

    // Get project settings for non-working days
    const settings = await this.getProjectSettings(projectId);
    const nonWorkingDays = settings?.nonWorkingDays || [0, 6]; // Default: weekends

    // Calculate dates working backward
    const deliveryStartDate = this.subtractBusinessDays(
      requiredOnSiteDate,
      deliveryDays,
      nonWorkingDays,
    );

    const fabricationStartDate = this.subtractBusinessDays(
      deliveryStartDate,
      fabricationDays,
      nonWorkingDays,
    );

    const reviewStartDate = this.subtractBusinessDays(
      fabricationStartDate,
      reviewDays,
      nonWorkingDays,
    );

    const submittalDueDate = reviewStartDate;

    // Calculate business days from today to required on-site date
    const businessDaysRequired = this.calculateBusinessDays(
      new Date(),
      requiredOnSiteDate,
      nonWorkingDays,
    );

    // Warning threshold: 10 days before required date
    const warningThresholdDate = this.subtractBusinessDays(
      requiredOnSiteDate,
      10,
      nonWorkingDays,
    );

    // Critical if less than total lead time days remaining
    const isCritical = businessDaysRequired < totalDays;

    return {
      requiredOnSiteDate,
      submittalDueDate,
      fabricationStartDate,
      deliveryStartDate,
      reviewStartDate,
      totalDays,
      fabricationDays,
      deliveryDays,
      reviewDays,
      businessDaysRequired,
      warningThresholdDate,
      isCritical,
    };
  }

  /**
   * Get lead time data by spec section or submittal type
   */
  async getLeadTimeData(
    projectId: string,
    specSection?: string,
    submittalType?: SubmittalType,
  ): Promise<SubmittalLeadTime> {
    let leadTime: SubmittalLeadTime | null = null;

    // Try to find by spec section first (most specific)
    if (specSection) {
      leadTime = await this.leadTimeRepository.findOne({
        where: { projectId, specSection },
      });
    }

    // Try to find by submittal type
    if (!leadTime && submittalType) {
      leadTime = await this.leadTimeRepository.findOne({
        where: { projectId, submittalType },
      });
    }

    // Try to find default for project (no spec section or type)
    if (!leadTime) {
      leadTime = await this.leadTimeRepository.findOne({
        where: { projectId, specSection: null as any, submittalType: null as any },
      });
    }

    // Use default values if no configuration found
    if (!leadTime) {
      // Create a temporary default object (not saved to DB)
      const defaultLeadTime = this.leadTimeRepository.create({
        projectId,
        fabricationDays: 30,
        deliveryDays: 10,
        reviewDays: 14,
        totalLeadTimeDays: 54,
      });
      return defaultLeadTime;
    }

    return leadTime;
  }

  /**
   * Create or update lead time configuration
   */
  async createLeadTime(
    projectId: string,
    data: {
      specSection?: string;
      submittalType?: SubmittalType;
      fabricationDays: number;
      deliveryDays: number;
      reviewDays: number;
    },
  ): Promise<SubmittalLeadTime> {
    const totalLeadTimeDays =
      data.fabricationDays + data.deliveryDays + data.reviewDays;

    const leadTime = this.leadTimeRepository.create({
      projectId,
      specSection: data.specSection || null,
      submittalType: data.submittalType || null,
      fabricationDays: data.fabricationDays,
      deliveryDays: data.deliveryDays,
      reviewDays: data.reviewDays,
      totalLeadTimeDays,
    });

    return await this.leadTimeRepository.save(leadTime);
  }

  /**
   * Update lead time configuration
   */
  async updateLeadTime(
    id: string,
    data: Partial<{
      fabricationDays: number;
      deliveryDays: number;
      reviewDays: number;
    }>,
  ): Promise<SubmittalLeadTime> {
    const leadTime = await this.leadTimeRepository.findOne({ where: { id } });
    if (!leadTime) {
      throw new NotFoundException(`Lead time configuration with ID ${id} not found`);
    }

    if (data.fabricationDays !== undefined) {
      leadTime.fabricationDays = data.fabricationDays;
    }
    if (data.deliveryDays !== undefined) {
      leadTime.deliveryDays = data.deliveryDays;
    }
    if (data.reviewDays !== undefined) {
      leadTime.reviewDays = data.reviewDays;
    }

    // Recalculate total
    leadTime.totalLeadTimeDays =
      leadTime.fabricationDays + leadTime.deliveryDays + leadTime.reviewDays;

    return await this.leadTimeRepository.save(leadTime);
  }

  /**
   * Delete lead time configuration
   */
  async deleteLeadTime(id: string): Promise<void> {
    const result = await this.leadTimeRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Lead time configuration with ID ${id} not found`);
    }
  }

  /**
   * Get all lead time configurations for a project
   */
  async getLeadTimesByProject(projectId: string): Promise<SubmittalLeadTime[]> {
    return await this.leadTimeRepository.find({
      where: { projectId },
      order: { specSection: 'ASC' },
    });
  }

  /**
   * Check for submittals with lead time warnings
   */
  async checkLeadTimeWarnings(projectId: string): Promise<LeadTimeWarning[]> {
    // Get all submittals with required on-site dates
    const submittals = await this.submittalRepository.find({
      where: { projectId },
      relations: ['project'],
    });

    const warnings: LeadTimeWarning[] = [];
    const settings = await this.getProjectSettings(projectId);
    const nonWorkingDays = settings?.nonWorkingDays || [0, 6];

    for (const submittal of submittals) {
      if (!submittal.requiredOnSiteDate) continue;

      // Calculate lead time for this submittal
      const leadTimeData = await this.getLeadTimeData(
        projectId,
        submittal.specSection,
        submittal.submittalType,
      );

      const requiredOnSiteDate = new Date(submittal.requiredOnSiteDate);
      const totalLeadTimeDays = leadTimeData.totalLeadTimeDays;

      // Calculate submittal due date
      const submittalDueDate = this.subtractBusinessDays(
        requiredOnSiteDate,
        totalLeadTimeDays,
        nonWorkingDays,
      );

      const today = new Date();
      const daysUntilDue = this.calculateBusinessDays(
        today,
        submittalDueDate,
        nonWorkingDays,
      );
      const daysUntilRequired = this.calculateBusinessDays(
        today,
        requiredOnSiteDate,
        nonWorkingDays,
      );

      // Determine severity
      let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
      if (daysUntilRequired < 0) {
        severity = 'CRITICAL'; // Past required date
      } else if (daysUntilRequired < 10) {
        severity = 'CRITICAL'; // Less than 10 days
      } else if (daysUntilDue < 0) {
        severity = 'HIGH'; // Past submittal due date
      } else if (daysUntilDue < 7) {
        severity = 'HIGH'; // Less than 7 days to submittal due
      } else if (daysUntilRequired < 30) {
        severity = 'MEDIUM'; // Less than 30 days to required date
      }

      // Only include warnings for non-closed submittals with some urgency
      if (
        submittal.status !== 'APPROVED' &&
        submittal.status !== 'CLOSED' &&
        (severity !== 'LOW' || daysUntilDue < 14)
      ) {
        warnings.push({
          submittal,
          daysUntilDue,
          daysOverdue: daysUntilDue < 0 ? Math.abs(daysUntilDue) : 0,
          requiredOnSiteDate,
          submittalDueDate,
          currentStatus: submittal.status,
          severity,
        });
      }
    }

    // Sort by severity and days until due
    return warnings.sort((a, b) => {
      const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return a.daysUntilDue - b.daysUntilDue;
    });
  }

  /**
   * Get critical submittals (those at risk of missing required date)
   */
  async getCriticalSubmittals(projectId: string): Promise<LeadTimeWarning[]> {
    const allWarnings = await this.checkLeadTimeWarnings(projectId);
    return allWarnings.filter(
      (w) => w.severity === 'CRITICAL' || w.severity === 'HIGH',
    );
  }

  /**
   * Calculate business days between two dates, excluding non-working days
   */
  private calculateBusinessDays(
    startDate: Date,
    endDate: Date,
    nonWorkingDays: number[],
  ): number {
    let count = 0;
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (!nonWorkingDays.includes(dayOfWeek)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  /**
   * Subtract business days from a date, excluding non-working days
   */
  private subtractBusinessDays(
    date: Date,
    days: number,
    nonWorkingDays: number[],
  ): Date {
    const result = new Date(date);
    let remaining = days;

    while (remaining > 0) {
      result.setDate(result.getDate() - 1);
      const dayOfWeek = result.getDay();
      if (!nonWorkingDays.includes(dayOfWeek)) {
        remaining--;
      }
    }

    return result;
  }

  /**
   * Add business days to a date, excluding non-working days
   */
  private addBusinessDays(
    date: Date,
    days: number,
    nonWorkingDays: number[],
  ): Date {
    const result = new Date(date);
    let remaining = days;

    while (remaining > 0) {
      result.setDate(result.getDate() + 1);
      const dayOfWeek = result.getDay();
      if (!nonWorkingDays.includes(dayOfWeek)) {
        remaining--;
      }
    }

    return result;
  }

  /**
   * Get project submittal settings
   */
  private async getProjectSettings(
    projectId: string,
  ): Promise<ProjectSubmittalSettings | null> {
    return await this.settingsRepository.findOne({
      where: { projectId },
    });
  }

  /**
   * Validate that a required on-site date is achievable
   */
  async validateRequiredDate(
    projectId: string,
    requiredOnSiteDate: Date,
    specSection?: string,
    submittalType?: SubmittalType,
  ): Promise<{ isAchievable: boolean; daysShort: number; recommendation: string }> {
    const leadTimeData = await this.getLeadTimeData(
      projectId,
      specSection,
      submittalType,
    );

    const settings = await this.getProjectSettings(projectId);
    const nonWorkingDays = settings?.nonWorkingDays || [0, 6];

    const businessDaysAvailable = this.calculateBusinessDays(
      new Date(),
      requiredOnSiteDate,
      nonWorkingDays,
    );

    const isAchievable = businessDaysAvailable >= leadTimeData.totalLeadTimeDays;
    const daysShort = isAchievable
      ? 0
      : leadTimeData.totalLeadTimeDays - businessDaysAvailable;

    let recommendation = '';
    if (!isAchievable) {
      const earliestDate = this.addBusinessDays(
        new Date(),
        leadTimeData.totalLeadTimeDays,
        nonWorkingDays,
      );
      recommendation = `Required on-site date should be at least ${earliestDate.toLocaleDateString()} to meet standard lead times.`;
    }

    return {
      isAchievable,
      daysShort,
      recommendation,
    };
  }
}
