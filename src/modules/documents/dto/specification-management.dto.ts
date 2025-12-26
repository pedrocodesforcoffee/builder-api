import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsBoolean,
  IsDateString,
  IsUUID,
  ValidateNested,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SpecificationDivision } from '../enums';
import { AddendumChangeType } from '../entities';

/**
 * Create Specification DTO
 */
export class CreateSpecificationDto {
  @ApiProperty({ description: 'Linked document ID' })
  @IsUUID()
  documentId!: string;

  @ApiProperty({ description: 'Section number (e.g., "03 30 00")', pattern: '^\\d{2} \\d{2} \\d{2}$' })
  @IsString()
  @Matches(/^\d{2} \d{2} \d{2}$/, { message: 'Section number must follow format: XX YY ZZ (e.g., "03 30 00")' })
  sectionNumber!: string;

  @ApiProperty({ description: 'Section title', example: 'Cast-in-Place Concrete' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  sectionTitle!: string;

  @ApiProperty({ description: 'CSI MasterFormat division', enum: SpecificationDivision })
  @IsEnum(SpecificationDivision)
  division!: SpecificationDivision;

  @ApiPropertyOptional({ description: 'Revision marker' })
  @IsOptional()
  @IsString()
  revision?: string;

  @ApiPropertyOptional({ description: 'Published date' })
  @IsOptional()
  @IsDateString()
  publishedDate?: string;

  @ApiPropertyOptional({ description: 'Effective date' })
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @ApiPropertyOptional({ description: 'Brief scope description' })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiPropertyOptional({ description: 'Page count' })
  @IsOptional()
  pageCount?: number;

  @ApiPropertyOptional({ description: 'Tags for search/categorization' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Submittal requirements' })
  @IsOptional()
  @IsArray()
  submittalRequirements?: Array<{
    type: string;
    description: string;
    timing?: string;
  }>;
}

/**
 * Update Specification DTO
 */
export class UpdateSpecificationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sectionTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  revision?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  publishedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiPropertyOptional()
  @IsOptional()
  pageCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isApplicable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

/**
 * Link Drawing to Specification DTO
 */
export class LinkDrawingDto {
  @ApiProperty({ description: 'Drawing ID to link' })
  @IsUUID()
  drawingId!: string;

  @ApiPropertyOptional({ description: 'Relationship description' })
  @IsOptional()
  @IsString()
  relationship?: string;
}

/**
 * Link RFI to Specification DTO
 */
export class LinkRfiDto {
  @ApiProperty({ description: 'RFI ID to link' })
  @IsUUID()
  rfiId!: string;

  @ApiPropertyOptional({ description: 'Context of the relationship' })
  @IsOptional()
  @IsString()
  context?: string;
}

/**
 * Add Product to Specification DTO
 */
export class AddProductDto {
  @ApiProperty({ description: 'Manufacturer name' })
  @IsString()
  manufacturer!: string;

  @ApiProperty({ description: 'Product name' })
  @IsString()
  productName!: string;

  @ApiPropertyOptional({ description: 'Model number' })
  @IsOptional()
  @IsString()
  modelNumber?: string;

  @ApiProperty({ description: 'Is this the base bid product?', default: true })
  @IsBoolean()
  isBaseBid!: boolean;

  @ApiProperty({ description: 'Is this a substitution?', default: false })
  @IsBoolean()
  isSubstitution!: boolean;

  @ApiPropertyOptional({ description: 'Reference within spec (e.g., "2.01.A")' })
  @IsOptional()
  @IsString()
  specReference?: string;
}

export class AffectedSectionDto {
  @ApiProperty({ description: 'Specification ID' })
  @IsUUID()
  specificationId!: string;

  @ApiProperty({ description: 'Type of change', enum: AddendumChangeType })
  @IsEnum(AddendumChangeType)
  changeType!: AddendumChangeType;

  @ApiProperty({ description: 'Description of change' })
  @IsString()
  changeDescription!: string;

  @ApiPropertyOptional({ description: 'New content (for inline changes)' })
  @IsOptional()
  @IsString()
  newContent?: string;

  @ApiPropertyOptional({ description: 'New document ID (for replacement sections)' })
  @IsOptional()
  @IsUUID()
  newDocumentId?: string;
}

/**
 * Create Addendum DTO
 */
export class CreateAddendumDto {
  @ApiProperty({ description: 'Addendum number', example: '1' })
  @IsString()
  @MaxLength(20)
  number!: string;

  @ApiProperty({ description: 'Addendum title', example: 'Addendum No. 1' })
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiProperty({ description: 'Issue date' })
  @IsDateString()
  issueDate!: string;

  @ApiProperty({ description: 'Description of changes' })
  @IsString()
  description!: string;

  @ApiPropertyOptional({ description: 'Full addendum document ID' })
  @IsOptional()
  @IsUUID()
  documentId?: string;

  @ApiProperty({ description: 'Affected sections', type: [AffectedSectionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AffectedSectionDto)
  affectedSections!: AffectedSectionDto[];

  @ApiPropertyOptional({ description: 'Related RFI IDs' })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  relatedRfis?: string[];
}

/**
 * Specification Response DTO
 */
export class SpecificationResponseDto {
  id!: string;
  projectId!: string;
  documentId!: string;
  sectionNumber!: string;
  sectionTitle!: string;
  division!: SpecificationDivision;
  divisionName!: string;
  revision!: string | null;
  publishedDate!: string | null;
  effectiveDate!: string | null;
  scope!: string | null;
  pageCount!: number | null;
  isApplicable!: boolean;
  tags!: string[];
  document!: {
    id: string;
    name: string;
    currentVersionId: string;
    status: string;
    thumbnailUrl: string | null;
  };
  createdAt!: string;
  updatedAt!: string;
}

/**
 * Addendum Response DTO
 */
export class AddendumResponseDto {
  id!: string;
  projectId!: string;
  number!: string;
  title!: string;
  issueDate!: string;
  description!: string;
  document!: {
    id: string;
    name: string;
  } | null;
  affectedSections!: Array<{
    specificationId: string;
    sectionNumber: string;
    sectionTitle: string;
    changeType: string;
    changeDescription: string;
  }>;
  createdAt!: string;
}

/**
 * List Specifications Query DTO
 */
export class ListSpecificationsQuery {
  @ApiPropertyOptional({ description: 'Filter by division(s)', enum: SpecificationDivision, isArray: true })
  @IsOptional()
  @IsEnum(SpecificationDivision, { each: true })
  division?: SpecificationDivision | SpecificationDivision[];

  @ApiPropertyOptional({ description: 'Search query' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by applicable status' })
  @IsOptional()
  @IsBoolean()
  isApplicable?: boolean;

  @ApiPropertyOptional({ description: 'Filter by published after date' })
  @IsOptional()
  @IsDateString()
  publishedAfter?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 50 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Sort by field', enum: ['sectionNumber', 'division', 'publishedDate', 'title'] })
  @IsOptional()
  sortBy?: 'sectionNumber' | 'division' | 'publishedDate' | 'title';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'] })
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ description: 'Group by division' })
  @IsOptional()
  @IsBoolean()
  groupByDivision?: boolean;
}

/**
 * List Addenda Query DTO
 */
export class ListAddendaQuery {
  @ApiPropertyOptional({ description: 'Filter by affected section number' })
  @IsOptional()
  @IsString()
  affectsSection?: string;

  @ApiPropertyOptional({ description: 'Issued after date' })
  @IsOptional()
  @IsDateString()
  issuedAfter?: string;

  @ApiPropertyOptional({ description: 'Issued before date' })
  @IsOptional()
  @IsDateString()
  issuedBefore?: string;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
