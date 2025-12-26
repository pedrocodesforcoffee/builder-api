import { IsString, IsUUID, IsEnum, IsNumber, IsBoolean, IsOptional, IsArray, IsDateString, Min, Max, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { EmploymentType, OvertimeRule } from '../enums/time-attendance.enum';

/**
 * DTO for creating a worker profile
 */
export class CreateWorkerProfileDto {
  @ApiProperty({ description: 'User ID to associate with this worker profile' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Organization ID (employer)' })
  @IsUUID()
  organizationId: string;

  @ApiPropertyOptional({ description: 'Optional project assignment' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiProperty({ enum: EmploymentType })
  @IsEnum(EmploymentType)
  employmentType: EmploymentType;

  @ApiPropertyOptional({ example: 'Carpenter' })
  @IsOptional()
  @IsString()
  trade?: string;

  @ApiProperty({ example: 35.50, description: 'Regular hourly pay rate' })
  @IsNumber()
  @Min(0)
  @Max(1000)
  hourlyRate: number;

  @ApiProperty({ enum: OvertimeRule, default: OvertimeRule.STANDARD })
  @IsEnum(OvertimeRule)
  overtimeRule: OvertimeRule;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isUnion?: boolean;

  @ApiPropertyOptional({ example: '123' })
  @IsOptional()
  @IsString()
  unionLocalNumber?: string;

  @ApiPropertyOptional({ example: 'United Brotherhood of Carpenters' })
  @IsOptional()
  @IsString()
  unionName?: string;

  @ApiPropertyOptional({ example: ['OSHA 30', 'First Aid'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @ApiPropertyOptional({ description: 'Custom overtime configuration for CUSTOM rule type' })
  @IsOptional()
  overtimeConfig?: Record<string, any>;

  @ApiPropertyOptional({ example: '2024-01-15' })
  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  terminationDate?: string;

  @ApiPropertyOptional({ example: 45.00, description: 'Prevailing wage rate if applicable' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  prevailingWageRate?: number;

  @ApiPropertyOptional({ example: 12.50, description: 'Fringe benefits per hour' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fringeBenefitsRate?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * DTO for updating a worker profile
 */
export class UpdateWorkerProfileDto extends PartialType(CreateWorkerProfileDto) {
  @ApiPropertyOptional({ description: 'User ID cannot be changed after creation' })
  @IsOptional()
  userId?: never; // Prevent userId from being updated
}

/**
 * DTO for querying worker profiles
 */
export class QueryWorkerProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ enum: EmploymentType })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trade?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

/**
 * Response DTO for worker profile with user details
 */
export class WorkerProfileResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  organizationId: string;

  @ApiPropertyOptional()
  projectId?: string;

  @ApiProperty({ enum: EmploymentType })
  employmentType: EmploymentType;

  @ApiPropertyOptional()
  trade?: string;

  @ApiProperty()
  hourlyRate: number;

  @ApiProperty({ enum: OvertimeRule })
  overtimeRule: OvertimeRule;

  @ApiProperty()
  isUnion: boolean;

  @ApiPropertyOptional()
  unionLocalNumber?: string;

  @ApiPropertyOptional()
  unionName?: string;

  @ApiProperty({ type: [String] })
  certifications: string[];

  @ApiPropertyOptional()
  overtimeConfig?: Record<string, any>;

  @ApiPropertyOptional()
  hireDate?: Date;

  @ApiPropertyOptional()
  terminationDate?: Date;

  @ApiPropertyOptional()
  prevailingWageRate?: number;

  @ApiPropertyOptional()
  fringeBenefitsRate?: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // Nested user details
  @ApiPropertyOptional()
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
  };

  // Nested organization details
  @ApiPropertyOptional()
  organization?: {
    id: string;
    name: string;
    type: string;
  };
}
