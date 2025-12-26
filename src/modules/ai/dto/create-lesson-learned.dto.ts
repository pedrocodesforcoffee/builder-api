import { IsString, IsOptional, IsNumber, IsArray, IsUUID, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LessonLearnedCategory } from '../enums';

/**
 * DTO for creating a lesson learned
 * Used when manually creating or AI-extracting lessons from projects
 */
export class CreateLessonLearnedDto {
  @ApiProperty({ description: 'Organization ID', example: 'org-123' })
  @IsUUID()
  organizationId: string;

  @ApiPropertyOptional({ description: 'Project ID (if project-specific)', example: 'proj-123' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiProperty({ description: 'Lesson category', enum: LessonLearnedCategory })
  @IsEnum(LessonLearnedCategory)
  category: LessonLearnedCategory;

  @ApiPropertyOptional({ description: 'Tags for searchability', example: ['concrete', 'foundation', 'winter-construction'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Lesson title', example: 'Foundation work in winter requires special concrete additives' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Situation description', example: 'During foundation pour in January, ambient temperature dropped below 20°F' })
  @IsString()
  situation: string;

  @ApiProperty({ description: 'Action taken', example: 'Used Type III cement with calcium chloride accelerator and insulated blankets' })
  @IsString()
  action: string;

  @ApiProperty({ description: 'Outcome', example: 'Concrete achieved 70% strength in 3 days despite cold weather' })
  @IsString()
  outcome: string;

  @ApiProperty({ description: 'Lesson learned', example: 'Cold weather concrete requires accelerators and protection, but can be successful with proper planning' })
  @IsString()
  lesson: string;

  @ApiPropertyOptional({ description: 'Recommended action for future', example: 'Always order Type III cement with accelerators for winter pours below 40°F' })
  @IsOptional()
  @IsString()
  recommendedAction?: string;

  @ApiPropertyOptional({ description: 'Impact type', example: 'TIME_SAVINGS' })
  @IsOptional()
  @IsString()
  impactType?: string;

  @ApiPropertyOptional({ description: 'Cost impact (positive = savings)', example: 5000 })
  @IsOptional()
  @IsNumber()
  costImpact?: number;

  @ApiPropertyOptional({ description: 'Schedule impact in days (positive = time saved)', example: 2 })
  @IsOptional()
  @IsNumber()
  scheduleImpact?: number;

  @ApiPropertyOptional({ description: 'AI-generated flag', example: false, default: false })
  @IsOptional()
  @IsBoolean()
  aiGenerated?: boolean = false;

  @ApiPropertyOptional({ description: 'User ID who created this lesson', example: 'user-123' })
  @IsOptional()
  @IsUUID()
  createdByUserId?: string;

  @ApiPropertyOptional({ description: 'Make lesson public across organization', example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = true;

  @ApiPropertyOptional({ description: 'Additional metadata', example: { weatherData: { temp: 18, windChill: 5 } } })
  @IsOptional()
  metadata?: Record<string, any>;
}
