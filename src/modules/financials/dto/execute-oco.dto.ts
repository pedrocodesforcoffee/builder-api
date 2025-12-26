import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ExecuteOcoDto {
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
