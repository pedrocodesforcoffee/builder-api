import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApprovePackageDto {
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
