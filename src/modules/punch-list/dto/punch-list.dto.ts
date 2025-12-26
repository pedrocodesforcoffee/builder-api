import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PunchListType } from '../enums/punch-list.enum';

/**
 * DTO for creating a new punch list
 */
export class CreatePunchListDto {
  @ApiProperty({
    description: 'Project ID',
    example: 'a6074e71-6f3f-40c0-a201-1e87b238df81',
  })
  @IsUUID()
  projectId: string;

  @ApiProperty({
    description: 'Punch list name',
    example: 'Pre-Final Walkthrough - Building A',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Punch list type',
    enum: PunchListType,
    example: PunchListType.PRE_FINAL,
  })
  @IsEnum(PunchListType)
  type: PunchListType;

  @ApiPropertyOptional({
    description: 'Punch list description',
    example: 'Items identified during pre-final inspection',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Target completion date',
    example: '2025-02-15',
  })
  @IsDateString()
  @IsOptional()
  targetDate?: string;

  @ApiPropertyOptional({
    description: 'Set as active punch list',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

/**
 * DTO for updating a punch list
 */
export class UpdatePunchListDto extends PartialType(CreatePunchListDto) {
  @ApiPropertyOptional({
    description: 'Lock punch list to prevent modifications',
  })
  @IsBoolean()
  @IsOptional()
  isLocked?: boolean;

  @ApiPropertyOptional({
    description: 'Completed date',
    example: '2025-02-15',
  })
  @IsDateString()
  @IsOptional()
  completedDate?: string;
}

/**
 * DTO for querying punch lists with filters
 */
export class QueryPunchListsDto {
  @ApiPropertyOptional({
    description: 'Filter by project ID',
  })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Filter by punch list type',
    enum: PunchListType,
  })
  @IsEnum(PunchListType)
  @IsOptional()
  type?: PunchListType;

  @ApiPropertyOptional({
    description: 'Filter by active status',
  })
  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by locked status',
  })
  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  isLocked?: boolean;

  @ApiPropertyOptional({
    description: 'Include punch items',
  })
  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  includeItems?: boolean;

  @ApiPropertyOptional({
    description: 'Include statistics',
  })
  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  includeStats?: boolean;
}

/**
 * Response DTO with punch list statistics
 */
export class PunchListStatsDto {
  @ApiProperty()
  totalItems: number;

  @ApiProperty()
  openItems: number;

  @ApiProperty()
  inProgressItems: number;

  @ApiProperty()
  completedItems: number;

  @ApiProperty()
  closedItems: number;

  @ApiProperty({
    description: 'Completion percentage (0-100)',
  })
  completionPercentage: number;

  @ApiPropertyOptional()
  criticalItems?: number;

  @ApiPropertyOptional()
  highPriorityItems?: number;

  @ApiPropertyOptional()
  overdueItems?: number;
}

/**
 * Response DTO for punch list with full details
 */
export class PunchListResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: PunchListType })
  type: PunchListType;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  targetDate?: Date;

  @ApiPropertyOptional()
  completedDate?: Date;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isLocked: boolean;

  @ApiProperty()
  stats: PunchListStatsDto;

  @ApiProperty()
  createdBy: {
    id: string;
    name: string;
    email: string;
  };

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
