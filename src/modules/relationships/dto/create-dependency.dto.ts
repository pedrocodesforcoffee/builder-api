import {
  IsUUID,
  IsEnum,
  IsOptional,
  IsInt,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DependencyType } from '../enums/dependency-type.enum';

export class CreateDependencyDto {
  @ApiProperty({
    description: 'Successor project ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  successorId!: string;

  @ApiProperty({
    description: 'Type of dependency',
    enum: DependencyType,
    example: DependencyType.FINISH_TO_START,
  })
  @IsEnum(DependencyType)
  dependencyType!: DependencyType;

  @ApiPropertyOptional({
    description: 'Lag days between predecessor and successor',
    example: 5,
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
    example: 'Backend API must be completed before frontend development can begin',
  })
  @IsOptional()
  @IsString()
  description?: string;
}