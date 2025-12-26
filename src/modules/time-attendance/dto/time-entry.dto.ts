import { IsString, IsUUID, IsEnum, IsNumber, IsBoolean, IsOptional, IsDateString, IsArray, Min, Max, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { TimeEntryStatus } from '../enums/time-attendance.enum';

/**
 * DTO for cost code allocation
 */
export class CostAllocationDto {
  @ApiProperty({ description: 'Cost code ID' })
  @IsUUID()
  costCodeId: string;

  @ApiPropertyOptional({ example: 4.5, description: 'Hours allocated to this cost code' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hoursAllocated?: number;

  @ApiPropertyOptional({ example: 50, description: 'Percentage of time allocated (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentageAllocated?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO for creating a time entry manually
 */
export class CreateTimeEntryDto {
  @ApiProperty({ description: 'Worker profile ID' })
  @IsUUID()
  workerId: string;

  @ApiProperty({ description: 'Project ID' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ example: '2024-12-22', description: 'Date of work (YYYY-MM-DD)' })
  @IsDateString()
  entryDate: string;

  @ApiProperty({ example: '2024-12-22T08:00:00Z' })
  @IsDateString()
  clockInTime: string;

  @ApiProperty({ example: '2024-12-22T17:00:00Z' })
  @IsDateString()
  clockOutTime: string;

  @ApiPropertyOptional({ example: 30, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  breakMinutes?: number;

  @ApiPropertyOptional({ example: 30, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lunchMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [CostAllocationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CostAllocationDto)
  costAllocations?: CostAllocationDto[];
}

/**
 * DTO for updating a time entry
 */
export class UpdateTimeEntryDto extends PartialType(CreateTimeEntryDto) {
  @ApiPropertyOptional({ description: 'Worker ID cannot be changed' })
  @IsOptional()
  workerId?: never;

  @ApiPropertyOptional({ description: 'Project ID cannot be changed' })
  @IsOptional()
  projectId?: never;

  @ApiPropertyOptional({ description: 'Entry date cannot be changed' })
  @IsOptional()
  entryDate?: never;
}

/**
 * DTO for querying time entries
 */
export class QueryTimeEntriesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  workerId?: string;

  @ApiPropertyOptional({ enum: TimeEntryStatus })
  @IsOptional()
  @IsEnum(TimeEntryStatus)
  status?: TimeEntryStatus;

  @ApiPropertyOptional({ example: '2024-12-01', description: 'Start date (inclusive)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31', description: 'End date (inclusive)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Only locked entries' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isLocked?: boolean;

  @ApiPropertyOptional({ description: 'Only entries exported to payroll' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  payrollExported?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ enum: ['entryDate', 'createdAt', 'totalHoursWorked'], default: 'entryDate' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * DTO for submitting a time entry for approval
 */
export class SubmitTimeEntryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO for approving a time entry
 */
export class ApproveTimeEntryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comments?: string;
}

/**
 * DTO for rejecting a time entry
 */
export class RejectTimeEntryDto {
  @ApiProperty({ description: 'Reason for rejection' })
  @IsString()
  rejectionReason: string;
}

/**
 * DTO for locking a time entry for payroll
 */
export class LockTimeEntryDto {
  @ApiPropertyOptional({ description: 'Additional notes for locking' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO for bulk time entry operations
 */
export class BulkTimeEntryDto {
  @ApiProperty({ type: [String], description: 'Array of time entry IDs' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  timeEntryIds: string[];

  @ApiProperty({ enum: ['submit', 'approve', 'reject', 'lock'] })
  @IsString()
  action: 'submit' | 'approve' | 'reject' | 'lock';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * DTO for allocating time to cost codes
 */
export class AllocateToCostCodesDto {
  @ApiProperty({ type: [CostAllocationDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CostAllocationDto)
  allocations: CostAllocationDto[];
}

/**
 * Response DTO for time entry with all relations
 */
export class TimeEntryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  workerId: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty()
  entryDate: Date;

  @ApiPropertyOptional()
  clockInTime?: Date;

  @ApiPropertyOptional()
  clockOutTime?: Date;

  @ApiProperty()
  totalHoursWorked: number;

  @ApiProperty()
  regularHours: number;

  @ApiProperty()
  overtimeHours: number;

  @ApiProperty()
  doubleTimeHours: number;

  @ApiProperty()
  breakMinutes: number;

  @ApiProperty()
  lunchMinutes: number;

  @ApiProperty({ enum: TimeEntryStatus })
  status: TimeEntryStatus;

  @ApiPropertyOptional()
  submittedAt?: Date;

  @ApiPropertyOptional()
  submittedById?: string;

  @ApiPropertyOptional()
  approvedById?: string;

  @ApiPropertyOptional()
  approvedAt?: Date;

  @ApiPropertyOptional()
  rejectedById?: string;

  @ApiPropertyOptional()
  rejectedAt?: Date;

  @ApiPropertyOptional()
  rejectionReason?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  isLocked: boolean;

  @ApiPropertyOptional()
  lockedAt?: Date;

  @ApiPropertyOptional()
  lockedById?: string;

  @ApiPropertyOptional()
  payrollExportedAt?: Date;

  @ApiPropertyOptional()
  crewTimesheetId?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // Nested relations
  @ApiPropertyOptional({ description: 'Worker profile details' })
  worker?: {
    id: string;
    userId: string;
    trade: string;
    hourlyRate: number;
    user: {
      firstName: string;
      lastName: string;
      fullName: string;
    };
  };

  @ApiPropertyOptional({ description: 'Project details' })
  project?: {
    id: string;
    name: string;
    projectNumber: string;
  };

  @ApiPropertyOptional({ type: [Object], description: 'Clock events' })
  clockEvents?: any[];

  @ApiPropertyOptional({ type: [Object], description: 'Cost allocations' })
  costAllocations?: any[];

  // Computed fields
  @ApiProperty({ description: 'Whether entry can be edited' })
  canEdit: boolean;

  @ApiProperty({ description: 'Whether entry can be submitted' })
  canSubmit: boolean;

  @ApiProperty({ description: 'Whether entry can be approved' })
  canApprove: boolean;

  @ApiProperty({ description: 'Whether entry can be locked' })
  canLock: boolean;
}

/**
 * Paginated response for time entries
 */
export class PaginatedTimeEntriesDto {
  @ApiProperty({ type: [TimeEntryResponseDto] })
  data: TimeEntryResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
