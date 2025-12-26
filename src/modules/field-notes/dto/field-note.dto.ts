import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsDate,
  IsNumber,
  MaxLength,
  Min,
  Max,
  ValidateNested,
  IsDateString,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  FieldNoteType,
  FieldNoteVisibility,
  FieldNotePriority,
  FieldNoteStatus,
  LinkedEntityType,
  WeatherCondition,
} from '../enums/field-note.enum';

/**
 * DTO for creating a field note
 */
export class CreateFieldNoteDto {
  @ApiProperty({ description: 'Note type', enum: FieldNoteType })
  @IsEnum(FieldNoteType)
  noteType: FieldNoteType;

  @ApiProperty({ description: 'Title/subject', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ description: 'Detailed description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Date of observation (YYYY-MM-DD)' })
  @IsDateString()
  noteDate: string;

  @ApiPropertyOptional({ description: 'Time of observation (HH:MM:SS)' })
  @IsOptional()
  @IsString()
  noteTime?: string;

  @ApiPropertyOptional({
    description: 'Visibility level',
    enum: FieldNoteVisibility,
    default: FieldNoteVisibility.TEAM,
  })
  @IsOptional()
  @IsEnum(FieldNoteVisibility)
  visibility?: FieldNoteVisibility;

  @ApiPropertyOptional({
    description: 'Priority level',
    enum: FieldNotePriority,
    default: FieldNotePriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(FieldNotePriority)
  priority?: FieldNotePriority;

  @ApiPropertyOptional({ description: 'GPS latitude' })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ description: 'GPS longitude' })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ description: 'GPS accuracy in meters' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  gpsAccuracy?: number;

  @ApiPropertyOptional({ description: 'Location description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  locationDescription?: string;

  @ApiPropertyOptional({ description: 'Tags for organization' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'User IDs to mention' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  mentionedUserIds?: string[];

  @ApiPropertyOptional({ description: 'Weather data' })
  @IsOptional()
  @IsObject()
  weatherData?: {
    condition?: WeatherCondition;
    temperature?: number;
    temperatureUnit?: 'F' | 'C';
    windSpeed?: number;
    windSpeedUnit?: 'mph' | 'kmh';
    precipitation?: number;
    humidity?: number;
    notes?: string;
  };

  @ApiPropertyOptional({ description: 'Template ID to use' })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Template data (filled fields)' })
  @IsOptional()
  @IsObject()
  templateData?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Follow-up required flag' })
  @IsOptional()
  @IsBoolean()
  followUpRequired?: boolean;

  @ApiPropertyOptional({ description: 'Follow-up due date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  followUpDueDate?: string;

  @ApiPropertyOptional({ description: 'User ID to assign follow-up' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'Client-generated UUID for offline sync' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for updating a field note
 */
export class UpdateFieldNoteDto extends PartialType(CreateFieldNoteDto) {
  @ApiPropertyOptional({ description: 'Status', enum: FieldNoteStatus })
  @IsOptional()
  @IsEnum(FieldNoteStatus)
  status?: FieldNoteStatus;

  @ApiPropertyOptional({ description: 'Follow-up completion notes' })
  @IsOptional()
  @IsString()
  followUpNotes?: string;
}

/**
 * DTO for querying field notes with filters and pagination
 */
export class QueryFieldNotesDto {
  @ApiPropertyOptional({ description: 'Project ID filter' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Note type filter', enum: FieldNoteType })
  @IsOptional()
  @IsEnum(FieldNoteType)
  noteType?: FieldNoteType;

  @ApiPropertyOptional({ description: 'Status filter', enum: FieldNoteStatus })
  @IsOptional()
  @IsEnum(FieldNoteStatus)
  status?: FieldNoteStatus;

  @ApiPropertyOptional({ description: 'Visibility filter', enum: FieldNoteVisibility })
  @IsOptional()
  @IsEnum(FieldNoteVisibility)
  visibility?: FieldNoteVisibility;

  @ApiPropertyOptional({ description: 'Priority filter', enum: FieldNotePriority })
  @IsOptional()
  @IsEnum(FieldNotePriority)
  priority?: FieldNotePriority;

  @ApiPropertyOptional({ description: 'Created by user ID' })
  @IsOptional()
  @IsUUID()
  createdById?: string;

  @ApiPropertyOptional({ description: 'Assigned to user ID' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'Start date filter (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date filter (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Tags filter (match any)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Follow-up required only' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  followUpRequiredOnly?: boolean;

  @ApiPropertyOptional({ description: 'Overdue follow-ups only' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  overdueOnly?: boolean;

  @ApiPropertyOptional({ description: 'Full-text search query' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Include deleted notes' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeDeleted?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Sort field', default: 'noteDate' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * DTO for adding an attachment
 */
export class AddAttachmentDto {
  @ApiProperty({ description: 'Attachment type' })
  @IsEnum(['PHOTO', 'VIDEO', 'AUDIO', 'DOCUMENT', 'SKETCH', 'PDF', 'OTHER'])
  attachmentType: string;

  @ApiProperty({ description: 'Filename' })
  @IsString()
  @MaxLength(500)
  filename: string;

  @ApiProperty({ description: 'File URL' })
  @IsString()
  @MaxLength(1000)
  url: string;

  @ApiPropertyOptional({ description: 'Thumbnail URL' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: 'File size in bytes' })
  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @ApiPropertyOptional({ description: 'MIME type' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ description: 'S3 bucket' })
  @IsOptional()
  @IsString()
  s3Bucket?: string;

  @ApiPropertyOptional({ description: 'S3 key' })
  @IsOptional()
  @IsString()
  s3Key?: string;

  @ApiPropertyOptional({ description: 'Caption' })
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiPropertyOptional({ description: 'GPS latitude' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'GPS longitude' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Metadata (EXIF, markup, etc.)' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for adding a link to another entity
 */
export class AddLinkDto {
  @ApiProperty({ description: 'Entity type', enum: LinkedEntityType })
  @IsEnum(LinkedEntityType)
  linkedEntityType: LinkedEntityType;

  @ApiProperty({ description: 'Entity ID' })
  @IsUUID()
  linkedEntityId: string;

  @ApiPropertyOptional({ description: 'Entity title (cached)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  linkedEntityTitle?: string;

  @ApiPropertyOptional({ description: 'Link description' })
  @IsOptional()
  @IsString()
  linkDescription?: string;

  @ApiPropertyOptional({ description: 'Link metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for adding a comment
 */
export class AddCommentDto {
  @ApiProperty({ description: 'Comment content' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Visibility', enum: ['PUBLIC', 'TEAM', 'PRIVATE', 'INTERNAL'] })
  @IsOptional()
  @IsEnum(['PUBLIC', 'TEAM', 'PRIVATE', 'INTERNAL'])
  visibility?: string;

  @ApiPropertyOptional({ description: 'Parent comment ID (for replies)' })
  @IsOptional()
  @IsUUID()
  parentCommentId?: string;

  @ApiPropertyOptional({ description: 'User IDs to mention' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  mentionedUserIds?: string[];

  @ApiPropertyOptional({ description: 'Attachments' })
  @IsOptional()
  @IsArray()
  attachments?: Array<{
    url: string;
    filename: string;
    fileSize?: number;
    mimeType?: string;
  }>;
}

/**
 * DTO for bulk sync (offline mode)
 */
export class BulkSyncDto {
  @ApiProperty({ description: 'Array of field notes to sync' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFieldNoteDto)
  notes: CreateFieldNoteDto[];
}

/**
 * Response DTO for field note
 */
export class FieldNoteResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  number: string;

  @ApiProperty({ enum: FieldNoteType })
  noteType: FieldNoteType;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  noteDate: Date;

  @ApiPropertyOptional()
  noteTime?: string;

  @ApiProperty({ enum: FieldNoteVisibility })
  visibility: FieldNoteVisibility;

  @ApiProperty({ enum: FieldNotePriority })
  priority: FieldNotePriority;

  @ApiProperty({ enum: FieldNoteStatus })
  status: FieldNoteStatus;

  @ApiPropertyOptional()
  latitude?: number;

  @ApiPropertyOptional()
  longitude?: number;

  @ApiPropertyOptional()
  gpsAccuracy?: number;

  @ApiPropertyOptional()
  locationDescription?: string;

  @ApiProperty()
  tags: string[];

  @ApiProperty()
  mentionedUserIds: string[];

  @ApiPropertyOptional()
  weatherData?: any;

  @ApiPropertyOptional()
  templateId?: string;

  @ApiPropertyOptional()
  templateData?: any;

  @ApiProperty()
  followUpRequired: boolean;

  @ApiPropertyOptional()
  followUpDueDate?: Date;

  @ApiPropertyOptional()
  assignedToId?: string;

  @ApiPropertyOptional()
  followUpCompletedAt?: Date;

  @ApiPropertyOptional()
  followUpNotes?: string;

  @ApiPropertyOptional()
  clientId?: string;

  @ApiPropertyOptional()
  syncedAt?: Date;

  @ApiPropertyOptional()
  metadata?: any;

  @ApiProperty()
  isDeleted: boolean;

  @ApiProperty()
  projectId: string;

  @ApiProperty()
  createdById: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
  };

  @ApiPropertyOptional()
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
  };

  @ApiPropertyOptional()
  attachments?: any[];

  @ApiPropertyOptional()
  links?: any[];

  @ApiPropertyOptional()
  comments?: any[];
}
