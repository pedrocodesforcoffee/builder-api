import {
  IsString,
  IsUUID,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PortfolioViewType } from '../entities/portfolio-view.entity';

export class CreatePortfolioViewDto {
  @ApiProperty({
    description: 'Organization ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  organizationId!: string;

  @ApiProperty({
    description: 'View name',
    example: 'Executive Dashboard',
    maxLength: 200,
  })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({
    description: 'View description',
    example: 'High-level portfolio overview for executive team',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Type of portfolio view',
    enum: PortfolioViewType,
    example: PortfolioViewType.DASHBOARD,
    default: PortfolioViewType.STANDARD,
  })
  @IsOptional()
  @IsEnum(PortfolioViewType)
  viewType?: PortfolioViewType;

  @ApiPropertyOptional({
    description: 'Filter configuration',
    example: {
      status: ['ACTIVE', 'IN_PROGRESS'],
      priority: ['HIGH', 'CRITICAL'],
      budgetMin: 100000,
    },
  })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Column configuration',
    example: [
      { field: 'name', label: 'Project Name', width: 200 },
      { field: 'status', label: 'Status', width: 100 },
      { field: 'progress', label: 'Progress', width: 100 },
    ],
  })
  @IsOptional()
  @IsArray()
  columns?: any[];

  @ApiPropertyOptional({
    description: 'Sort order configuration',
    example: { field: 'priority', direction: 'DESC' },
  })
  @IsOptional()
  @IsObject()
  sortOrder?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Whether this view should be publicly accessible',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this is the default view',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}