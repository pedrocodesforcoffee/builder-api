import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  MaxLength,
  IsInt,
  Min,
} from 'class-validator';
import { OcoChangeType } from '../enums/oco-change-type.enum';
import { CoPriority } from '../enums/co-priority.enum';

export class UpdateOwnerChangeOrderDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  ocoNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsEnum(OcoChangeType)
  @IsOptional()
  changeType?: OcoChangeType;

  @IsEnum(CoPriority)
  @IsOptional()
  priority?: CoPriority;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  reason?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  scheduleImpactDays?: number;
}
