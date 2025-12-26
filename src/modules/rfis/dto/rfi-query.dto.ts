import {
  IsOptional,
  IsEnum,
  IsUUID,
  IsString,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { RfiStatus, RfiPriority, RfiDiscipline, BallInCourt } from '../entities/rfi.entity';

export class RfiQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(RfiStatus)
  status?: RfiStatus;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsEnum(RfiStatus, { each: true })
  statuses?: RfiStatus[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(RfiPriority)
  priority?: RfiPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(RfiDiscipline)
  discipline?: RfiDiscipline;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  createdById?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(BallInCourt)
  ballInCourt?: BallInCourt;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ballInCourtUserId?: string;

  @ApiPropertyOptional({ description: 'Filter overdue RFIs' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isOverdue?: boolean;

  @ApiPropertyOptional({ description: 'Due date from' })
  @IsOptional()
  @IsDateString()
  dueDateFrom?: string;

  @ApiPropertyOptional({ description: 'Due date to' })
  @IsOptional()
  @IsDateString()
  dueDateTo?: string;

  @ApiPropertyOptional({ description: 'Search in subject and question' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort field' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
