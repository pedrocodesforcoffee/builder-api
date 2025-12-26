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
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubmittalType, SubmittalPriority } from '../entities/submittal.entity';

export class CreateSubmittalItemDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  manufacturer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  productName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unitOfMeasure?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attachmentIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isSubstitution?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  substitutionJustification?: string;
}

export class CreateSubmittalDto {
  @ApiProperty()
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'CSI spec section (e.g., "03 30 00")' })
  @IsString()
  @MaxLength(20)
  specSection: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  specSectionTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  specParagraph?: string;

  @ApiPropertyOptional({ enum: SubmittalType })
  @IsOptional()
  @IsEnum(SubmittalType)
  submittalType?: SubmittalType;

  @ApiPropertyOptional({ enum: SubmittalPriority })
  @IsOptional()
  @IsEnum(SubmittalPriority)
  priority?: SubmittalPriority;

  @ApiProperty({ description: 'Contractor responsible for submitting' })
  @IsUUID()
  responsibleContractorId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  preparedById?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  submittalManagerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  approverId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  approverOrgId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  requiredOnSiteDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  leadTimeDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  reviewTimeDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  drawingReferences?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  distributionList?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiPropertyOptional({ type: [CreateSubmittalItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSubmittalItemDto)
  items?: CreateSubmittalItemDto[];
}
