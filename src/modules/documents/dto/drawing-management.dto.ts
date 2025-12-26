import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsEnum,
  IsObject,
  IsArray,
  IsBoolean,
  IsDate,
  MinLength,
  MaxLength,
  Min,
  Max,
  Matches,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DrawingDiscipline, DrawingType } from '../enums';
import { ReferenceType } from '../entities/drawing-cross-reference.entity';

// ==================== DRAWING SET DTOs ====================

/**
 * DTO for creating a new drawing set
 */
export class CreateDrawingSetDto {
  @ApiProperty({
    description: 'Drawing set name',
    example: 'Construction Documents - Phase 1',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    description: 'Set type/purpose',
    example: 'CD',
    enum: ['SD', 'DD', 'CD', 'BID', 'PERMIT', 'IFC', 'AS_BUILT', 'OTHER'],
  })
  @IsString()
  setType!: 'SD' | 'DD' | 'CD' | 'BID' | 'PERMIT' | 'IFC' | 'AS_BUILT' | 'OTHER';

  @ApiPropertyOptional({
    description: 'Set description',
    example: 'Complete construction documents for permit submission',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Issue date',
    example: '2024-01-15',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  issueDate?: Date;

  @ApiPropertyOptional({
    description: 'Revision marker/label',
    example: 'A',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  revisionLabel?: string;

  @ApiPropertyOptional({
    description: 'Custom metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for updating a drawing set
 */
export class UpdateDrawingSetDto {
  @ApiPropertyOptional({
    description: 'Drawing set name',
    example: 'Construction Documents - Phase 1',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Set description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Issue date',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  issueDate?: Date;

  @ApiPropertyOptional({
    description: 'Revision label',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  revisionLabel?: string;

  @ApiPropertyOptional({
    description: 'Custom metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for issuing a drawing set
 */
export class IssueDrawingSetDto {
  @ApiProperty({
    description: 'Issue date',
    example: '2024-01-15T10:00:00Z',
  })
  @IsDate()
  @Type(() => Date)
  issueDate!: Date;

  @ApiProperty({
    description: 'Issue purpose/notes',
    example: 'Issued for construction',
  })
  @IsString()
  issuePurpose!: string;

  @ApiPropertyOptional({
    description: 'Drawing IDs to include in issuance',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  drawingIds?: string[];

  @ApiPropertyOptional({
    description: 'Recipients of this issuance',
    type: 'array',
  })
  @IsOptional()
  @IsArray()
  recipients?: Array<{
    name: string;
    email?: string;
    company?: string;
  }>;
}

/**
 * DTO for superseding a drawing set
 */
export class SupersedeDrawingSetDto {
  @ApiProperty({
    description: 'ID of the new drawing set that supersedes this one',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  supersededById!: string;

  @ApiProperty({
    description: 'Reason for superseding',
    example: 'New revision issued with design changes',
  })
  @IsString()
  reason!: string;
}

/**
 * Response DTO for a drawing set
 */
export class DrawingSetResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  projectId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  setType!: string;

  @ApiProperty({ required: false })
  description!: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty({ required: false })
  issueDate!: Date | null;

  @ApiProperty({ required: false })
  revisionLabel!: string | null;

  @ApiProperty()
  drawingCount!: number;

  @ApiProperty({ required: false })
  supersededById!: string | null;

  @ApiProperty()
  metadata!: Record<string, any>;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

// ==================== DRAWING DTOs ====================

/**
 * DTO for creating a new drawing
 */
export class CreateDrawingDto {
  @ApiProperty({
    description: 'Document ID this drawing is linked to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  documentId!: string;

  @ApiProperty({
    description: 'Sheet number (e.g., A-101, S-201.1)',
    example: 'A-101',
    pattern: '^[A-Z]-[0-9]+(\\.[0-9]+)?$',
  })
  @IsString()
  @Matches(/^[A-Z]-[0-9]+(\.[0-9]+)?$/, {
    message: 'Sheet number must follow pattern: {Discipline}-{Number}[.{Sub}] (e.g., A-101, S-201.1)',
  })
  number!: string;

  @ApiProperty({
    description: 'Drawing title',
    example: 'First Floor Plan',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @ApiProperty({
    description: 'Drawing discipline',
    enum: DrawingDiscipline,
    example: DrawingDiscipline.ARCHITECTURAL,
  })
  @IsEnum(DrawingDiscipline)
  discipline!: DrawingDiscipline;

  @ApiProperty({
    description: 'Drawing type',
    enum: DrawingType,
    example: DrawingType.PLAN,
  })
  @IsEnum(DrawingType)
  drawingType!: DrawingType;

  @ApiPropertyOptional({
    description: 'Drawing set ID to add this drawing to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  drawingSetId?: string;

  @ApiPropertyOptional({
    description: 'Sheet size',
    example: 'ARCH D',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  sheetSize?: string;

  @ApiPropertyOptional({
    description: 'Page number in set',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  pageNumber?: number;

  @ApiPropertyOptional({
    description: 'Current revision marker',
    example: 'A',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  currentRevision?: string;

  @ApiPropertyOptional({
    description: 'Revision date',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  revisionDate?: Date;

  @ApiPropertyOptional({
    description: 'Grid reference',
    example: 'A1-B3',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  gridReference?: string;

  @ApiPropertyOptional({
    description: 'Building area',
    example: 'Wing A',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  area?: string;

  @ApiPropertyOptional({
    description: 'Zone reference',
    example: 'Zone 1',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  zone?: string;

  @ApiPropertyOptional({
    description: 'Tags',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Custom fields',
  })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;
}

/**
 * DTO for updating a drawing
 */
export class UpdateDrawingDto {
  @ApiPropertyOptional({
    description: 'Drawing title',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'Drawing discipline',
    enum: DrawingDiscipline,
  })
  @IsOptional()
  @IsEnum(DrawingDiscipline)
  discipline?: DrawingDiscipline;

  @ApiPropertyOptional({
    description: 'Drawing type',
    enum: DrawingType,
  })
  @IsOptional()
  @IsEnum(DrawingType)
  drawingType?: DrawingType;

  @ApiPropertyOptional({
    description: 'Sheet size',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  sheetSize?: string;

  @ApiPropertyOptional({
    description: 'Page number',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  pageNumber?: number;

  @ApiPropertyOptional({
    description: 'Current revision',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  currentRevision?: string;

  @ApiPropertyOptional({
    description: 'Revision date',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  revisionDate?: Date;

  @ApiPropertyOptional({
    description: 'Grid reference',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  gridReference?: string;

  @ApiPropertyOptional({
    description: 'Area',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  area?: string;

  @ApiPropertyOptional({
    description: 'Zone',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  zone?: string;

  @ApiPropertyOptional({
    description: 'Tags',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Custom fields',
  })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;
}

/**
 * DTO for adding a drawing revision
 */
export class AddDrawingRevisionDto {
  @ApiProperty({
    description: 'Revision marker/identifier',
    example: 'B',
  })
  @IsString()
  @MaxLength(20)
  revisionMarker!: string;

  @ApiProperty({
    description: 'Date revision was issued',
    example: '2024-01-15',
  })
  @IsDate()
  @Type(() => Date)
  issuedDate!: Date;

  @ApiProperty({
    description: 'Description of changes',
    example: 'Updated wall type at grid line 3 per ASI-15',
  })
  @IsString()
  description!: string;

  @ApiPropertyOptional({
    description: 'Cloud/delta locations',
    type: [String],
    example: ['Grid A1-A3', 'Detail 2/A-501'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cloudLocations?: string[];

  @ApiPropertyOptional({
    description: 'Cloud coordinates for programmatic highlighting',
    type: 'array',
  })
  @IsOptional()
  @IsArray()
  cloudCoordinates?: Array<{
    type: 'box' | 'polygon';
    points: Array<{ x: number; y: number }>;
    label?: string;
    page?: number;
  }>;

  @ApiPropertyOptional({
    description: 'Related RFI IDs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedRFIs?: string[];

  @ApiPropertyOptional({
    description: 'Related ASI IDs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedASIs?: string[];

  @ApiPropertyOptional({
    description: 'Related change order IDs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedChangeOrders?: string[];

  @ApiPropertyOptional({
    description: 'Related addendum numbers',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedAddenda?: string[];

  @ApiPropertyOptional({
    description: 'Additional notes',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Is this a major revision?',
  })
  @IsOptional()
  @IsBoolean()
  isMajorRevision?: boolean;

  @ApiPropertyOptional({
    description: 'Reason category for revision',
    enum: ['design_change', 'error_correction', 'coordination', 'code_compliance', 'constructability', 'cost_reduction', 'owner_request', 'rfi_response', 'other'],
  })
  @IsOptional()
  @IsString()
  revisionReason?: 'design_change' | 'error_correction' | 'coordination' | 'code_compliance' | 'constructability' | 'cost_reduction' | 'owner_request' | 'rfi_response' | 'other';

  @ApiPropertyOptional({
    description: 'Recipients of this revision',
    type: 'array',
  })
  @IsOptional()
  @IsArray()
  issuedTo?: Array<{
    recipientName: string;
    recipientCompany?: string;
    recipientEmail?: string;
    distributionMethod: 'email' | 'transmittal' | 'shared_link' | 'portal';
  }>;

  @ApiPropertyOptional({
    description: 'Transmittal number',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  transmittalNumber?: string;
}

/**
 * DTO for creating a cross-reference between drawings
 */
export class CreateCrossReferenceDto {
  @ApiProperty({
    description: 'Target drawing ID being referenced',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  targetDrawingId!: string;

  @ApiProperty({
    description: 'Type of reference',
    enum: ReferenceType,
    example: ReferenceType.DETAIL,
  })
  @IsEnum(ReferenceType)
  referenceType!: ReferenceType;

  @ApiPropertyOptional({
    description: 'Callout text/marker',
    example: '3/A-501',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  calloutText?: string;

  @ApiPropertyOptional({
    description: 'Reference description',
    example: 'Wall section at exterior wall',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Grid location where reference occurs',
    example: 'A1-B2',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  gridLocation?: string;

  @ApiPropertyOptional({
    description: 'Sheet coordinates',
  })
  @IsOptional()
  @IsObject()
  coordinates?: {
    x: number;
    y: number;
    page?: number;
  };

  @ApiPropertyOptional({
    description: 'Additional notes',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Response DTO for a drawing
 */
export class DrawingResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  documentId!: string;

  @ApiProperty({ required: false })
  drawingSetId!: string | null;

  @ApiProperty()
  number!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: DrawingDiscipline })
  discipline!: DrawingDiscipline;

  @ApiProperty({ enum: DrawingType })
  drawingType!: DrawingType;

  @ApiProperty({ required: false })
  sheetSize!: string | null;

  @ApiProperty({ required: false })
  pageNumber!: number | null;

  @ApiProperty({ required: false })
  currentRevision!: string | null;

  @ApiProperty({ required: false })
  revisionDate!: Date | null;

  @ApiProperty()
  revisionHistory!: any[];

  @ApiProperty({ required: false })
  gridReference!: string | null;

  @ApiProperty({ required: false })
  area!: string | null;

  @ApiProperty({ required: false })
  zone!: string | null;

  @ApiProperty()
  tags!: string[];

  @ApiProperty()
  customFields!: Record<string, any>;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

/**
 * DTO for exporting drawing log
 */
export class ExportDrawingLogDto {
  @ApiProperty({
    description: 'Export format',
    enum: ['csv', 'excel', 'pdf'],
    example: 'excel',
  })
  @IsEnum(['csv', 'excel', 'pdf'])
  format!: 'csv' | 'excel' | 'pdf';

  @ApiPropertyOptional({
    description: 'Filter by discipline',
    enum: DrawingDiscipline,
  })
  @IsOptional()
  @IsEnum(DrawingDiscipline)
  discipline?: DrawingDiscipline;

  @ApiPropertyOptional({
    description: 'Filter by drawing type',
    enum: DrawingType,
  })
  @IsOptional()
  @IsEnum(DrawingType)
  drawingType?: DrawingType;

  @ApiPropertyOptional({
    description: 'Include revision history',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeRevisionHistory?: boolean;

  @ApiPropertyOptional({
    description: 'Include cross-references',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeCrossReferences?: boolean;

  @ApiPropertyOptional({
    description: 'Custom columns to include',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customColumns?: string[];
}

/**
 * Drawing log entry DTO (for export)
 */
export class DrawingLogEntryDto {
  @ApiProperty()
  sheetNumber!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  discipline!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty({ required: false })
  currentRevision!: string | null;

  @ApiProperty({ required: false })
  revisionDate!: Date | null;

  @ApiProperty({ required: false })
  sheetSize!: string | null;

  @ApiProperty()
  issueDate!: Date;

  @ApiProperty({ required: false })
  notes!: string | null;
}

/**
 * Response DTO for drawing log export
 */
export class DrawingLogExportResponseDto {
  @ApiProperty({
    description: 'Download URL for the exported file',
  })
  downloadUrl!: string;

  @ApiProperty({
    description: 'File name',
  })
  fileName!: string;

  @ApiProperty({
    description: 'File format',
    enum: ['csv', 'excel', 'pdf'],
  })
  format!: 'csv' | 'excel' | 'pdf';

  @ApiProperty({
    description: 'Number of drawings included',
  })
  drawingCount!: number;

  @ApiProperty({
    description: 'When the export was generated',
  })
  generatedAt!: Date;
}
