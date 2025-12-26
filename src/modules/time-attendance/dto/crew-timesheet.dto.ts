import { IsString, IsUUID, IsArray, IsNumber, IsOptional, IsDateString, Min, Max, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CrewTimesheetStatus } from '../enums/time-attendance.enum';

/**
 * DTO for default cost allocation in crew timesheets
 */
export class DefaultCostAllocationDto {
  @ApiProperty({ description: 'Cost code ID' })
  @IsUUID()
  costCodeId: string;

  @ApiProperty({ example: 100, description: 'Percentage allocated (must sum to 100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;
}

/**
 * DTO for creating a crew timesheet
 */
export class CreateCrewTimesheetDto {
  @ApiProperty({ description: 'Project ID' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ example: '2024-12-22', description: 'Date for crew work (YYYY-MM-DD)' })
  @IsDateString()
  timesheetDate: string;

  @ApiProperty({ type: [String], description: 'Array of worker profile IDs' })
  @IsArray()
  @ArrayMinSize(1, { message: 'Crew must have at least 1 worker' })
  @IsUUID('4', { each: true })
  workerIds: string[];

  @ApiProperty({ example: '08:00:00', description: 'Default clock-in time (HH:MM:SS)' })
  @IsString()
  defaultClockInTime: string;

  @ApiProperty({ example: '17:00:00', description: 'Default clock-out time (HH:MM:SS)' })
  @IsString()
  defaultClockOutTime: string;

  @ApiPropertyOptional({ example: 30, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultBreakMinutes?: number;

  @ApiPropertyOptional({ example: 30, default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultLunchMinutes?: number;

  @ApiPropertyOptional({ type: [DefaultCostAllocationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DefaultCostAllocationDto)
  defaultCostAllocations?: DefaultCostAllocationDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO for updating a crew timesheet
 */
export class UpdateCrewTimesheetDto extends PartialType(CreateCrewTimesheetDto) {
  @ApiPropertyOptional({ description: 'Project ID cannot be changed' })
  @IsOptional()
  projectId?: never;

  @ApiPropertyOptional({ description: 'Timesheet date cannot be changed' })
  @IsOptional()
  timesheetDate?: never;
}

/**
 * DTO for submitting a crew timesheet
 */
export class SubmitCrewTimesheetDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO for approving a crew timesheet
 */
export class ApproveCrewTimesheetDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comments?: string;
}

/**
 * DTO for rejecting a crew timesheet
 */
export class RejectCrewTimesheetDto {
  @ApiProperty({ description: 'Reason for rejection' })
  @IsString()
  rejectionReason: string;
}

/**
 * DTO for querying crew timesheets
 */
export class QueryCrewTimesheetsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  foremanId?: string;

  @ApiPropertyOptional({ enum: CrewTimesheetStatus })
  @IsOptional()
  status?: CrewTimesheetStatus;

  @ApiPropertyOptional({ example: '2024-12-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

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
}

/**
 * Response DTO for crew timesheet
 */
export class CrewTimesheetResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty()
  foremanId: string;

  @ApiProperty()
  timesheetDate: Date;

  @ApiProperty({ type: [String] })
  workerIds: string[];

  @ApiPropertyOptional()
  defaultClockInTime?: string;

  @ApiPropertyOptional()
  defaultClockOutTime?: string;

  @ApiProperty()
  defaultBreakMinutes: number;

  @ApiProperty()
  defaultLunchMinutes: number;

  @ApiPropertyOptional()
  defaultCostAllocations?: Array<{ costCodeId: string; percentage: number }>;

  @ApiProperty({ enum: CrewTimesheetStatus })
  status: CrewTimesheetStatus;

  @ApiPropertyOptional()
  submittedAt?: Date;

  @ApiPropertyOptional()
  submittedById?: string;

  @ApiPropertyOptional()
  approvedById?: string;

  @ApiPropertyOptional()
  approvedAt?: Date;

  @ApiPropertyOptional()
  approvalNotes?: string;

  @ApiPropertyOptional()
  rejectedById?: string;

  @ApiPropertyOptional()
  rejectedAt?: Date;

  @ApiPropertyOptional()
  rejectionReason?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  generatedEntriesCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // Nested relations
  @ApiPropertyOptional()
  project?: {
    id: string;
    name: string;
    projectNumber: string;
  };

  @ApiPropertyOptional()
  foreman?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
  };

  @ApiPropertyOptional()
  approvedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
  };

  // Computed fields
  @ApiProperty()
  canEdit: boolean;

  @ApiProperty()
  canSubmit: boolean;

  @ApiProperty()
  canApprove: boolean;

  @ApiProperty()
  workerCount: number;

  @ApiProperty()
  expectedWorkHours: number;
}
