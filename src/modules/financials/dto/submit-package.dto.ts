import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitPackageDto {
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
