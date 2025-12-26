import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { CcoChangeType } from '../enums/cco-change-type.enum';

export class UpdateCommitmentChangeOrderDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  ccoNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsEnum(CcoChangeType)
  @IsOptional()
  changeType?: CcoChangeType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  amount?: number;

  @IsBoolean()
  @IsOptional()
  isTimeAndMaterial?: boolean;
}
