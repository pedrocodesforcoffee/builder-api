import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  MaxLength,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TemplateCategory } from '../../enums/template-category.enum';
import { ProjectType } from '../../enums/project-type.enum';
import { DeliveryMethod } from '../../enums/delivery-method.enum';
import {
  PhaseDefinition,
  FolderDefinition,
  CustomFieldSchema,
} from '../../entities/project-template.entity';

export class CreateProjectTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  organizationId?: string;

  @IsBoolean()
  @IsOptional()
  isSystem?: boolean;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsEnum(TemplateCategory)
  @IsNotEmpty()
  category!: TemplateCategory;

  @IsEnum(ProjectType)
  @IsOptional()
  projectType?: ProjectType;

  @IsEnum(DeliveryMethod)
  @IsOptional()
  deliveryMethod?: DeliveryMethod;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  defaultContractType?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  defaultTimezone?: string;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  defaultWorkingDays?: number[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  defaultHolidays?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  @IsNotEmpty()
  phases!: PhaseDefinition[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  @IsOptional()
  folderStructure?: FolderDefinition[];

  @IsObject()
  @IsOptional()
  customFieldsSchema?: CustomFieldSchema;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  defaultTags?: string[];

  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
}
