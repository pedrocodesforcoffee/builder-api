import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApprovePcoDto {
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
