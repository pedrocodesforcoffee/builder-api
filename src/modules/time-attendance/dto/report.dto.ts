import { IsString, IsUUID, IsEnum, IsNumber, IsOptional, IsDateString, IsArray, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PayrollExportFormat } from '../enums/time-attendance.enum';

/**
 * DTO for daily attendance report query
 */
export class DailyReportQueryDto {
  @ApiProperty({ description: 'Project ID' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ example: '2024-12-22', description: 'Report date (YYYY-MM-DD)' })
  @IsDateString()
  reportDate: string;

  @ApiPropertyOptional({ description: 'Include only approved entries' })
  @IsOptional()
  includeOnlyApproved?: boolean;
}

/**
 * DTO for weekly report query
 */
export class WeeklyReportQueryDto {
  @ApiProperty({ description: 'Project ID' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ example: '2024-12-16', description: 'Week start date (Monday)' })
  @IsDateString()
  weekStartDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  workerId?: string;

  @ApiPropertyOptional({ description: 'Include only approved entries' })
  @IsOptional()
  includeOnlyApproved?: boolean;
}

/**
 * DTO for payroll export configuration
 */
export class PayrollExportDto {
  @ApiProperty({ description: 'Project ID' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ example: '2024-12-01', description: 'Pay period start date' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2024-12-15', description: 'Pay period end date' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ enum: PayrollExportFormat, default: PayrollExportFormat.CSV })
  @IsEnum(PayrollExportFormat)
  format: PayrollExportFormat;

  @ApiPropertyOptional({ description: 'Include only locked entries' })
  @IsOptional()
  includeOnlyLocked?: boolean;

  @ApiPropertyOptional({ description: 'Auto-lock entries after export' })
  @IsOptional()
  autoLock?: boolean;
}

/**
 * DTO for certified payroll report (WH-347 form)
 */
export class CertifiedPayrollDto {
  @ApiProperty({ description: 'Project ID' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ example: '2024-12-01', description: 'Payroll week start date' })
  @IsDateString()
  weekStartDate: string;

  @ApiPropertyOptional({ description: 'Include deductions breakdown' })
  @IsOptional()
  includeDeductions?: boolean;

  @ApiPropertyOptional({ description: 'Include fringe benefits detail' })
  @IsOptional()
  includeFringeBenefits?: boolean;
}

/**
 * Response DTO for daily attendance report
 */
export class DailyReportResponseDto {
  @ApiProperty()
  projectId: string;

  @ApiProperty()
  projectName: string;

  @ApiProperty()
  reportDate: Date;

  @ApiProperty()
  totalWorkers: number;

  @ApiProperty()
  totalRegularHours: number;

  @ApiProperty()
  totalOvertimeHours: number;

  @ApiProperty()
  totalDoubleTimeHours: number;

  @ApiProperty()
  totalHoursWorked: number;

  @ApiProperty({ type: [Object], description: 'Worker details with time entries' })
  workers: Array<{
    workerId: string;
    workerName: string;
    trade: string;
    clockInTime: Date;
    clockOutTime: Date;
    regularHours: number;
    overtimeHours: number;
    doubleTimeHours: number;
    totalHours: number;
    status: string;
  }>;

  @ApiProperty()
  generatedAt: Date;
}

/**
 * Response DTO for weekly report
 */
export class WeeklyReportResponseDto {
  @ApiProperty()
  projectId: string;

  @ApiProperty()
  projectName: string;

  @ApiProperty()
  weekStartDate: Date;

  @ApiProperty()
  weekEndDate: Date;

  @ApiProperty()
  totalWorkers: number;

  @ApiProperty()
  totalRegularHours: number;

  @ApiProperty()
  totalOvertimeHours: number;

  @ApiProperty()
  totalDoubleTimeHours: number;

  @ApiProperty()
  totalHoursWorked: number;

  @ApiProperty({ type: [Object], description: 'Daily breakdown' })
  dailyBreakdown: Array<{
    date: Date;
    totalWorkers: number;
    totalHours: number;
    regularHours: number;
    overtimeHours: number;
    doubleTimeHours: number;
  }>;

  @ApiProperty({ type: [Object], description: 'Worker summary' })
  workerSummary: Array<{
    workerId: string;
    workerName: string;
    trade: string;
    daysWorked: number;
    totalHours: number;
    regularHours: number;
    overtimeHours: number;
    doubleTimeHours: number;
    averageHoursPerDay: number;
  }>;

  @ApiProperty()
  generatedAt: Date;
}

/**
 * Response DTO for payroll export
 */
export class PayrollExportResponseDto {
  @ApiProperty()
  projectId: string;

  @ApiProperty()
  projectName: string;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty({ enum: PayrollExportFormat })
  format: PayrollExportFormat;

  @ApiProperty()
  totalEntries: number;

  @ApiProperty()
  totalWorkers: number;

  @ApiProperty()
  totalRegularHours: number;

  @ApiProperty()
  totalOvertimeHours: number;

  @ApiProperty()
  totalDoubleTimeHours: number;

  @ApiProperty()
  totalGrossPay: number;

  @ApiProperty({ description: 'Payroll data in requested format (CSV string, JSON array, etc.)' })
  data: string | any[];

  @ApiProperty({ description: 'Filename for download' })
  filename: string;

  @ApiProperty()
  exportedAt: Date;

  @ApiProperty({ description: 'IDs of locked time entries' })
  lockedEntryIds: string[];
}

/**
 * Response DTO for certified payroll report (WH-347)
 */
export class CertifiedPayrollResponseDto {
  @ApiProperty()
  projectId: string;

  @ApiProperty()
  projectName: string;

  @ApiProperty()
  contractNumber: string;

  @ApiProperty()
  weekStartDate: Date;

  @ApiProperty()
  weekEndDate: Date;

  @ApiProperty({ type: [Object], description: 'Worker payroll data' })
  workers: Array<{
    name: string;
    classification: string;
    hoursWorked: {
      monday: number;
      tuesday: number;
      wednesday: number;
      thursday: number;
      friday: number;
      saturday: number;
      sunday: number;
      total: number;
    };
    rateOfPay: {
      straightTime: number;
      overtime: number;
      doubleTime: number;
    };
    grossEarned: {
      straightTime: number;
      overtime: number;
      doubleTime: number;
      total: number;
    };
    fringeBenefits: {
      amount: number;
      type: string;
    };
    deductions: {
      federalTax: number;
      stateTax: number;
      fica: number;
      other: number;
      total: number;
    };
    netWages: number;
  }>;

  @ApiProperty()
  generatedAt: Date;
}

/**
 * DTO for time entry statistics
 */
export class TimeEntryStatsDto {
  @ApiProperty()
  totalEntries: number;

  @ApiProperty()
  byStatus: Record<string, number>;

  @ApiProperty()
  totalHours: number;

  @ApiProperty()
  regularHours: number;

  @ApiProperty()
  overtimeHours: number;

  @ApiProperty()
  doubleTimeHours: number;

  @ApiProperty()
  averageHoursPerEntry: number;

  @ApiProperty()
  uniqueWorkers: number;

  @ApiProperty()
  uniqueProjects: number;
}
