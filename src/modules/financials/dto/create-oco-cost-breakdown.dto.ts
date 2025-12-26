import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
  Min,
  MaxLength,
  IsInt,
} from 'class-validator';

export class CreateOcoCostBreakdownDto {
  @IsUUID()
  @IsNotEmpty()
  ocoId!: string;

  @IsUUID()
  @IsOptional()
  costCodeId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  amount!: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}
