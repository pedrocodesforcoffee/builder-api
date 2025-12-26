import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  Min,
  MaxLength,
  IsInt,
} from 'class-validator';
import { OcoChangeType } from '../enums/oco-change-type.enum';
import { CoPriority } from '../enums/co-priority.enum';

export class CreateOwnerChangeOrderDto {
  @IsUUID()
  @IsNotEmpty()
  projectId!: string;

  @IsUUID()
  @IsNotEmpty()
  primeContractId!: string;

  @IsUUID()
  @IsOptional()
  pcoId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  ocoNumber!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

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

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  amount!: number;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  reason?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  scheduleImpactDays?: number;

  @IsUUID()
  @IsNotEmpty()
  createdById!: string;
}
