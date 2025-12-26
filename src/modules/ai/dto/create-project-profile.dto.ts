import { IsString, IsOptional, IsNumber, IsArray, IsBoolean, IsUUID, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a project profile
 * Used when a new project is created or when manually creating a profile
 */
export class CreateProjectProfileDto {
  @ApiProperty({ description: 'Project ID', example: 'abc-123-def-456' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ description: 'Organization ID', example: 'org-123' })
  @IsUUID()
  organizationId: string;

  @ApiProperty({ description: 'Project type', example: 'Commercial', enum: ['Commercial', 'Residential', 'Industrial', 'Infrastructure', 'Institutional'] })
  @IsString()
  projectType: string;

  @ApiPropertyOptional({ description: 'Building type', example: 'Office' })
  @IsOptional()
  @IsString()
  buildingType?: string;

  @ApiPropertyOptional({ description: 'Delivery method', example: 'Design-Bid-Build' })
  @IsOptional()
  @IsString()
  deliveryMethod?: string;

  @ApiPropertyOptional({ description: 'Contract value in dollars', example: 5000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  contractValue?: number;

  @ApiPropertyOptional({ description: 'Square footage', example: 50000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  squareFootage?: number;

  @ApiPropertyOptional({ description: 'Duration in days', example: 365 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  durationDays?: number;

  @ApiPropertyOptional({ description: 'Location (city or region)', example: 'New York' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Latitude', example: 40.7128 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude', example: -74.0060 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ description: 'Scope elements', example: ['Foundation', 'Structural Steel', 'MEP'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopeElements?: string[];

  @ApiPropertyOptional({ description: 'Specialty trades', example: ['HVAC', 'Plumbing', 'Electrical'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialtyTrades?: string[];

  @ApiPropertyOptional({ description: 'Additional metadata', example: { notes: 'LEED certified project' } })
  @IsOptional()
  metadata?: Record<string, any>;
}
