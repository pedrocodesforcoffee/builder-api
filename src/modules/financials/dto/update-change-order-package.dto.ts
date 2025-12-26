import {
  IsString,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class UpdateChangeOrderPackageDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  packageNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;
}
