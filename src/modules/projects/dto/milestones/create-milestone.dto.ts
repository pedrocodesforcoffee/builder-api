import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsInt,
  IsBoolean,
  IsArray,
  IsNumber,
  MaxLength,
  Min,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CompletionCriterion } from '../../entities/project-milestone.entity';

export class CreateMilestoneDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  plannedDate!: string;

  @IsDateString()
  @IsOptional()
  baselineDate?: string;

  @IsBoolean()
  @IsOptional()
  isCritical?: boolean;

  @IsBoolean()
  @IsOptional()
  isClientFacing?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresApproval?: boolean;

  @IsArray()
  @IsOptional()
  dependsOnMilestoneIds?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  @IsOptional()
  completionCriteria?: CompletionCriterion[];

  @IsInt()
  @IsOptional()
  @Min(0)
  notifyDaysBefore?: number;

  @IsBoolean()
  @IsOptional()
  notifyOnCompletion?: boolean;

  @IsInt()
  @IsOptional()
  @Min(0)
  order?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  weight?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  customFields?: Record<string, any>;
}
