import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitPcoDto {
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
