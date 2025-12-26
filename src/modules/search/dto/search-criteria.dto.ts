import { IsOptional, IsString, IsArray, IsNumber, IsBoolean, IsEnum, IsUUID, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectStatus } from '../../projects/enums/project-status.enum';
import { ProjectType } from '../../projects/enums/project-type.enum';
import { DeliveryMethod } from '../../projects/enums/delivery-method.enum';
import { SortField } from '../enums/sort-field.enum';

/**
 * Search Criteria DTO
 *
 * Defines all query parameters for project search
 */
export class SearchCriteriaDto {
  /**
   * Full-text search query
   */
  @IsOptional()
  @IsString()
  q?: string;

  /**
   * Project number search
   */
  @IsOptional()
  @IsString()
  projectNumber?: string;

  /**
   * Project name search
   */
  @IsOptional()
  @IsString()
  name?: string;

  /**
   * Filter by project status
   */
  @IsOptional()
  @IsArray()
  @IsEnum(ProjectStatus, { each: true })
  status?: ProjectStatus[];

  /**
   * Filter by project type
   */
  @IsOptional()
  @IsArray()
  @IsEnum(ProjectType, { each: true })
  type?: ProjectType[];

  /**
   * Filter by delivery method
   */
  @IsOptional()
  @IsArray()
  @IsEnum(DeliveryMethod, { each: true })
  deliveryMethod?: DeliveryMethod[];

  /**
   * Filter by organization ID
   */
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  /**
   * Filter by program ID
   */
  @IsOptional()
  @IsUUID()
  programId?: string;

  /**
   * Filter by location text
   */
  @IsOptional()
  @IsString()
  location?: string;

  /**
   * Near location query (format: "lat,lng,radiusKm")
   */
  @IsOptional()
  @IsString()
  near?: string;

  /**
   * Minimum budget filter
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budgetMin?: number;

  /**
   * Maximum budget filter
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budgetMax?: number;

  /**
   * Start date from filter
   */
  @IsOptional()
  @IsString()
  startDateFrom?: string;

  /**
   * Start date to filter
   */
  @IsOptional()
  @IsString()
  startDateTo?: string;

  /**
   * End date from filter
   */
  @IsOptional()
  @IsString()
  endDateFrom?: string;

  /**
   * End date to filter
   */
  @IsOptional()
  @IsString()
  endDateTo?: string;

  /**
   * Minimum percent complete
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  percentCompleteMin?: number;

  /**
   * Maximum percent complete
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  percentCompleteMax?: number;

  /**
   * Filter by tags (ANY match)
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  /**
   * Filter by tags (ALL match)
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagsAll?: string[];

  /**
   * Filter by parent existence
   */
  @IsOptional()
  @IsBoolean()
  hasParent?: boolean;

  /**
   * Filter by parent ID
   */
  @IsOptional()
  @IsUUID()
  parentId?: string;

  /**
   * Filter by program membership
   */
  @IsOptional()
  @IsBoolean()
  inProgram?: boolean;

  /**
   * Custom fields filter (JSONB)
   */
  @IsOptional()
  customFields?: Record<string, any>;

  /**
   * Sort by field
   */
  @IsOptional()
  @IsEnum(SortField)
  sortBy?: SortField;

  /**
   * Sort order
   */
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  /**
   * Page number (1-based)
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  /**
   * Page size
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  /**
   * Include archived projects
   */
  @IsOptional()
  @IsBoolean()
  includeArchived?: boolean = false;

  /**
   * Enable fuzzy matching
   */
  @IsOptional()
  @IsBoolean()
  fuzzy?: boolean = false;
}