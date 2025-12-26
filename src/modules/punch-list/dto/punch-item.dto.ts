import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsDateString,
  IsNumber,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PunchItemStatus,
  PunchItemPriority,
  PunchItemCategory,
  BallInCourt,
} from '../enums/punch-list.enum';

/**
 * DTO for creating a new punch item
 */
export class CreatePunchItemDto {
  @ApiProperty({
    description: 'Punch list ID',
    example: 'uuid-of-punch-list',
  })
  @IsUUID()
  punchListId: string;

  @ApiProperty({
    description: 'Project ID',
    example: 'a6074e71-6f3f-40c0-a201-1e87b238df81',
  })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({
    description: 'Location ID',
    example: 'uuid-of-location',
  })
  @IsUUID()
  @IsOptional()
  locationId?: string;

  @ApiProperty({
    description: 'Item description',
    example: 'Paint touchup required on north wall',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Priority level',
    enum: PunchItemPriority,
    example: PunchItemPriority.HIGH,
  })
  @IsEnum(PunchItemPriority)
  priority: PunchItemPriority;

  @ApiProperty({
    description: 'Item category',
    enum: PunchItemCategory,
    example: PunchItemCategory.FINISHES,
  })
  @IsEnum(PunchItemCategory)
  category: PunchItemCategory;

  @ApiPropertyOptional({
    description: 'Trade responsible',
    example: 'Painting',
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  trade?: string;

  @ApiPropertyOptional({
    description: 'Responsible company',
    example: 'ABC Painting Co',
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  responsibleCompany?: string;

  @ApiPropertyOptional({
    description: 'Assigned user ID',
  })
  @IsUUID()
  @IsOptional()
  assignedToId?: string;

  @ApiPropertyOptional({
    description: 'Cost code',
    example: '09-9000',
  })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  costCode?: string;

  @ApiPropertyOptional({
    description: 'Due date',
    example: '2025-02-15',
  })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({
    description: 'Estimated cost',
    example: 500.00,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  estimatedCost?: number;

  @ApiPropertyOptional({
    description: 'Estimated hours',
    example: 4,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  estimatedHours?: number;

  @ApiPropertyOptional({
    description: 'Ball in court',
    enum: BallInCourt,
    example: BallInCourt.SUBCONTRACTOR,
  })
  @IsEnum(BallInCourt)
  @IsOptional()
  ballInCourt?: BallInCourt;
}

/**
 * DTO for updating a punch item
 */
export class UpdatePunchItemDto extends PartialType(CreatePunchItemDto) {
  @ApiPropertyOptional({
    description: 'Resolution notes',
  })
  @IsString()
  @IsOptional()
  resolutionNotes?: string;

  @ApiPropertyOptional({
    description: 'Actual cost',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  actualCost?: number;

  @ApiPropertyOptional({
    description: 'Actual hours',
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  actualHours?: number;
}

/**
 * DTO for workflow actions
 */
export class ChangeStatusDto {
  @ApiProperty({
    description: 'New status',
    enum: PunchItemStatus,
  })
  @IsEnum(PunchItemStatus)
  status: PunchItemStatus;

  @ApiPropertyOptional({
    description: 'Comment/note for this status change',
  })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiPropertyOptional({
    description: 'Resolution notes (for completion)',
  })
  @IsString()
  @IsOptional()
  resolutionNotes?: string;

  @ApiPropertyOptional({
    description: 'Rejection reason (for rejection)',
  })
  @IsString()
  @IsOptional()
  rejectionReason?: string;
}

/**
 * DTO for assigning punch item
 */
export class AssignPunchItemDto {
  @ApiProperty({
    description: 'User ID to assign to',
  })
  @IsUUID()
  assignedToId: string;

  @ApiPropertyOptional({
    description: 'Comment for assignment',
  })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiPropertyOptional({
    description: 'Due date for assignment',
  })
  @IsDateString()
  @IsOptional()
  dueDate?: string;
}

/**
 * DTO for adding comment
 */
export class AddCommentDto {
  @ApiProperty({
    description: 'Comment text',
  })
  @IsString()
  comment: string;
}

/**
 * DTO for querying punch items with advanced filters
 */
export class QueryPunchItemsDto {
  @ApiPropertyOptional({
    description: 'Filter by punch list ID',
  })
  @IsUUID()
  @IsOptional()
  punchListId?: string;

  @ApiPropertyOptional({
    description: 'Filter by project ID',
  })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Filter by location ID',
  })
  @IsUUID()
  @IsOptional()
  locationId?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: PunchItemStatus,
  })
  @IsEnum(PunchItemStatus)
  @IsOptional()
  status?: PunchItemStatus;

  @ApiPropertyOptional({
    description: 'Filter by priority',
    enum: PunchItemPriority,
  })
  @IsEnum(PunchItemPriority)
  @IsOptional()
  priority?: PunchItemPriority;

  @ApiPropertyOptional({
    description: 'Filter by category',
    enum: PunchItemCategory,
  })
  @IsEnum(PunchItemCategory)
  @IsOptional()
  category?: PunchItemCategory;

  @ApiPropertyOptional({
    description: 'Filter by ball in court',
    enum: BallInCourt,
  })
  @IsEnum(BallInCourt)
  @IsOptional()
  ballInCourt?: BallInCourt;

  @ApiPropertyOptional({
    description: 'Filter by assigned user ID',
  })
  @IsUUID()
  @IsOptional()
  assignedToId?: string;

  @ApiPropertyOptional({
    description: 'Filter by trade',
  })
  @IsString()
  @IsOptional()
  trade?: string;

  @ApiPropertyOptional({
    description: 'Filter by responsible company',
  })
  @IsString()
  @IsOptional()
  responsibleCompany?: string;

  @ApiPropertyOptional({
    description: 'Show only overdue items',
  })
  @Type(() => Boolean)
  @IsOptional()
  overdue?: boolean;

  @ApiPropertyOptional({
    description: 'Search in description',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Include photos',
  })
  @Type(() => Boolean)
  @IsOptional()
  includePhotos?: boolean;

  @ApiPropertyOptional({
    description: 'Include history',
  })
  @Type(() => Boolean)
  @IsOptional()
  includeHistory?: boolean;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'createdAt',
  })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  @IsString()
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 50,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 50;
}

/**
 * DTO for bulk operations
 */
export class BulkUpdatePunchItemsDto {
  @ApiProperty({
    description: 'Array of punch item IDs',
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  itemIds: string[];

  @ApiPropertyOptional({
    description: 'Status to set',
    enum: PunchItemStatus,
  })
  @IsEnum(PunchItemStatus)
  @IsOptional()
  status?: PunchItemStatus;

  @ApiPropertyOptional({
    description: 'Priority to set',
    enum: PunchItemPriority,
  })
  @IsEnum(PunchItemPriority)
  @IsOptional()
  priority?: PunchItemPriority;

  @ApiPropertyOptional({
    description: 'User to assign to',
  })
  @IsUUID()
  @IsOptional()
  assignedToId?: string;

  @ApiPropertyOptional({
    description: 'Due date to set',
  })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({
    description: 'Ball in court to set',
    enum: BallInCourt,
  })
  @IsEnum(BallInCourt)
  @IsOptional()
  ballInCourt?: BallInCourt;

  @ApiPropertyOptional({
    description: 'Comment for bulk update',
  })
  @IsString()
  @IsOptional()
  comment?: string;
}

/**
 * DTO for photo upload
 */
export class UploadPhotoDto {
  @ApiProperty({
    description: 'Photo type',
    enum: ['BEFORE', 'AFTER', 'PROGRESS', 'REFERENCE'],
  })
  @IsString()
  type: string;

  @ApiPropertyOptional({
    description: 'Photo caption',
  })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  caption?: string;
}

/**
 * Response DTO for punch item statistics
 */
export class PunchItemStatsDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  byStatus: Record<PunchItemStatus, number>;

  @ApiProperty()
  byPriority: Record<PunchItemPriority, number>;

  @ApiProperty()
  byCategory: Record<PunchItemCategory, number>;

  @ApiProperty()
  byBallInCourt: Record<BallInCourt, number>;

  @ApiProperty()
  overdue: number;

  @ApiProperty()
  completedThisWeek: number;

  @ApiProperty()
  averageDaysToComplete: number;
}
