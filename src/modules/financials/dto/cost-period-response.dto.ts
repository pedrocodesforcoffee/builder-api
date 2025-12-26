import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CostPeriodStatus } from '../enums/cost-period-status.enum';

/**
 * Nested User DTO
 * Simplified user information for response DTOs
 */
class UserInfoDto {
  @ApiProperty({ description: 'User first name' })
  @Expose()
  firstName!: string;

  @ApiProperty({ description: 'User last name' })
  @Expose()
  lastName!: string;
}

/**
 * Nested Project DTO
 * Simplified project information
 */
class ProjectInfoDto {
  @ApiProperty({ description: 'Project name' })
  @Expose()
  name!: string;
}

/**
 * Nested Budget DTO
 * Simplified budget information
 */
class BudgetInfoDto {
  @ApiProperty({ description: 'Budget name' })
  @Expose()
  name!: string;
}

/**
 * Cost Period Response DTO
 *
 * Complete response object for a cost period including all entity fields
 * and nested related entity information for easy consumption by clients.
 *
 * This DTO includes:
 * - All cost period core fields (name, dates, status)
 * - Workflow tracking (closed by, locked by, created by, updated by)
 * - Related entity information (project, budget)
 * - Snapshot data (JSONB object created on close)
 * - Timestamps for complete audit trail
 *
 * Cost Period Status Transitions:
 * - OPEN: Accepts new cost entries
 * - CLOSED: No new entries, snapshot created
 * - LOCKED: Immutable, cannot reopen
 */
export class CostPeriodResponseDto {
  @ApiProperty({ description: 'Cost period UUID' })
  @Expose()
  id!: string;

  @ApiProperty({ description: 'Project UUID' })
  @Expose()
  projectId!: string;

  @ApiProperty({ description: 'Budget UUID' })
  @Expose()
  budgetId!: string;

  @ApiProperty({ description: 'Period name (e.g., "January 2025")' })
  @Expose()
  periodName!: string;

  @ApiProperty({ description: 'Period start date' })
  @Expose()
  @Type(() => Date)
  periodStart!: Date;

  @ApiProperty({ description: 'Period end date' })
  @Expose()
  @Type(() => Date)
  periodEnd!: Date;

  @ApiProperty({ description: 'Cost period status', enum: CostPeriodStatus })
  @Expose()
  status!: CostPeriodStatus;

  @ApiPropertyOptional({
    description: 'Snapshot data captured when period was closed (JSONB)',
  })
  @Expose()
  snapshotData?: any;

  // Workflow tracking fields
  @ApiProperty({ description: 'User who closed the period', required: false })
  @Expose()
  closedById?: string;

  @ApiProperty({ description: 'Date when the period was closed', required: false })
  @Expose()
  @Type(() => Date)
  closedAt?: Date;

  @ApiProperty({ description: 'User who locked the period', required: false })
  @Expose()
  lockedById?: string;

  @ApiProperty({ description: 'Date when the period was locked', required: false })
  @Expose()
  @Type(() => Date)
  lockedAt?: Date;

  @ApiProperty({ description: 'User who created the period', required: false })
  @Expose()
  createdById?: string;

  @ApiProperty({ description: 'Date when the period was created' })
  @Expose()
  @Type(() => Date)
  createdAt!: Date;

  @ApiProperty({ description: 'User who last updated the period', required: false })
  @Expose()
  updatedById?: string;

  @ApiProperty({ description: 'Date when the period was last updated' })
  @Expose()
  @Type(() => Date)
  updatedAt!: Date;

  // Nested related entities
  @ApiProperty({ description: 'Project information', type: ProjectInfoDto, required: false })
  @Expose()
  @Type(() => ProjectInfoDto)
  project?: ProjectInfoDto;

  @ApiProperty({ description: 'Budget information', type: BudgetInfoDto, required: false })
  @Expose()
  @Type(() => BudgetInfoDto)
  budget?: BudgetInfoDto;

  @ApiProperty({ description: 'User who created the period', type: UserInfoDto, required: false })
  @Expose()
  @Type(() => UserInfoDto)
  createdBy?: UserInfoDto;

  @ApiProperty({ description: 'User who last updated the period', type: UserInfoDto, required: false })
  @Expose()
  @Type(() => UserInfoDto)
  updatedBy?: UserInfoDto;

  @ApiProperty({ description: 'User who closed the period', type: UserInfoDto, required: false })
  @Expose()
  @Type(() => UserInfoDto)
  closedBy?: UserInfoDto;

  @ApiProperty({ description: 'User who locked the period', type: UserInfoDto, required: false })
  @Expose()
  @Type(() => UserInfoDto)
  lockedBy?: UserInfoDto;
}
