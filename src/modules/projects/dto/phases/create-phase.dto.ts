import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsInt,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
  IsHexColor,
  MaxLength,
  Min,
  IsObject,
} from 'class-validator';
import { DependencyType } from '../../enums/dependency-type.enum';

export class CreatePhaseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsNotEmpty()
  @Min(1)
  order!: number;

  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @IsDateString()
  @IsNotEmpty()
  endDate!: string;

  @IsArray()
  @IsOptional()
  predecessorIds?: string[];

  @IsEnum(DependencyType)
  @IsOptional()
  dependencyType?: DependencyType;

  @IsInt()
  @IsOptional()
  lagDays?: number;

  @IsNumber()
  @IsOptional()
  budgetedCost?: number;

  @IsHexColor()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  icon?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  isMilestone?: boolean;

  @IsObject()
  @IsOptional()
  customFields?: Record<string, any>;
}
