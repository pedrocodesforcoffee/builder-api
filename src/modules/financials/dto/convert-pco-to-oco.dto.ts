import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MaxLength,
  IsInt,
  Min,
} from 'class-validator';
import { OcoChangeType } from '../enums/oco-change-type.enum';
import { CoPriority } from '../enums/co-priority.enum';

export class ConvertPcoToOcoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  ocoNumber!: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsEnum(OcoChangeType)
  @IsNotEmpty()
  changeType!: OcoChangeType;

  @IsEnum(CoPriority)
  @IsOptional()
  priority?: CoPriority;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  reason?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  scheduleImpactDays?: number;
}
