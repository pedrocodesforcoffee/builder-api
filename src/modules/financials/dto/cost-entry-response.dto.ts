import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CostEntryType } from '../enums/cost-entry-type.enum';
import { CostEntryStatus } from '../enums/cost-entry-status.enum';

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
 * Nested Commitment DTO
 * Simplified commitment information
 */
class CommitmentInfoDto {
  @ApiProperty({ description: 'Vendor name' })
  @Expose()
  vendorName!: string;
}

/**
 * Nested Payment Application DTO
 * Simplified payment application information
 */
class PaymentApplicationInfoDto {
  @ApiProperty({ description: 'Application number' })
  @Expose()
  applicationNumber!: number;
}

/**
 * Nested Cost Period DTO
 * Simplified cost period information
 */
class CostPeriodInfoDto {
  @ApiProperty({ description: 'Period name' })
  @Expose()
  periodName!: string;
}

/**
 * Cost Entry Response DTO
 *
 * Complete response object for a cost entry including all entity fields
 * and nested related entity information for easy consumption by clients.
 *
 * This DTO includes:
 * - All cost entry core fields
 * - Workflow tracking (created, updated, posted, voided by users)
 * - Related entity information (project, budget, cost code, etc.)
 * - Timestamps for audit trail
 */
export class CostEntryResponseDto {
  @ApiProperty({ description: 'Cost entry UUID' })
  @Expose()
  id!: string;

  @ApiProperty({ description: 'Project UUID' })
  @Expose()
  projectId!: string;

  @ApiProperty({ description: 'Budget UUID' })
  @Expose()
  budgetId!: string;

  @ApiProperty({ description: 'Cost Code UUID' })
  @Expose()
  costCodeId!: string;

  @ApiProperty({ description: 'Cost entry type', enum: CostEntryType })
  @Expose()
  type!: CostEntryType;

  @ApiProperty({ description: 'Cost entry status', enum: CostEntryStatus })
  @Expose()
  status!: CostEntryStatus;

  @ApiProperty({ description: 'Date the cost was incurred' })
  @Expose()
  @Type(() => Date)
  entryDate!: Date;

  @ApiProperty({ description: 'Detailed description of the cost entry' })
  @Expose()
  description!: string;

  @ApiProperty({ description: 'Total cost amount' })
  @Expose()
  totalCost!: number;

  @ApiProperty({ description: 'Quantity of units', required: false })
  @Expose()
  quantity?: number;

  @ApiProperty({ description: 'Cost per unit', required: false })
  @Expose()
  unitCost?: number;

  @ApiProperty({ description: 'Vendor or supplier name', required: false })
  @Expose()
  vendor?: string;

  @ApiProperty({ description: 'Invoice or bill number', required: false })
  @Expose()
  invoiceNumber?: string;

  @ApiProperty({ description: 'Commitment UUID', required: false })
  @Expose()
  commitmentId?: string;

  @ApiProperty({ description: 'Payment Application UUID', required: false })
  @Expose()
  paymentApplicationId?: string;

  @ApiProperty({ description: 'Cost Period UUID', required: false })
  @Expose()
  costPeriodId?: string;

  // Workflow tracking fields
  @ApiProperty({ description: 'User who posted the entry', required: false })
  @Expose()
  postedById?: string;

  @ApiProperty({ description: 'Date when the entry was posted', required: false })
  @Expose()
  @Type(() => Date)
  postedAt?: Date;

  @ApiProperty({ description: 'User who voided the entry', required: false })
  @Expose()
  voidedById?: string;

  @ApiProperty({ description: 'Date when the entry was voided', required: false })
  @Expose()
  @Type(() => Date)
  voidedAt?: Date;

  @ApiProperty({ description: 'Reason for voiding the entry', required: false })
  @Expose()
  voidReason?: string;

  @ApiProperty({ description: 'User who created the entry' })
  @Expose()
  createdById!: string;

  @ApiProperty({ description: 'Date when the entry was created' })
  @Expose()
  @Type(() => Date)
  createdAt!: Date;

  @ApiProperty({ description: 'User who last updated the entry', required: false })
  @Expose()
  updatedById?: string;

  @ApiProperty({ description: 'Date when the entry was last updated' })
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

  @ApiProperty({ description: 'Cost code information', type: CostCodeInfoDto, required: false })
  @Expose()
  @Type(() => CostCodeInfoDto)
  costCode?: CostCodeInfoDto;

  @ApiProperty({ description: 'Commitment information', type: CommitmentInfoDto, required: false })
  @Expose()
  @Type(() => CommitmentInfoDto)
  commitment?: CommitmentInfoDto;

  @ApiProperty({ description: 'Payment application information', type: PaymentApplicationInfoDto, required: false })
  @Expose()
  @Type(() => PaymentApplicationInfoDto)
  paymentApplication?: PaymentApplicationInfoDto;

  @ApiProperty({ description: 'Cost period information', type: CostPeriodInfoDto, required: false })
  @Expose()
  @Type(() => CostPeriodInfoDto)
  costPeriod?: CostPeriodInfoDto;

  @ApiProperty({ description: 'User who created the entry', type: UserInfoDto, required: false })
  @Expose()
  @Type(() => UserInfoDto)
  createdBy?: UserInfoDto;

  @ApiProperty({ description: 'User who last updated the entry', type: UserInfoDto, required: false })
  @Expose()
  @Type(() => UserInfoDto)
  updatedBy?: UserInfoDto;

  @ApiProperty({ description: 'User who posted the entry', type: UserInfoDto, required: false })
  @Expose()
  @Type(() => UserInfoDto)
  postedBy?: UserInfoDto;

  @ApiProperty({ description: 'User who voided the entry', type: UserInfoDto, required: false })
  @Expose()
  @Type(() => UserInfoDto)
  voidedBy?: UserInfoDto;
}
