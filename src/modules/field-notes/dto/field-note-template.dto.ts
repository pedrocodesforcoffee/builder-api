import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsArray,
  IsObject,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FieldNoteType } from '../enums/field-note.enum';

/**
 * Template field definition
 */
export class TemplateFieldDto {
  @ApiProperty({ description: 'Field key (unique identifier)' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Field label (display name)' })
  @IsString()
  label: string;

  @ApiProperty({
    description: 'Field type',
    enum: ['text', 'textarea', 'number', 'date', 'time', 'datetime', 'select', 'multiselect', 'checkbox', 'radio'],
  })
  @IsEnum(['text', 'textarea', 'number', 'date', 'time', 'datetime', 'select', 'multiselect', 'checkbox', 'radio'])
  type: string;

  @ApiProperty({ description: 'Required flag' })
  @IsBoolean()
  required: boolean;

  @ApiPropertyOptional({ description: 'Placeholder text' })
  @IsOptional()
  @IsString()
  placeholder?: string;

  @ApiPropertyOptional({ description: 'Default value' })
  @IsOptional()
  defaultValue?: any;

  @ApiPropertyOptional({ description: 'Options for select/radio fields' })
  @IsOptional()
  @IsArray()
  options?: Array<{ label: string; value: string }>;

  @ApiPropertyOptional({ description: 'Validation rules' })
  @IsOptional()
  @IsObject()
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };

  @ApiPropertyOptional({ description: 'Help text' })
  @IsOptional()
  @IsString()
  helpText?: string;
}

/**
 * DTO for creating a field note template
 */
export class CreateFieldNoteTemplateDto {
  @ApiProperty({ description: 'Template name', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Note type', enum: FieldNoteType })
  @IsEnum(FieldNoteType)
  noteType: FieldNoteType;

  @ApiProperty({ description: 'Template fields' })
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  templateFields: {
    fields: TemplateFieldDto[];
  };

  @ApiPropertyOptional({ description: 'Default values for field note properties' })
  @IsOptional()
  @IsObject()
  defaultValues?: {
    priority?: string;
    visibility?: string;
    tags?: string[];
    followUpRequired?: boolean;
  };

  @ApiPropertyOptional({ description: 'Template category', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ description: 'Organization ID (null for system templates)' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}

/**
 * DTO for updating a field note template
 */
export class UpdateFieldNoteTemplateDto extends PartialType(CreateFieldNoteTemplateDto) {
  @ApiPropertyOptional({ description: 'Active flag' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * DTO for querying field note templates
 */
export class QueryFieldNoteTemplatesDto {
  @ApiPropertyOptional({ description: 'Organization ID filter' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Note type filter', enum: FieldNoteType })
  @IsOptional()
  @IsEnum(FieldNoteType)
  noteType?: FieldNoteType;

  @ApiPropertyOptional({ description: 'Category filter' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Active only' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  activeOnly?: boolean;

  @ApiPropertyOptional({ description: 'System templates only' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  systemOnly?: boolean;

  @ApiPropertyOptional({ description: 'Include system templates' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeSystem?: boolean;

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
  limit?: number;

  @ApiPropertyOptional({ description: 'Sort field', default: 'displayOrder' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'], default: 'ASC' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Response DTO for field note template
 */
export class FieldNoteTemplateResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ enum: FieldNoteType })
  noteType: FieldNoteType;

  @ApiProperty()
  isSystem: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  templateFields: {
    fields: TemplateFieldDto[];
  };

  @ApiPropertyOptional()
  defaultValues?: {
    priority?: string;
    visibility?: string;
    tags?: string[];
    followUpRequired?: boolean;
  };

  @ApiPropertyOptional()
  category?: string;

  @ApiProperty()
  displayOrder: number;

  @ApiProperty()
  usageCount: number;

  @ApiPropertyOptional()
  organizationId?: string;

  @ApiProperty()
  createdById: string;

  @ApiPropertyOptional()
  updatedById?: string;

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
  updatedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
  };
}
