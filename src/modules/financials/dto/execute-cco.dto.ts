import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ExecuteCcoDto {
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
