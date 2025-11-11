import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProgramDto {
  @ApiPropertyOptional({
    description: 'Program name',
    example: 'Q1 2024 Product Launch - Updated',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({
    description: 'Program description',
    example: 'Updated description for the program',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Program start date',
    example: '2024-01-15',
  })
  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'Program end date',
    example: '2024-04-15',
  })
  @IsOptional()
  @IsDateString()
  endDate?: Date;

  @ApiPropertyOptional({
    description: 'Target budget for the program',
    example: 750000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  targetBudget?: number;

  @ApiPropertyOptional({
    description: 'Program status',
    example: 'IN_PROGRESS',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;
}