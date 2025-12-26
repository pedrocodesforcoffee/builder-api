import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Custom Report Entity
 *
 * Enables users to create flexible, ad-hoc reports by defining custom queries
 * across financial entities. Reports are configured using a JSON-based structure
 * that supports columns, filters, joins, aggregations, and sorting.
 *
 * Use Cases:
 * - Custom budget reports with specific cost code filters
 * - Vendor-specific financial analysis
 * - Custom change order reports with calculated fields
 * - Project-specific KPI dashboards
 *
 * Features:
 * - Flexible JSONB configuration
 * - Support for 5 primary entities (Budget, Commitment, Cost, PaymentApp, ChangeOrder)
 * - Public/private sharing within project
 * - Full audit trail
 */

export enum PrimaryEntity {
  BUDGET = 'BUDGET',
  COMMITMENT = 'COMMITMENT',
  COST = 'COST',
  PAYAPP = 'PAYAPP',
  CHANGE_ORDER = 'CHANGE_ORDER',
}

export enum ColumnDataType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  CURRENCY = 'CURRENCY',
  DATE = 'DATE',
  PERCENT = 'PERCENT',
}

export enum FilterOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  GREATER_THAN_OR_EQUAL = 'GREATER_THAN_OR_EQUAL',
  LESS_THAN_OR_EQUAL = 'LESS_THAN_OR_EQUAL',
  BETWEEN = 'BETWEEN',
  IN = 'IN',
  NOT_IN = 'NOT_IN',
  CONTAINS = 'CONTAINS',
  STARTS_WITH = 'STARTS_WITH',
  ENDS_WITH = 'ENDS_WITH',
  IS_NULL = 'IS_NULL',
  IS_NOT_NULL = 'IS_NOT_NULL',
}

export enum AggregationFunction {
  SUM = 'SUM',
  AVG = 'AVG',
  MIN = 'MIN',
  MAX = 'MAX',
  COUNT = 'COUNT',
  COUNT_DISTINCT = 'COUNT_DISTINCT',
}

export enum JoinType {
  INNER = 'INNER',
  LEFT = 'LEFT',
}

export interface CustomReportColumnConfig {
  field: string;
  label: string;
  dataType: ColumnDataType;
  width?: number;
  visible: boolean;
  formula?: string; // For calculated columns
}

export interface CustomReportFilterConfig {
  field: string;
  operator: FilterOperator;
  value?: any;
  isParameter: boolean; // If true, value will be provided at runtime
  parameterName?: string; // Name for runtime parameter
}

export interface CustomReportJoinConfig {
  entity: string;
  alias: string;
  on: string; // Join condition (e.g., "budget.id = lineItem.budgetId")
  type: JoinType;
}

export interface CustomReportAggregationConfig {
  field: string;
  function: AggregationFunction;
  label: string;
  alias?: string;
}

export interface CustomReportSortConfig {
  field: string;
  direction: 'ASC' | 'DESC';
}

export interface CustomReportConfig {
  primaryEntity: PrimaryEntity;
  primaryAlias?: string; // Custom alias for primary entity
  joins: CustomReportJoinConfig[];
  columns: CustomReportColumnConfig[];
  filters: CustomReportFilterConfig[];
  groupBy: string[];
  aggregations: CustomReportAggregationConfig[];
  sortBy: CustomReportSortConfig[];
  showTotals: boolean;
  showSubtotals: boolean;
  limit?: number;
  offset?: number;
}

@Entity('custom_reports')
@Index(['projectId'])
@Index(['createdById'])
@Index(['isPublic'])
export class CustomReport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  /**
   * JSONB configuration storing the complete report definition
   * This flexible structure allows for complex custom queries without schema changes
   */
  @Column({ type: 'jsonb' })
  config!: CustomReportConfig;

  /**
   * When true, report is visible to all project members
   * When false, only creator can see/execute the report
   */
  @Column({ name: 'is_public', type: 'boolean', default: false })
  isPublic!: boolean;

  @Column({ name: 'created_by_id', type: 'uuid' })
  createdById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_id' })
  createdBy!: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
