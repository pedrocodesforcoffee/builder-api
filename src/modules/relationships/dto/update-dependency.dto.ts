import {
  IsEnum,
  IsOptional,
  IsInt,
  IsString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DependencyType } from '../enums/dependency-type.enum';

export class UpdateDependencyDto {
  @ApiPropertyOptional({
    description: 'Type of dependency',
    enum: DependencyType,
    example: DependencyType.START_TO_START,
  })
  @IsOptional()
  @IsEnum(DependencyType)
  dependencyType?: DependencyType;

  @ApiPropertyOptional({
    description: 'Lag days between predecessor and successor',
    example: 3,
    minimum: -365,
    maximum: 365,
  })
  @IsOptional()
  @IsInt()
  @Min(-365)
  @Max(365)
  lagDays?: number;

  @ApiPropertyOptional({
    description: 'Description of the dependency',
    example: 'Updated dependency description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Dependency status',
    example: 'ACTIVE',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;
}