import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitCcoDto {
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
