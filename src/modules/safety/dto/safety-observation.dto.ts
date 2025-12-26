import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsArray,
  IsInt,
  Min,
  MaxLength,
  IsBoolean,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ObservationSeverity,
  ObservationStatus,
  SafetyTopicCategory,
  ActionStatus,
} from '../enums/safety.enum';

/**
 * DTO for creating a safety observation
 */
export class CreateSafetyObservationDto {
  @ApiProperty({ description: 'Project ID' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ description: 'Title', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  title: string;

  @ApiProperty({ description: 'Description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Severity', enum: ObservationSeverity })
  @IsEnum(ObservationSeverity)
  severity: ObservationSeverity;

  @ApiPropertyOptional({ description: 'Category', enum: SafetyTopicCategory })
  @IsOptional()
  @IsEnum(SafetyTopicCategory)
  category?: SafetyTopicCategory;

  @ApiProperty({ description: 'Observation date (YYYY-MM-DD)' })
  @IsString()
  observationDate: string;

  @ApiPropertyOptional({ description: 'Observation time (HH:MM:SS)' })
  @IsOptional()
  @IsString()
  observationTime?: string;

  @ApiPropertyOptional({ description: 'Location' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @ApiPropertyOptional({ description: 'Latitude' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Immediate action taken' })
  @IsOptional()
  @IsString()
  immediateActionTaken?: string;

  @ApiPropertyOptional({ description: 'Work stopped' })
  @IsOptional()
  @IsBoolean()
  workStopped?: boolean;

  @ApiPropertyOptional({ description: 'Requires follow-up' })
  @IsOptional()
  @IsBoolean()
  requiresFollowUp?: boolean;

  @ApiPropertyOptional({ description: 'Target resolution date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  targetResolutionDate?: string;

  @ApiPropertyOptional({ description: 'Assigned to user ID' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}

/**
 * DTO for updating a safety observation
 */
export class UpdateSafetyObservationDto extends PartialType(
  CreateSafetyObservationDto
) {
  @ApiPropertyOptional({ description: 'Status', enum: ObservationStatus })
  @IsOptional()
  @IsEnum(ObservationStatus)
  status?: ObservationStatus;

  @ApiPropertyOptional({ description: 'Root cause' })
  @IsOptional()
  @IsString()
  rootCause?: string;

  @ApiPropertyOptional({ description: 'Resolution notes' })
  @IsOptional()
  @IsString()
  resolutionNotes?: string;

  @ApiPropertyOptional({ description: 'Actual resolution date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  actualResolutionDate?: string;
}

/**
 * DTO for resolving an observation
 */
export class ResolveObservationDto {
  @ApiProperty({ description: 'Root cause' })
  @IsString()
  rootCause: string;

  @ApiProperty({ description: 'Resolution notes' })
  @IsString()
  resolutionNotes: string;

  @ApiPropertyOptional({ description: 'Actual resolution date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  actualResolutionDate?: string;
}

/**
 * DTO for verifying an observation
 */
export class VerifyObservationDto {
  @ApiPropertyOptional({ description: 'Verification notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO for closing an observation
 */
export class CloseObservationDto {
  @ApiPropertyOptional({ description: 'Closing notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO for creating a corrective action
 */
export class CreateObservationActionDto {
  @ApiProperty({ description: 'Observation ID' })
  @IsUUID()
  observationId: string;

  @ApiProperty({ description: 'Action description', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiPropertyOptional({ description: 'Priority (1-5)', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  priority?: number;

  @ApiPropertyOptional({ description: 'Assigned to user ID' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'Due date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  dueDate?: string;
}

/**
 * DTO for updating a corrective action
 */
export class UpdateObservationActionDto extends PartialType(
  CreateObservationActionDto
) {
  @ApiPropertyOptional({ description: 'Status', enum: ActionStatus })
  @IsOptional()
  @IsEnum(ActionStatus)
  status?: ActionStatus;

  @ApiPropertyOptional({ description: 'Completion notes' })
  @IsOptional()
  @IsString()
  completionNotes?: string;

  @ApiPropertyOptional({ description: 'Completed date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  completedDate?: string;
}

/**
 * DTO for completing an action
 */
export class CompleteActionDto {
  @ApiProperty({ description: 'Completion notes' })
  @IsString()
  completionNotes: string;

  @ApiPropertyOptional({ description: 'Completed date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  completedDate?: string;
}

/**
 * DTO for verifying an action
 */
export class VerifyActionDto {
  @ApiPropertyOptional({ description: 'Verification notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO for querying observations
 */
export class QueryObservationsDto {
  @ApiPropertyOptional({ description: 'Project ID filter' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Severity filter', enum: ObservationSeverity })
  @IsOptional()
  @IsEnum(ObservationSeverity)
  severity?: ObservationSeverity;

  @ApiPropertyOptional({ description: 'Status filter', enum: ObservationStatus })
  @IsOptional()
  @IsEnum(ObservationStatus)
  status?: ObservationStatus;

  @ApiPropertyOptional({ description: 'Category filter', enum: SafetyTopicCategory })
  @IsOptional()
  @IsEnum(SafetyTopicCategory)
  category?: SafetyTopicCategory;

  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Observed by user ID' })
  @IsOptional()
  @IsUUID()
  observedById?: string;

  @ApiPropertyOptional({ description: 'Assigned to user ID' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'Show overdue only' })
  @IsOptional()
  @IsBoolean()
  overdueOnly?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

/**
 * Response DTO for safety observation
 */
export class SafetyObservationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  projectId: string;

  @ApiPropertyOptional()
  project?: {
    id: string;
    name: string;
    number: string;
  };

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: ObservationSeverity })
  severity: ObservationSeverity;

  @ApiPropertyOptional({ enum: SafetyTopicCategory })
  category?: SafetyTopicCategory;

  @ApiProperty({ enum: ObservationStatus })
  status: ObservationStatus;

  @ApiProperty()
  observationDate: Date;

  @ApiPropertyOptional()
  observationTime?: string;

  @ApiPropertyOptional()
  location?: string;

  @ApiPropertyOptional()
  latitude?: number;

  @ApiPropertyOptional()
  longitude?: number;

  @ApiPropertyOptional()
  immediateActionTaken?: string;

  @ApiProperty()
  workStopped: boolean;

  @ApiProperty()
  requiresFollowUp: boolean;

  @ApiPropertyOptional()
  targetResolutionDate?: Date;

  @ApiPropertyOptional()
  actualResolutionDate?: Date;

  @ApiPropertyOptional()
  rootCause?: string;

  @ApiPropertyOptional()
  resolutionNotes?: string;

  @ApiProperty()
  observedById: string;

  @ApiPropertyOptional()
  observedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
  };

  @ApiPropertyOptional()
  assignedToId?: string;

  @ApiPropertyOptional()
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
  };

  @ApiPropertyOptional()
  verifiedById?: string;

  @ApiPropertyOptional()
  verifiedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
  };

  @ApiPropertyOptional()
  verifiedAt?: Date;

  @ApiPropertyOptional()
  closedById?: string;

  @ApiPropertyOptional()
  closedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
  };

  @ApiPropertyOptional()
  closedAt?: Date;

  @ApiPropertyOptional()
  actions?: ObservationActionResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  createdById: string;

  @ApiPropertyOptional()
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
  };
}

/**
 * Response DTO for observation action
 */
export class ObservationActionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  observationId: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: ActionStatus })
  status: ActionStatus;

  @ApiProperty()
  priority: number;

  @ApiPropertyOptional()
  assignedToId?: string;

  @ApiPropertyOptional()
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
  };

  @ApiPropertyOptional()
  dueDate?: Date;

  @ApiPropertyOptional()
  completedDate?: Date;

  @ApiPropertyOptional()
  completionNotes?: string;

  @ApiPropertyOptional()
  completedById?: string;

  @ApiPropertyOptional()
  completedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
  };

  @ApiPropertyOptional()
  verifiedById?: string;

  @ApiPropertyOptional()
  verifiedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
  };

  @ApiPropertyOptional()
  verifiedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
