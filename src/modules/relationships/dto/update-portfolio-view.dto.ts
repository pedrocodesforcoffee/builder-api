import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePortfolioViewDto {
  @ApiPropertyOptional({
    description: 'View name',
    example: 'Updated Dashboard Name',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({
    description: 'View description',
    example: 'Updated view description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Filter configuration',
    example: {
      status: ['ACTIVE'],
      priority: ['HIGH'],
    },
  })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Column configuration',
    example: [
      { field: 'name', label: 'Name', width: 250 },
      { field: 'budget', label: 'Budget', width: 150 },
    ],
  })
  @IsOptional()
  @IsArray()
  columns?: any[];

  @ApiPropertyOptional({
    description: 'Sort order configuration',
    example: { field: 'updatedAt', direction: 'DESC' },
  })
  @IsOptional()
  @IsObject()
  sortOrder?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Whether this view should be publicly accessible',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this is the default view',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}