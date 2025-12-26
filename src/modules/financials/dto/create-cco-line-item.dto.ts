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

export class CreateCcoLineItemDto {
  @IsUUID()
  @IsNotEmpty()
  ccoId!: string;

  @IsUUID()
  @IsOptional()
  costCodeId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description!: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @IsOptional()
  quantity?: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  unit?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  unitCost?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  amount!: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}
