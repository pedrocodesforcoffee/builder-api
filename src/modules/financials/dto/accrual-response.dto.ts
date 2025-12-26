import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { AccrualStatus } from '../enums';

/**
 * Nested Project DTO for Accrual Response
 */
class ProjectInfo {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 'Downtown Office Tower' })
  @Expose()
  name!: string;
}

/**
 * Nested Budget DTO for Accrual Response
 */
class BudgetInfo {
  @ApiProperty({ example: '223e4567-e89b-12d3-a456-426614174001' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 'Original Budget' })
  @Expose()
  name!: string;
}

/**
 * Nested Cost Code DTO for Accrual Response
 */
class CostCodeInfo {
  @ApiProperty({ example: '323e4567-e89b-12d3-a456-426614174002' })
  @Expose()
  id!: string;

  @ApiProperty({ example: '03-3000' })
  @Expose()
  code!: string;

  @ApiProperty({ example: 'Concrete' })
  @Expose()
  name!: string;
}

/**
 * Nested Commitment DTO for Accrual Response
 */
class CommitmentInfo {
  @ApiProperty({ example: '423e4567-e89b-12d3-a456-426614174003' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 'SUB-2025-00123' })
  @Expose()
  commitmentNumber!: string;

  @ApiProperty({ example: 'ABC Contractors Inc' })
  @Expose()
  vendorName!: string;
}

/**
 * Nested Cost Period DTO for Accrual Response
 */
class CostPeriodInfo {
  @ApiProperty({ example: '523e4567-e89b-12d3-a456-426614174004' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 'November 2025' })
  @Expose()
  periodName!: string;

  @ApiProperty({ example: '2025-11-01' })
  @Expose()
  startDate!: Date;

  @ApiProperty({ example: '2025-11-30' })
  @Expose()
  endDate!: Date;
}

/**
 * Nested User DTO for Accrual Response
 */
class UserInfo {
  @ApiProperty({ example: '623e4567-e89b-12d3-a456-426614174005' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 'John' })
  @Expose()
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @Expose()
  lastName!: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @Expose()
  email!: string;
}

/**
 * Nested Converted Entry DTO for Accrual Response
 */
class ConvertedEntryInfo {
  @ApiProperty({ example: '723e4567-e89b-12d3-a456-426614174006' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 'CE-2025-00456' })
  @Expose()
  entryNumber!: string;

  @ApiProperty({ example: 18500.0 })
  @Expose()
  actualCost!: number;
}

/**
 * Accrual Response DTO
 *
 * Complete response object for accrual data, including all related entity information.
 * This DTO is returned by GET endpoints and includes nested objects for related entities
 * to provide comprehensive information in a single response.
 *
 * **Nested Objects:**
 * - project: Basic project information (id, name)
 * - budget: Basic budget information (id, name)
 * - costCode: Cost code details (id, code, name)
 * - commitment: Optional commitment details (id, number, vendor)
 * - costPeriod: Optional period information (id, name, dates)
 * - createdBy: User who created the accrual
 * - reversedBy: Optional user who reversed the accrual
 * - convertedEntry: Optional cost entry created from conversion
 *
 * @class AccrualResponseDto
 */
export class AccrualResponseDto {
  /**
   * Unique accrual identifier
   */
  @ApiProperty({
    description: 'Unique accrual UUID',
    example: '823e4567-e89b-12d3-a456-426614174007',
  })
  @Expose()
  id!: string;

  /**
   * Auto-generated accrual number
   */
  @ApiProperty({
    description: 'Auto-generated accrual number',
    example: 'AC-2025-00123',
  })
  @Expose()
  accrualNumber!: string;

  /**
   * Project ID
   */
  @ApiProperty({
    description: 'Project UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  projectId!: string;

  /**
   * Budget ID
   */
  @ApiProperty({
    description: 'Budget UUID',
    example: '223e4567-e89b-12d3-a456-426614174001',
  })
  @Expose()
  budgetId!: string;

  /**
   * Cost Code ID
   */
  @ApiProperty({
    description: 'Cost Code UUID',
    example: '323e4567-e89b-12d3-a456-426614174002',
  })
  @Expose()
  costCodeId!: string;

  /**
   * Commitment ID (optional)
   */
  @ApiPropertyOptional({
    description: 'Optional Commitment UUID',
    example: '423e4567-e89b-12d3-a456-426614174003',
  })
  @Expose()
  commitmentId?: string;

  /**
   * Cost Period ID (optional)
   */
  @ApiPropertyOptional({
    description: 'Optional Cost Period UUID',
    example: '523e4567-e89b-12d3-a456-426614174004',
  })
  @Expose()
  costPeriodId?: string;

  /**
   * Description of the accrued cost
   */
  @ApiProperty({
    description: 'Description of the accrued cost',
    example: 'Estimated subcontractor labor for foundation work completed in November',
  })
  @Expose()
  description!: string;

  /**
   * Estimated cost amount
   */
  @ApiProperty({
    description: 'Estimated cost amount',
    example: 15000.0,
    type: 'number',
  })
  @Expose()
  estimatedCost!: number;

  /**
   * Current status of the accrual
   */
  @ApiProperty({
    description: 'Current status of the accrual',
    enum: AccrualStatus,
    example: AccrualStatus.ACTIVE,
  })
  @Expose()
  status!: AccrualStatus;

  /**
   * Date of the accrual
   */
  @ApiProperty({
    description: 'Date when the cost was incurred',
    example: '2025-11-30',
    type: 'string',
    format: 'date',
  })
  @Expose()
  accrualDate!: Date;

  /**
   * Timestamp when accrual was reversed
   */
  @ApiPropertyOptional({
    description: 'Timestamp when accrual was reversed',
    example: '2025-12-05T14:30:00Z',
  })
  @Expose()
  reversedAt?: Date;

  /**
   * User ID who reversed the accrual
   */
  @ApiPropertyOptional({
    description: 'User ID who reversed the accrual',
    example: '923e4567-e89b-12d3-a456-426614174008',
  })
  @Expose()
  reversedById?: string;

  /**
   * Reason for reversing the accrual
   */
  @ApiPropertyOptional({
    description: 'Reason for reversing the accrual',
    example: 'Invoice received with different amount',
  })
  @Expose()
  reversalReason?: string;

  /**
   * Cost Entry ID when converted to actual cost
   */
  @ApiPropertyOptional({
    description: 'Cost Entry ID when accrual was converted to actual cost',
    example: '723e4567-e89b-12d3-a456-426614174006',
  })
  @Expose()
  convertedEntryId?: string;

  /**
   * Additional notes
   */
  @ApiPropertyOptional({
    description: 'Additional notes or comments',
    example: 'Follow up with ABC Contractors for final invoice',
  })
  @Expose()
  notes?: string;

  /**
   * User ID who created the accrual
   */
  @ApiProperty({
    description: 'User ID who created the accrual',
    example: '623e4567-e89b-12d3-a456-426614174005',
  })
  @Expose()
  createdById!: string;

  /**
   * Timestamp when accrual was created
   */
  @ApiProperty({
    description: 'Timestamp when accrual was created',
    example: '2025-11-30T10:00:00Z',
  })
  @Expose()
  createdAt!: Date;

  /**
   * Timestamp when accrual was last updated
   */
  @ApiProperty({
    description: 'Timestamp when accrual was last updated',
    example: '2025-12-01T15:30:00Z',
  })
  @Expose()
  updatedAt!: Date;

  // ==================== NESTED RELATIONSHIPS ====================

  /**
   * Project information
   */
  @ApiProperty({
    description: 'Project information',
    type: ProjectInfo,
  })
  @Expose()
  @Type(() => ProjectInfo)
  project!: ProjectInfo;

  /**
   * Budget information
   */
  @ApiProperty({
    description: 'Budget information',
    type: BudgetInfo,
  })
  @Expose()
  @Type(() => BudgetInfo)
  budget!: BudgetInfo;

  /**
   * Cost Code information
   */
  @ApiProperty({
    description: 'Cost Code information',
    type: CostCodeInfo,
  })
  @Expose()
  @Type(() => CostCodeInfo)
  costCode!: CostCodeInfo;

  /**
   * Commitment information (optional)
   */
  @ApiPropertyOptional({
    description: 'Optional Commitment information',
    type: CommitmentInfo,
  })
  @Expose()
  @Type(() => CommitmentInfo)
  commitment?: CommitmentInfo;

  /**
   * Cost Period information (optional)
   */
  @ApiPropertyOptional({
    description: 'Optional Cost Period information',
    type: CostPeriodInfo,
  })
  @Expose()
  @Type(() => CostPeriodInfo)
  costPeriod?: CostPeriodInfo;

  /**
   * User who created the accrual
   */
  @ApiProperty({
    description: 'User who created the accrual',
    type: UserInfo,
  })
  @Expose()
  @Type(() => UserInfo)
  createdBy!: UserInfo;

  /**
   * User who reversed the accrual (optional)
   */
  @ApiPropertyOptional({
    description: 'Optional user who reversed the accrual',
    type: UserInfo,
  })
  @Expose()
  @Type(() => UserInfo)
  reversedBy?: UserInfo;

  /**
   * Converted cost entry information (optional)
   */
  @ApiPropertyOptional({
    description: 'Optional converted cost entry information',
    type: ConvertedEntryInfo,
  })
  @Expose()
  @Type(() => ConvertedEntryInfo)
  convertedEntry?: ConvertedEntryInfo;
}
