import { IsOptional, IsString, MaxLength, IsNumber, Min } from 'class-validator';

export class ApproveOcoDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  approvedAmount?: number;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
