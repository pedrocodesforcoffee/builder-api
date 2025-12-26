import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  ValidateIf,
} from 'class-validator';

export class AddPackageItemDto {
  @IsUUID()
  @IsNotEmpty()
  packageId!: string;

  @IsEnum(['PCO', 'OCO', 'CCO'])
  @IsNotEmpty()
  changeOrderType!: 'PCO' | 'OCO' | 'CCO';

  @ValidateIf((o) => o.changeOrderType === 'PCO')
  @IsUUID()
  @IsNotEmpty()
  pcoId?: string;

  @ValidateIf((o) => o.changeOrderType === 'OCO')
  @IsUUID()
  @IsNotEmpty()
  ocoId?: string;

  @ValidateIf((o) => o.changeOrderType === 'CCO')
  @IsUUID()
  @IsNotEmpty()
  ccoId?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}
