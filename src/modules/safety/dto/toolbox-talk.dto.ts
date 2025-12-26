import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsDate,
  IsOptional,
  IsEnum,
  IsArray,
  IsInt,
  Min,
  MaxLength,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ToolboxTalkStatus,
  AttendanceStatus,
} from '../enums/safety.enum';

/**
 * DTO for creating a toolbox talk
 */
export class CreateToolboxTalkDto {
  @ApiProperty({ description: 'Project ID' })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({ description: 'Safety topic ID (optional)' })
  @IsOptional()
  @IsUUID()
  safetyTopicId?: string;

  @ApiProperty({ description: 'Title of the toolbox talk', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Scheduled date (YYYY-MM-DD)' })
  @IsString()
  scheduledDate: string;

  @ApiPropertyOptional({ description: 'Scheduled time (HH:MM:SS)' })
  @IsOptional()
  @IsString()
  scheduledTime?: string;

  @ApiPropertyOptional({ description: 'Location' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @ApiPropertyOptional({ description: 'Worker IDs to include as attendees' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  workerIds?: string[];
}

/**
 * DTO for updating a toolbox talk
 */
export class UpdateToolboxTalkDto extends PartialType(CreateToolboxTalkDto) {
  @ApiPropertyOptional({ description: 'Status', enum: ToolboxTalkStatus })
  @IsOptional()
  @IsEnum(ToolboxTalkStatus)
  status?: ToolboxTalkStatus;

  @ApiPropertyOptional({ description: 'Topics discussed' })
  @IsOptional()
  @IsString()
  topicsDiscussed?: string;

  @ApiPropertyOptional({ description: 'Key points covered' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keyPoints?: string[];

  @ApiPropertyOptional({ description: 'Questions asked' })
  @IsOptional()
  @IsString()
  questionsAsked?: string;

  @ApiPropertyOptional({ description: 'Concerns raised' })
  @IsOptional()
  @IsString()
  concernsRaised?: string;

  @ApiPropertyOptional({ description: 'Action items' })
  @IsOptional()
  @IsString()
  actionItems?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO for starting a toolbox talk
 */
export class StartToolboxTalkDto {
  @ApiPropertyOptional({ description: 'Actual start time (ISO 8601)' })
  @IsOptional()
  @IsString()
  actualStartTime?: string;

  @ApiPropertyOptional({ description: 'Location' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @ApiPropertyOptional({ description: 'Initial notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO for completing a toolbox talk
 */
export class CompleteToolboxTalkDto {
  @ApiPropertyOptional({ description: 'Actual end time (ISO 8601)' })
  @IsOptional()
  @IsString()
  actualEndTime?: string;

  @ApiProperty({ description: 'Topics discussed' })
  @IsString()
  topicsDiscussed: string;

  @ApiPropertyOptional({ description: 'Key points covered' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keyPoints?: string[];

  @ApiPropertyOptional({ description: 'Questions asked' })
  @IsOptional()
  @IsString()
  questionsAsked?: string;

  @ApiPropertyOptional({ description: 'Concerns raised' })
  @IsOptional()
  @IsString()
  concernsRaised?: string;

  @ApiPropertyOptional({ description: 'Action items' })
  @IsOptional()
  @IsString()
  actionItems?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Signature URL' })
  @IsOptional()
  @IsString()
  signatureUrl?: string;
}

/**
 * DTO for adding attendee to a toolbox talk
 */
export class AddAttendeeDto {
  @ApiProperty({ description: 'Worker ID' })
  @IsUUID()
  workerId: string;

  @ApiPropertyOptional({
    description: 'Attendance status',
    enum: AttendanceStatus,
    default: AttendanceStatus.PRESENT,
  })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO for bulk adding attendees
 */
export class BulkAddAttendeesDto {
  @ApiProperty({ description: 'Array of worker IDs' })
  @IsArray()
  @IsUUID('4', { each: true })
  workerIds: string[];
}

/**
 * DTO for updating attendee
 */
export class UpdateAttendeeDto {
  @ApiPropertyOptional({ description: 'Attendance status', enum: AttendanceStatus })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @ApiPropertyOptional({ description: 'Check-in time (ISO 8601)' })
  @IsOptional()
  @IsString()
  checkInTime?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Worker comments' })
  @IsOptional()
  @IsString()
  workerComments?: string;

  @ApiPropertyOptional({ description: 'Questions asked' })
  @IsOptional()
  @IsString()
  questionsAsked?: string;

  @ApiPropertyOptional({ description: 'Acknowledged' })
  @IsOptional()
  @IsBoolean()
  acknowledged?: boolean;

  @ApiPropertyOptional({ description: 'Signature URL' })
  @IsOptional()
  @IsString()
  signatureUrl?: string;
}

/**
 * DTO for querying toolbox talks
 */
export class QueryToolboxTalksDto {
  @ApiPropertyOptional({ description: 'Project ID filter' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Status filter', enum: ToolboxTalkStatus })
  @IsOptional()
  @IsEnum(ToolboxTalkStatus)
  status?: ToolboxTalkStatus;

  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Conducted by user ID' })
  @IsOptional()
  @IsUUID()
  conductedById?: string;

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
 * Response DTO for toolbox talk
 */
export class ToolboxTalkResponseDto {
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

  @ApiPropertyOptional()
  safetyTopicId?: string;

  @ApiPropertyOptional()
  safetyTopic?: {
    id: string;
    title: string;
    category: string;
  };

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  scheduledDate: Date;

  @ApiPropertyOptional()
  scheduledTime?: string;

  @ApiPropertyOptional()
  actualStartTime?: Date;

  @ApiPropertyOptional()
  actualEndTime?: Date;

  @ApiPropertyOptional()
  durationMinutes?: number;

  @ApiProperty({ enum: ToolboxTalkStatus })
  status: ToolboxTalkStatus;

  @ApiPropertyOptional()
  location?: string;

  @ApiPropertyOptional()
  topicsDiscussed?: string;

  @ApiPropertyOptional()
  keyPoints?: string[];

  @ApiPropertyOptional()
  questionsAsked?: string;

  @ApiPropertyOptional()
  concernsRaised?: string;

  @ApiPropertyOptional()
  actionItems?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  signatureUrl?: string;

  @ApiProperty()
  attendeeCount: number;

  @ApiProperty()
  presentCount: number;

  @ApiProperty()
  absentCount: number;

  @ApiPropertyOptional()
  conductedById?: string;

  @ApiPropertyOptional()
  conductedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
  };

  @ApiPropertyOptional()
  attendees?: AttendeeResponseDto[];

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
 * Response DTO for attendee
 */
export class AttendeeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  toolboxTalkId: string;

  @ApiProperty()
  workerId: string;

  @ApiPropertyOptional()
  worker?: {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    fullName: string;
    trade: string;
    company: string;
  };

  @ApiProperty({ enum: AttendanceStatus })
  status: AttendanceStatus;

  @ApiPropertyOptional()
  checkInTime?: Date;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  workerComments?: string;

  @ApiPropertyOptional()
  questionsAsked?: string;

  @ApiProperty()
  acknowledged: boolean;

  @ApiPropertyOptional()
  acknowledgedAt?: Date;

  @ApiPropertyOptional()
  signatureUrl?: string;

  @ApiProperty()
  createdAt: Date;
}
