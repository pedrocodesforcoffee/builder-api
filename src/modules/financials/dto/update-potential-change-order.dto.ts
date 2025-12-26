import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { CoPriority } from '../enums/co-priority.enum';

export class UpdatePotentialChangeOrderDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  pcoNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsEnum(CoPriority)
  @IsOptional()
  priority?: CoPriority;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  directCost?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  overheadPercent?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  profitPercent?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  contingencyPercent?: number;
}
