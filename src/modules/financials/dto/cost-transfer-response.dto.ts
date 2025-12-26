import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CostTransferStatus } from '../enums/cost-transfer-status.enum';

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
 * Nested Cost Code DTO
 * Simplified cost code information
 */
class CostCodeInfoDto {
  @ApiProperty({ description: 'Cost code' })
  @Expose()
  code!: string;

  @ApiProperty({ description: 'Cost code name' })
  @Expose()
  name!: string;
}

/**
 * Nested Cost Entry Reference DTO
 * Reference to related cost entry records
 */
class CostEntryReferenceDto {
  @ApiProperty({ description: 'Cost entry UUID' })
  @Expose()
  id!: string;

  @ApiProperty({ description: 'Cost entry number', required: false })
  @Expose()
  entryNumber?: number;
}

/**
 * Cost Transfer Response DTO
 *
 * Complete response object for a cost transfer including all entity fields
 * and nested related entity information for easy consumption by clients.
 *
 * This DTO includes:
 * - All cost transfer core fields
 * - Workflow tracking (requested, approved, rejected, voided by users)
 * - Related entity information (project, budget, cost codes)
 * - References to created cost entries (when approved)
 * - Timestamps for complete audit trail
 *
 * Workflow states:
 * - DRAFT: Initial creation, can be edited or submitted
 * - PENDING_APPROVAL: Awaiting approval decision
 * - APPROVED: Approved and cost entries created
 * - REJECTED: Request denied with rejection reason
 * - VOID: Previously approved transfer that has been reversed
 */
export class CostTransferResponseDto {
  @ApiProperty({ description: 'Cost transfer UUID' })
  @Expose()
  id!: string;

  @ApiProperty({ description: 'Project UUID' })
  @Expose()
  projectId!: string;

  @ApiProperty({ description: 'Budget UUID' })
  @Expose()
  budgetId!: string;

  @ApiProperty({ description: 'Source cost code UUID (FROM)' })
  @Expose()
  fromCostCodeId!: string;

  @ApiProperty({ description: 'Target cost code UUID (TO)' })
  @Expose()
  toCostCodeId!: string;

  @ApiProperty({ description: 'Transfer amount' })
  @Expose()
  amount!: number;

  @ApiProperty({ description: 'Reason for the transfer' })
  @Expose()
  reason!: string;

  @ApiProperty({ description: 'Transfer status', enum: CostTransferStatus })
  @Expose()
  status!: CostTransferStatus;

  // Workflow tracking fields
  @ApiProperty({ description: 'User who requested the transfer' })
  @Expose()
  requestedById!: string;

  @ApiProperty({ description: 'Date when the transfer was requested' })
  @Expose()
  @Type(() => Date)
  requestedAt!: Date;

  @ApiProperty({ description: 'User who approved the transfer', required: false })
  @Expose()
  approvedById?: string;

  @ApiProperty({ description: 'Date when the transfer was approved', required: false })
  @Expose()
  @Type(() => Date)
  approvedAt?: Date;

  @ApiProperty({ description: 'User who rejected the transfer', required: false })
  @Expose()
  rejectedById?: string;

  @ApiProperty({ description: 'Date when the transfer was rejected', required: false })
  @Expose()
  @Type(() => Date)
  rejectedAt?: Date;

  @ApiProperty({ description: 'Reason for rejection', required: false })
  @Expose()
  rejectionReason?: string;

  @ApiProperty({ description: 'User who voided the transfer', required: false })
  @Expose()
  voidedById?: string;

  @ApiProperty({ description: 'Date when the transfer was voided', required: false })
  @Expose()
  @Type(() => Date)
  voidedAt?: Date;

  @ApiProperty({ description: 'Reason for voiding', required: false })
  @Expose()
  voidReason?: string;

  @ApiProperty({ description: 'Cost entry ID for FROM cost code (debit)', required: false })
  @Expose()
  fromEntryId?: string;

  @ApiProperty({ description: 'Cost entry ID for TO cost code (credit)', required: false })
  @Expose()
  toEntryId?: string;

  @ApiProperty({ description: 'Date when the transfer was created' })
  @Expose()
  @Type(() => Date)
  createdAt!: Date;

  @ApiProperty({ description: 'Date when the transfer was last updated' })
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

  @ApiProperty({ description: 'Source cost code information (FROM)', type: CostCodeInfoDto, required: false })
  @Expose()
  @Type(() => CostCodeInfoDto)
  fromCostCode?: CostCodeInfoDto;

  @ApiProperty({ description: 'Target cost code information (TO)', type: CostCodeInfoDto, required: false })
  @Expose()
  @Type(() => CostCodeInfoDto)
  toCostCode?: CostCodeInfoDto;

  @ApiProperty({ description: 'User who requested the transfer', type: UserInfoDto, required: false })
  @Expose()
  @Type(() => UserInfoDto)
  requestedBy?: UserInfoDto;

  @ApiProperty({ description: 'User who approved the transfer', type: UserInfoDto, required: false })
  @Expose()
  @Type(() => UserInfoDto)
  approvedBy?: UserInfoDto;

  @ApiProperty({ description: 'User who rejected the transfer', type: UserInfoDto, required: false })
  @Expose()
  @Type(() => UserInfoDto)
  rejectedBy?: UserInfoDto;

  @ApiProperty({ description: 'User who voided the transfer', type: UserInfoDto, required: false })
  @Expose()
  @Type(() => UserInfoDto)
  voidedBy?: UserInfoDto;

  @ApiProperty({ description: 'Cost entry reference for FROM cost code (debit)', type: CostEntryReferenceDto, required: false })
  @Expose()
  @Type(() => CostEntryReferenceDto)
  fromEntry?: CostEntryReferenceDto;

  @ApiProperty({ description: 'Cost entry reference for TO cost code (credit)', type: CostEntryReferenceDto, required: false })
  @Expose()
  @Type(() => CostEntryReferenceDto)
  toEntry?: CostEntryReferenceDto;
}
