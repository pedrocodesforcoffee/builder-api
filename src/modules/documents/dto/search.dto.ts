import {
  IsString,
  IsOptional,
  IsArray,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AlertFrequency } from '../entities/saved-search.entity';

/**
 * Search Request DTO
 *
 * Main search endpoint with full-text search and faceted filtering
 */
export class SearchDocumentsDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  disciplines?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  divisions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  status?: string[];

  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @IsOptional()
  @IsDateString()
  createdBefore?: string;

  @IsOptional()
  @IsDateString()
  modifiedAfter?: string;

  @IsOptional()
  @IsDateString()
  modifiedBefore?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  createdBy?: string[];

  @IsOptional()
  @IsString()
  sortBy?: string; // 'relevance', 'date', 'name', 'size'

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @IsBoolean()
  includeFacets?: boolean = true;

  @IsOptional()
  @IsBoolean()
  includeHighlights?: boolean = true;
}

/**
 * Autocomplete Request DTO
 */
export class AutocompleteDto {
  @IsString()
  query!: string;

  @IsOptional()
  @IsString()
  field?: string; // 'name', 'drawingNumber', 'specSection'

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 10;
}

/**
 * Suggest Request DTO (context-based suggestions)
 */
export class SuggestDto {
  @IsString()
  query!: string;

  @IsOptional()
  @IsString()
  documentType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  limit?: number = 5;
}

/**
 * Saved Search Create DTO
 */
export class CreateSavedSearchDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @ValidateNested()
  @Type(() => SearchDocumentsDto)
  searchParams!: SearchDocumentsDto;

  @IsOptional()
  @IsBoolean()
  alertsEnabled?: boolean = false;

  @IsOptional()
  @IsEnum(AlertFrequency)
  alertFrequency?: AlertFrequency = AlertFrequency.NONE;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean = false;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

/**
 * Saved Search Update DTO
 */
export class UpdateSavedSearchDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SearchDocumentsDto)
  searchParams?: SearchDocumentsDto;

  @IsOptional()
  @IsBoolean()
  alertsEnabled?: boolean;

  @IsOptional()
  @IsEnum(AlertFrequency)
  alertFrequency?: AlertFrequency;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

/**
 * Favorite Add DTO
 */
export class AddFavoriteDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

/**
 * Recent Documents Query DTO
 */
export class RecentDocumentsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  activityTypes?: string[]; // 'view', 'download', 'search_click'

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  daysBack?: number = 30;
}

/**
 * Search Result Document DTO (Response)
 */
export class SearchResultDocumentDto {
  id!: string;
  projectId!: string;
  name!: string;
  documentType!: string;
  description?: string;
  drawingNumber?: string;
  discipline?: string;
  specSection?: string;
  division?: string;
  mimeType!: string;
  fileSize!: number;
  versionNumber!: string;
  status!: string;
  tags?: string[];
  createdBy!: string;
  createdByName!: string;
  createdAt!: Date;
  updatedAt!: Date;
  score!: number; // Relevance score
  highlights?: {
    [field: string]: string[];
  };
}

/**
 * Search Facet DTO (Response)
 */
export class SearchFacetDto {
  field!: string;
  values!: Array<{
    value: string;
    count: number;
  }>;
}

/**
 * Search Response DTO
 */
export class SearchResponseDto {
  results!: SearchResultDocumentDto[];
  total!: number;
  offset!: number;
  limit!: number;
  executionTimeMs!: number;
  facets?: SearchFacetDto[];
}

/**
 * Autocomplete Response DTO
 */
export class AutocompleteResponseDto {
  suggestions!: Array<{
    text: string;
    documentId?: string;
    score: number;
  }>;
}

/**
 * Saved Search Response DTO
 */
export class SavedSearchResponseDto {
  id!: string;
  projectId!: string;
  name!: string;
  description?: string;
  searchParams!: any;
  alertsEnabled!: boolean;
  alertFrequency!: AlertFrequency;
  lastExecutedAt?: Date;
  lastResultCount!: number;
  newResultsSinceLastAlert!: number;
  executionCount!: number;
  isPinned!: boolean;
  tags?: string[];
  createdAt!: Date;
  updatedAt!: Date;
}

/**
 * Favorite Document Response DTO
 */
export class FavoriteDocumentResponseDto {
  id!: string;
  documentId!: string;
  document!: {
    id: string;
    name: string;
    documentType: string;
    mimeType: string;
  };
  notes?: string;
  tags?: string[];
  createdAt!: Date;
  lastAccessedAt?: Date;
}

/**
 * Recent Document Response DTO
 */
export class RecentDocumentResponseDto {
  documentId!: string;
  document!: {
    id: string;
    name: string;
    documentType: string;
    mimeType: string;
  };
  activityType!: string;
  activityDate!: Date;
  searchQuery?: string;
}

/**
 * Search Analytics DTO (Response)
 */
export class SearchAnalyticsDto {
  popularQueries!: Array<{
    query: string;
    count: number;
    avgResultCount: number;
  }>;
  zeroResultQueries!: Array<{
    query: string;
    count: number;
    lastSearchedAt: Date;
  }>;
  topDocuments!: Array<{
    documentId: string;
    documentName: string;
    viewCount: number;
    downloadCount: number;
    searchClickCount: number;
  }>;
  searchVolume!: {
    total: number;
    byDay: Array<{
      date: string;
      count: number;
    }>;
  };
}
