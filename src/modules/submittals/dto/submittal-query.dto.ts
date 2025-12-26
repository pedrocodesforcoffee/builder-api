import {
  IsOptional,
  IsEnum,
  IsUUID,
  IsString,
  IsBoolean,
  IsDateString,
  IsNumber,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { SubmittalStatus, SubmittalType, SubmittalPriority } from '../entities/submittal.entity';

export class SubmittalQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(SubmittalStatus)
  status?: SubmittalStatus;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsEnum(SubmittalStatus, { each: true })
  statuses?: SubmittalStatus[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(SubmittalType)
  submittalType?: SubmittalType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(SubmittalPriority)
  priority?: SubmittalPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specSection?: string;

  @ApiPropertyOptional({ description: 'Filter by division (e.g., "03")' })
  @IsOptional()
  @IsString()
  division?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  responsibleContractorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  approverId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isOverdue?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  requiredOnSiteFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  requiredOnSiteTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'] })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
