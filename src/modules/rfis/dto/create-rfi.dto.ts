import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsDateString,
  MaxLength,
  MinLength,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RfiPriority, RfiDiscipline } from '../entities/rfi.entity';

export class LocationDataDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  building?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  floor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  room?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gridReference?: string;
}

export class CreateRfiDto {
  @ApiProperty({ description: 'RFI subject/title' })
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  subject: string;

  @ApiProperty({ description: 'The question being asked' })
  @IsString()
  @MinLength(10)
  question: string;

  @ApiPropertyOptional({ description: 'Rich HTML version of question' })
  @IsOptional()
  @IsString()
  questionHtml?: string;

  @ApiPropertyOptional({ enum: RfiPriority })
  @IsOptional()
  @IsEnum(RfiPriority)
  priority?: RfiPriority;

  @ApiPropertyOptional({ enum: RfiDiscipline })
  @IsOptional()
  @IsEnum(RfiDiscipline)
  discipline?: RfiDiscipline;

  @ApiPropertyOptional({ description: 'Location description' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({ description: 'Structured location data' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => LocationDataDto)
  locationData?: LocationDataDto;

  @ApiPropertyOptional({ description: 'Response due date' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'User ID to assign RFI to' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'Organization ID to assign RFI to' })
  @IsOptional()
  @IsUUID()
  assignedToOrgId?: string;

  @ApiPropertyOptional({ description: 'Manager who can close the RFI' })
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiPropertyOptional({ description: 'List of user IDs to CC' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  distributionList?: string[];

  @ApiPropertyOptional({ description: 'Specification section reference' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  specSection?: string;

  @ApiPropertyOptional({ description: 'Drawing reference numbers' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  drawingReferences?: string[];

  @ApiPropertyOptional({ description: 'Has potential cost impact' })
  @IsOptional()
  @IsBoolean()
  hasCostImpact?: boolean;

  @ApiPropertyOptional({ description: 'Estimated cost impact amount' })
  @IsOptional()
  @IsNumber()
  estimatedCostImpact?: number;

  @ApiPropertyOptional({ description: 'Has potential schedule impact' })
  @IsOptional()
  @IsBoolean()
  hasScheduleImpact?: boolean;

  @ApiPropertyOptional({ description: 'Estimated schedule impact in days' })
  @IsOptional()
  @IsNumber()
  estimatedScheduleImpactDays?: number;

  @ApiPropertyOptional({ description: 'Description of impacts' })
  @IsOptional()
  @IsString()
  impactDescription?: string;

  @ApiPropertyOptional({ description: 'SLA response days (default 7)' })
  @IsOptional()
  @IsNumber()
  slaResponseDays?: number;

  @ApiPropertyOptional({ description: 'Mark as private/internal' })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiPropertyOptional({ description: 'Attachment document IDs' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attachmentIds?: string[];

  @ApiPropertyOptional({ description: 'Send immediately (OPEN) or save as DRAFT' })
  @IsOptional()
  @IsBoolean()
  sendImmediately?: boolean;
}
