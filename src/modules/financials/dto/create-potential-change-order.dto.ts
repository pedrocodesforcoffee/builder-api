import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { CoPriority } from '../enums/co-priority.enum';

export class CreatePotentialChangeOrderDto {
  @IsUUID()
  @IsNotEmpty()
  projectId!: string;

  @IsUUID()
  @IsNotEmpty()
  primeContractId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  pcoNumber!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

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

  @IsUUID()
  @IsNotEmpty()
  createdById!: string;
}
