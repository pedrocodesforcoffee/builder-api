import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubmittalType } from '../entities/submittal.entity';
import { WorkflowStepType, ReviewerType, RoutingType } from '../entities/submittal-workflow-template-step.entity';

export class CreateWorkflowTemplateStepDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: WorkflowStepType })
  @IsEnum(WorkflowStepType)
  stepType: WorkflowStepType;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  stepOrder: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  parallelGroupOrder?: number;

  @ApiPropertyOptional({ enum: RoutingType })
  @IsOptional()
  @IsEnum(RoutingType)
  routingType?: RoutingType;

  @ApiProperty({ enum: ReviewerType })
  @IsEnum(ReviewerType)
  reviewerType: ReviewerType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  reviewerUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reviewerRole?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  reviewerCompanyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reviewerDiscipline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  allowedDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireAllParallel?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canApprove?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canReject?: boolean;
}

export class CreateWorkflowTemplateDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: SubmittalType, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(SubmittalType, { each: true })
  applicableTypes?: SubmittalType[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specSectionPatterns?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  totalReviewDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoApply?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiProperty({ type: [CreateWorkflowTemplateStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkflowTemplateStepDto)
  steps: CreateWorkflowTemplateStepDto[];
}
