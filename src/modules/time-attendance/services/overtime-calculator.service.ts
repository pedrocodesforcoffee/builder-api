import { Injectable } from '@nestjs/common';
import { WorkerProfile } from '../entities/worker-profile.entity';
import { TimeEntry } from '../entities/time-entry.entity';
import { OvertimeRule } from '../enums/time-attendance.enum';

/**
 * Result of overtime calculation
 */
export interface OvertimeResult {
  regularHours: number;
  overtimeHours: number;
  doubleTimeHours: number;
  totalHours: number;
}

/**
 * Configuration for custom overtime rules
 */
export interface CustomOvertimeConfig {
  dailyOTHours?: number;      // Hours before daily OT kicks in (e.g., 8)
  dailyDTHours?: number;       // Hours before daily DT kicks in (e.g., 12)
  weeklyOTHours?: number;      // Hours before weekly OT kicks in (e.g., 40)
  otMultiplier?: number;       // OT multiplier (e.g., 1.5)
  dtMultiplier?: number;       // DT multiplier (e.g., 2.0)
  seventhDayRule?: boolean;    // Apply 7th consecutive day rule
}

/**
 * OvertimeCalculatorService
 *
 * Implements multiple overtime calculation engines:
 * - STANDARD: >40 hours weekly = 1.5x OT
 * - CALIFORNIA: >8 daily = 1.5x OT, >12 daily = 2.0x DT, 7th day = 2.0x DT
 * - UNION: Custom rules from worker profile configuration
 * - CONSTRUCTION: Construction-specific rules (similar to standard with minor variations)
 * - CUSTOM: Fully customizable rules from worker profile
 */
@Injectable()
export class OvertimeCalculatorService {
  // Default multipliers
  private readonly DEFAULT_OT_MULTIPLIER = 1.5;
  private readonly DEFAULT_DT_MULTIPLIER = 2.0;

  /**
   * Calculate overtime for a worker based on their time entries
   * @param workerProfile Worker's profile with overtime rule
   * @param entries Array of time entries for the calculation period
   * @param weekStart Start date of the week (for weekly OT calculations)
   * @returns Calculated hours breakdown
   */
  calculateOvertimeForWeek(
    workerProfile: WorkerProfile,
    entries: TimeEntry[],
    weekStart: Date,
  ): OvertimeResult {
    switch (workerProfile.overtimeRule) {
      case OvertimeRule.STANDARD:
        return this.calculateStandard(entries);

      case OvertimeRule.CALIFORNIA:
        return this.calculateCalifornia(entries);

      case OvertimeRule.UNION:
        return this.calculateUnion(workerProfile, entries);

      case OvertimeRule.CONSTRUCTION:
        return this.calculateConstruction(entries);

      case OvertimeRule.CUSTOM:
        return this.calculateCustom(workerProfile, entries);

      default:
        // Default to standard rule
        return this.calculateStandard(entries);
    }
  }

  /**
   * Calculate overtime for a single time entry (daily calculation)
   * Used for real-time updates when clock-out occurs
   */
  calculateOvertimeForEntry(
    workerProfile: WorkerProfile,
    totalHours: number,
    breakMinutes: number,
    lunchMinutes: number,
  ): OvertimeResult {
    // Net worked hours (excluding unpaid lunch)
    const netHours = totalHours - lunchMinutes / 60;

    // For daily rules (like California), calculate based on daily hours
    if (workerProfile.overtimeRule === OvertimeRule.CALIFORNIA) {
      return this.calculateCaliforniaDailyHours(netHours);
    }

    // For custom rules with daily OT config
    if (workerProfile.overtimeRule === OvertimeRule.CUSTOM && workerProfile.overtimeConfig) {
      const config = workerProfile.overtimeConfig as CustomOvertimeConfig;
      if (config.dailyOTHours || config.dailyDTHours) {
        return this.calculateCustomDailyHours(netHours, config);
      }
    }

    // For weekly rules, return all as regular hours (will be recalculated weekly)
    return {
      regularHours: netHours,
      overtimeHours: 0,
      doubleTimeHours: 0,
      totalHours: netHours,
    };
  }

  /**
   * STANDARD overtime rule: >40 hours per week = OT
   */
  private calculateStandard(entries: TimeEntry[]): OvertimeResult {
    const totalHours = entries.reduce((sum, entry) => sum + Number(entry.totalHoursWorked), 0);

    let regularHours = 0;
    let overtimeHours = 0;

    if (totalHours <= 40) {
      regularHours = totalHours;
    } else {
      regularHours = 40;
      overtimeHours = totalHours - 40;
    }

    return {
      regularHours,
      overtimeHours,
      doubleTimeHours: 0,
      totalHours,
    };
  }

  /**
   * CALIFORNIA overtime rule:
   * - >8 hours daily = 1.5x OT
   * - >12 hours daily = 2.0x DT
   * - 7th consecutive day = 2.0x DT (all hours)
   */
  private calculateCalifornia(entries: TimeEntry[]): OvertimeResult {
    let totalRegular = 0;
    let totalOvertime = 0;
    let totalDoubleTime = 0;

    // Check if 7th consecutive day (all entries have same project)
    const sortedEntries = [...entries].sort((a, b) =>
      new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
    );

    sortedEntries.forEach((entry, index) => {
      const netHours = Number(entry.totalHoursWorked) - entry.lunchMinutes / 60;

      // Check if this is 7th consecutive day
      const is7thDay = index === 6 && sortedEntries.length === 7;

      if (is7thDay) {
        // All hours on 7th day are double time
        totalDoubleTime += netHours;
      } else {
        // Normal California daily rules
        const dailyCalc = this.calculateCaliforniaDailyHours(netHours);
        totalRegular += dailyCalc.regularHours;
        totalOvertime += dailyCalc.overtimeHours;
        totalDoubleTime += dailyCalc.doubleTimeHours;
      }
    });

    return {
      regularHours: totalRegular,
      overtimeHours: totalOvertime,
      doubleTimeHours: totalDoubleTime,
      totalHours: totalRegular + totalOvertime + totalDoubleTime,
    };
  }

  /**
   * Calculate California rules for a single day
   */
  private calculateCaliforniaDailyHours(netHours: number): OvertimeResult {
    let regularHours = 0;
    let overtimeHours = 0;
    let doubleTimeHours = 0;

    if (netHours <= 8) {
      regularHours = netHours;
    } else if (netHours <= 12) {
      regularHours = 8;
      overtimeHours = netHours - 8;
    } else {
      regularHours = 8;
      overtimeHours = 4;
      doubleTimeHours = netHours - 12;
    }

    return {
      regularHours,
      overtimeHours,
      doubleTimeHours,
      totalHours: netHours,
    };
  }

  /**
   * UNION overtime rule: Uses custom config from worker profile
   */
  private calculateUnion(workerProfile: WorkerProfile, entries: TimeEntry[]): OvertimeResult {
    // Union rules typically have custom configurations
    const config = workerProfile.overtimeConfig as CustomOvertimeConfig;

    if (!config) {
      // Fall back to standard rule if no config
      return this.calculateStandard(entries);
    }

    return this.calculateCustom(workerProfile, entries);
  }

  /**
   * CONSTRUCTION overtime rule: Similar to standard with minor variations
   * Typically >40 weekly, but may have project-specific rules
   */
  private calculateConstruction(entries: TimeEntry[]): OvertimeResult {
    // Construction typically follows standard federal rules
    // Some states/projects may have daily OT after 8 hours
    const totalHours = entries.reduce((sum, entry) => sum + Number(entry.totalHoursWorked), 0);

    let regularHours = 0;
    let overtimeHours = 0;

    if (totalHours <= 40) {
      regularHours = totalHours;
    } else {
      regularHours = 40;
      overtimeHours = totalHours - 40;
    }

    return {
      regularHours,
      overtimeHours,
      doubleTimeHours: 0,
      totalHours,
    };
  }

  /**
   * CUSTOM overtime rule: Fully configurable from worker profile
   */
  private calculateCustom(workerProfile: WorkerProfile, entries: TimeEntry[]): OvertimeResult {
    const config = workerProfile.overtimeConfig as CustomOvertimeConfig;

    if (!config) {
      return this.calculateStandard(entries);
    }

    // If daily rules are configured, calculate day by day
    if (config.dailyOTHours || config.dailyDTHours) {
      return this.calculateCustomDaily(entries, config);
    }

    // Otherwise, calculate weekly
    return this.calculateCustomWeekly(entries, config);
  }

  /**
   * Calculate custom overtime with daily rules
   */
  private calculateCustomDaily(entries: TimeEntry[], config: CustomOvertimeConfig): OvertimeResult {
    let totalRegular = 0;
    let totalOvertime = 0;
    let totalDoubleTime = 0;

    entries.forEach((entry) => {
      const netHours = Number(entry.totalHoursWorked) - entry.lunchMinutes / 60;
      const dailyCalc = this.calculateCustomDailyHours(netHours, config);

      totalRegular += dailyCalc.regularHours;
      totalOvertime += dailyCalc.overtimeHours;
      totalDoubleTime += dailyCalc.doubleTimeHours;
    });

    return {
      regularHours: totalRegular,
      overtimeHours: totalOvertime,
      doubleTimeHours: totalDoubleTime,
      totalHours: totalRegular + totalOvertime + totalDoubleTime,
    };
  }

  /**
   * Calculate custom daily hours
   */
  private calculateCustomDailyHours(netHours: number, config: CustomOvertimeConfig): OvertimeResult {
    const dailyOTThreshold = config.dailyOTHours || 8;
    const dailyDTThreshold = config.dailyDTHours || 12;

    let regularHours = 0;
    let overtimeHours = 0;
    let doubleTimeHours = 0;

    if (netHours <= dailyOTThreshold) {
      regularHours = netHours;
    } else if (netHours <= dailyDTThreshold) {
      regularHours = dailyOTThreshold;
      overtimeHours = netHours - dailyOTThreshold;
    } else {
      regularHours = dailyOTThreshold;
      overtimeHours = dailyDTThreshold - dailyOTThreshold;
      doubleTimeHours = netHours - dailyDTThreshold;
    }

    return {
      regularHours,
      overtimeHours,
      doubleTimeHours,
      totalHours: netHours,
    };
  }

  /**
   * Calculate custom overtime with weekly rules
   */
  private calculateCustomWeekly(entries: TimeEntry[], config: CustomOvertimeConfig): OvertimeResult {
    const weeklyOTThreshold = config.weeklyOTHours || 40;
    const totalHours = entries.reduce((sum, entry) => sum + Number(entry.totalHoursWorked), 0);

    let regularHours = 0;
    let overtimeHours = 0;

    if (totalHours <= weeklyOTThreshold) {
      regularHours = totalHours;
    } else {
      regularHours = weeklyOTThreshold;
      overtimeHours = totalHours - weeklyOTThreshold;
    }

    return {
      regularHours,
      overtimeHours,
      doubleTimeHours: 0,
      totalHours,
    };
  }

  /**
   * Get overtime multipliers for a worker
   */
  getOvertimeMultipliers(workerProfile: WorkerProfile): { ot: number; dt: number } {
    if (workerProfile.overtimeRule === OvertimeRule.CUSTOM && workerProfile.overtimeConfig) {
      const config = workerProfile.overtimeConfig as CustomOvertimeConfig;
      return {
        ot: config.otMultiplier || this.DEFAULT_OT_MULTIPLIER,
        dt: config.dtMultiplier || this.DEFAULT_DT_MULTIPLIER,
      };
    }

    return {
      ot: this.DEFAULT_OT_MULTIPLIER,
      dt: this.DEFAULT_DT_MULTIPLIER,
    };
  }

  /**
   * Calculate gross pay for a worker based on calculated hours
   */
  calculateGrossPay(
    workerProfile: WorkerProfile,
    result: OvertimeResult,
  ): { regularPay: number; overtimePay: number; doubleTimePay: number; totalPay: number } {
    const baseRate = workerProfile.getEffectiveHourlyRate();
    const multipliers = this.getOvertimeMultipliers(workerProfile);

    const regularPay = result.regularHours * baseRate;
    const overtimePay = result.overtimeHours * baseRate * multipliers.ot;
    const doubleTimePay = result.doubleTimeHours * baseRate * multipliers.dt;

    return {
      regularPay,
      overtimePay,
      doubleTimePay,
      totalPay: regularPay + overtimePay + doubleTimePay,
    };
  }
}
