import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { CcoChangeType } from '../enums/cco-change-type.enum';

export class CreateCommitmentChangeOrderDto {
  @IsUUID()
  @IsNotEmpty()
  projectId!: string;

  @IsUUID()
  @IsNotEmpty()
  commitmentId!: string;

  @IsUUID()
  @IsOptional()
  ocoId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  ccoNumber!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsEnum(CcoChangeType)
  @IsNotEmpty()
  changeType!: CcoChangeType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  amount!: number;

  @IsBoolean()
  @IsOptional()
  isTimeAndMaterial?: boolean;

  @IsUUID()
  @IsNotEmpty()
  createdById!: string;
}
