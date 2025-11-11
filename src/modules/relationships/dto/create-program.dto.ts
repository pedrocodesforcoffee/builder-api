import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsDateString,
  IsNumber,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProgramType } from '../enums/program-type.enum';

export class CreateProgramDto {
  @ApiProperty({
    description: 'Organization ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  organizationId!: string;

  @ApiProperty({
    description: 'Program name',
    example: 'Q1 2024 Product Launch',
    maxLength: 200,
  })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({
    description: 'Program description',
    example: 'Comprehensive program for launching new product features in Q1 2024',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Type of program',
    enum: ProgramType,
    example: ProgramType.INITIATIVE,
  })
  @IsEnum(ProgramType)
  programType!: ProgramType;

  @ApiPropertyOptional({
    description: 'Program start date',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'Program end date',
    example: '2024-03-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: Date;

  @ApiPropertyOptional({
    description: 'Target budget for the program',
    example: 500000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  targetBudget?: number;
}