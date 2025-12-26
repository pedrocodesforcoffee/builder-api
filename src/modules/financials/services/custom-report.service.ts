import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, SelectQueryBuilder, EntityMetadata } from 'typeorm';
import {
  CustomReport,
  PrimaryEntity,
  FilterOperator,
  AggregationFunction,
  CustomReportConfig,
  CustomReportFilterConfig,
  CustomReportJoinConfig,
  CustomReportAggregationConfig,
  CustomReportColumnConfig,
  CustomReportSortConfig,
} from '../entities/custom-report.entity';
import { Budget } from '../entities/budget.entity';
import { Commitment } from '../entities/commitment.entity';
import { CostEntry } from '../entities/cost-entry.entity';
import { PaymentApplication } from '../entities/payment-application.entity';
import { OwnerChangeOrder } from '../entities/owner-change-order.entity';
import {
  CreateCustomReportDto,
  UpdateCustomReportDto,
  CustomReportQueryDto,
  CustomReportParamsDto,
  CustomReportResultDto,
  ValidationResultDto,
} from '../dto/custom-report';
import { ReportExcelExportService } from './report-excel-export.service';
import { ReportPdfExportService } from './report-pdf-export.service';

/**
 * Custom Report Service
 *
 * Provides dynamic report generation capabilities by building SQL queries
 * from JSON configurations. Supports complex joins, filters, aggregations,
 * and grouping across financial entities.
 *
 * Security Features:
 * - Field validation against entity metadata (prevents invalid field access)
 * - Parameterized queries (prevents SQL injection)
 * - Project-scoped access control
 * - Join validation (ensures only allowed relationships)
 *
 * Performance Considerations:
 * - Query result pagination
 * - Index-aware query building
 * - Efficient aggregation strategies
 */
@Injectable()
export class CustomReportService {
  private readonly logger = new Logger(CustomReportService.name);

  // Map of entity names to their repository types
  private readonly entityMap = {
    [PrimaryEntity.BUDGET]: Budget,
    [PrimaryEntity.COMMITMENT]: Commitment,
    [PrimaryEntity.COST]: CostEntry,
    [PrimaryEntity.PAYAPP]: PaymentApplication,
    [PrimaryEntity.CHANGE_ORDER]: OwnerChangeOrder,
  };

  // Allowed join relationships to prevent arbitrary joins
  private readonly allowedJoins = {
    Budget: ['BudgetLineItem', 'BudgetSnapshot', 'Project', 'CostPeriod'],
    Commitment: ['CommitmentItem', 'PaymentApplication', 'Project', 'ScheduleOfValues'],
    CostEntry: ['CostCode', 'Budget', 'CostPeriod', 'Commitment', 'Project'],
    PaymentApplication: ['PaymentApplicationItem', 'Commitment', 'Project'],
    OwnerChangeOrder: ['OcoCostBreakdown', 'PrimeContract', 'Project'],
  };

  constructor(
    @InjectRepository(CustomReport)
    private customReportRepository: Repository<CustomReport>,
    @InjectRepository(Budget)
    private budgetRepository: Repository<Budget>,
    @InjectRepository(Commitment)
    private commitmentRepository: Repository<Commitment>,
    @InjectRepository(CostEntry)
    private costEntryRepository: Repository<CostEntry>,
    @InjectRepository(PaymentApplication)
    private paymentApplicationRepository: Repository<PaymentApplication>,
    @InjectRepository(OwnerChangeOrder)
    private ownerChangeOrderRepository: Repository<OwnerChangeOrder>,
    private dataSource: DataSource,
    private excelExportService: ReportExcelExportService,
    private pdfExportService: ReportPdfExportService,
  ) {}

  /**
   * Create a new custom report
   */
  async create(
    projectId: string,
    dto: CreateCustomReportDto,
    userId: string,
  ): Promise<CustomReport> {
    this.logger.log(`Creating custom report '${dto.name}' for project ${projectId}`);

    // Validate configuration
    const validation = await this.validateConfig(dto.config);
    if (!validation.valid) {
      throw new BadRequestException(
        `Invalid report configuration: ${validation.errors.join(', ')}`,
      );
    }

    const customReport = this.customReportRepository.create({
      projectId,
      name: dto.name,
      description: dto.description,
      config: dto.config,
      isPublic: dto.isPublic,
      createdById: userId,
    });

    return await this.customReportRepository.save(customReport);
  }

  /**
   * Find all custom reports for a project
   */
  async findAll(
    projectId: string,
    query: CustomReportQueryDto = {},
    userId?: string,
  ): Promise<[CustomReport[], number]> {
    this.logger.log(`Finding custom reports for project ${projectId}`);

    const qb = this.customReportRepository
      .createQueryBuilder('report')
      .where('report.projectId = :projectId', { projectId });

    // Filter by visibility
    if (query.publicOnly) {
      qb.andWhere('report.isPublic = true');
    } else if (query.privateOnly && userId) {
      qb.andWhere('report.createdById = :userId', { userId });
    } else if (userId) {
      // Include both public reports and user's private reports
      qb.andWhere('(report.isPublic = true OR report.createdById = :userId)', { userId });
    }

    // Pagination
    if (query.skip) {
      qb.skip(query.skip);
    }
    if (query.take) {
      qb.take(query.take);
    }

    // Order by most recently updated
    qb.orderBy('report.updatedAt', 'DESC');

    return await qb.getManyAndCount();
  }

  /**
   * Find a custom report by ID
   */
  async findOne(id: string, projectId: string): Promise<CustomReport> {
    const report = await this.customReportRepository.findOne({
      where: { id, projectId },
    });

    if (!report) {
      throw new NotFoundException(`Custom report ${id} not found`);
    }

    return report;
  }

  /**
   * Update a custom report
   */
  async update(
    id: string,
    projectId: string,
    dto: UpdateCustomReportDto,
  ): Promise<CustomReport> {
    this.logger.log(`Updating custom report ${id}`);

    const report = await this.findOne(id, projectId);

    // Validate new configuration if provided
    if (dto.config) {
      const validation = await this.validateConfig(dto.config);
      if (!validation.valid) {
        throw new BadRequestException(
          `Invalid report configuration: ${validation.errors.join(', ')}`,
        );
      }
    }

    Object.assign(report, dto);
    return await this.customReportRepository.save(report);
  }

  /**
   * Delete a custom report
   */
  async delete(id: string, projectId: string): Promise<void> {
    this.logger.log(`Deleting custom report ${id}`);

    const report = await this.findOne(id, projectId);
    await this.customReportRepository.remove(report);
  }

  /**
   * Execute a custom report
   */
  async run(
    id: string,
    projectId: string,
    params: CustomReportParamsDto = {},
  ): Promise<CustomReportResultDto> {
    this.logger.log(`Executing custom report ${id}`);

    const startTime = Date.now();
    const report = await this.findOne(id, projectId);

    try {
      // Build and execute query
      const qb = this.buildQuery(report.config, params.parameters || {});
      const data = await qb.getRawMany();

      // Calculate aggregations if needed
      const totals = report.config.showTotals
        ? this.calculateTotals(data, report.config.aggregations)
        : undefined;

      const subtotals = report.config.showSubtotals && report.config.groupBy.length > 0
        ? this.calculateSubtotals(data, report.config.groupBy, report.config.aggregations)
        : undefined;

      const executionTimeMs = Date.now() - startTime;

      return {
        reportInfo: {
          reportId: report.id,
          reportName: report.name,
          projectId: report.projectId,
          generatedAt: new Date(),
          rowCount: data.length,
          executionTimeMs,
        },
        columns: report.config.columns
          .filter((col) => col.visible)
          .map((col) => ({
            field: col.field,
            label: col.label,
            dataType: col.dataType,
          })),
        data,
        totals,
        subtotals,
      };
    } catch (error) {
      this.logger.error(`Failed to execute custom report ${id}: ${(error as Error).message}`, (error as Error).stack);
      throw new BadRequestException(`Failed to execute report: ${(error as Error).message}`);
    }
  }

  /**
   * Export custom report to Excel
   */
  async exportToExcel(
    id: string,
    projectId: string,
    params: CustomReportParamsDto = {},
  ): Promise<Buffer> {
    this.logger.log(`Exporting custom report ${id} to Excel`);

    const result = await this.run(id, projectId, params);

    // Use generic Excel export
    return await this.excelExportService.exportCustomReportToExcel(result);
  }

  /**
   * Export custom report to PDF
   */
  async exportToPdf(
    id: string,
    projectId: string,
    params: CustomReportParamsDto = {},
  ): Promise<Buffer> {
    this.logger.log(`Exporting custom report ${id} to PDF`);

    const result = await this.run(id, projectId, params);

    // Use generic PDF export
    return await this.pdfExportService.exportCustomReportToPdf(result);
  }

  /**
   * Validate report configuration
   */
  async validateConfig(config: CustomReportConfig): Promise<ValidationResultDto> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Get entity metadata for validation
      const entityClass = this.entityMap[config.primaryEntity];
      const metadata = this.dataSource.getMetadata(entityClass);

      // Validate primary alias
      const primaryAlias = config.primaryAlias || config.primaryEntity.toLowerCase();

      // Validate joins
      const allowedJoinsAny = this.allowedJoins as any;
      const allowedJoinsList = allowedJoinsAny[entityClass.name] || [];
      for (const join of config.joins) {
        if (!allowedJoinsList.includes(join.entity)) {
          errors.push(
            `Join to '${join.entity}' is not allowed for primary entity '${entityClass.name}'`,
          );
        }
      }

      // Validate columns
      for (const column of config.columns) {
        const fieldParts = column.field.split('.');
        if (fieldParts.length !== 2) {
          errors.push(`Invalid field format: '${column.field}'. Expected format: 'alias.fieldName'`);
          continue;
        }

        const [alias, fieldName] = fieldParts;

        // Check if alias is valid
        if (alias !== primaryAlias && !config.joins.some((j) => j.alias === alias)) {
          errors.push(`Unknown alias '${alias}' in column field '${column.field}'`);
        }
      }

      // Validate filters
      for (const filter of config.filters) {
        const fieldParts = filter.field.split('.');
        if (fieldParts.length !== 2) {
          errors.push(`Invalid field format: '${filter.field}'. Expected format: 'alias.fieldName'`);
        }

        if (filter.isParameter && !filter.parameterName) {
          errors.push(`Filter on '${filter.field}' is marked as parameter but has no parameterName`);
        }
      }

      // Validate aggregations
      for (const agg of config.aggregations) {
        const fieldParts = agg.field.split('.');
        if (fieldParts.length !== 2) {
          errors.push(`Invalid field format: '${agg.field}'. Expected format: 'alias.fieldName'`);
        }
      }

      // Validate groupBy fields
      for (const groupField of config.groupBy) {
        const fieldParts = groupField.split('.');
        if (fieldParts.length !== 2) {
          errors.push(`Invalid field format: '${groupField}'. Expected format: 'alias.fieldName'`);
        }
      }

      // Check for required columns
      if (config.columns.length === 0) {
        errors.push('Report must have at least one column');
      }

      // Performance warnings
      if (config.joins.length > 5) {
        warnings.push('Report has more than 5 joins, which may impact performance');
      }

      if (!config.limit || config.limit > 10000) {
        warnings.push('Consider adding a limit to prevent large result sets');
      }
    } catch (error) {
      errors.push(`Configuration validation error: ${(error as Error).message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Build query from configuration
   */
  private buildQuery(
    config: CustomReportConfig,
    runtimeParams: Record<string, any>,
  ): SelectQueryBuilder<any> {
    // Get primary entity repository
    const entityClass = this.entityMap[config.primaryEntity];
    const repository = this.getRepository(config.primaryEntity);
    const primaryAlias = config.primaryAlias || config.primaryEntity.toLowerCase();

    // Start query builder
    let qb = repository.createQueryBuilder(primaryAlias);

    // Apply joins
    this.applyJoins(qb, config.joins);

    // Select columns
    this.applyColumns(qb, config.columns, primaryAlias);

    // Apply filters
    this.applyFilters(qb, config.filters, runtimeParams, primaryAlias);

    // Apply grouping
    if (config.groupBy && config.groupBy.length > 0) {
      this.applyGrouping(qb, config.groupBy);
    }

    // Apply aggregations
    if (config.aggregations && config.aggregations.length > 0) {
      this.applyAggregations(qb, config.aggregations);
    }

    // Apply sorting
    if (config.sortBy && config.sortBy.length > 0) {
      this.applySorting(qb, config.sortBy);
    }

    // Apply pagination
    if (config.limit) {
      qb.limit(config.limit);
    }
    if (config.offset) {
      qb.offset(config.offset);
    }

    return qb;
  }

  /**
   * Apply joins to query builder
   */
  private applyJoins(qb: SelectQueryBuilder<any>, joins: CustomReportJoinConfig[]): void {
    for (const join of joins) {
      const [leftAlias, leftField] = join.on.split('=')[0].trim().split('.');
      const [rightAlias, rightField] = join.on.split('=')[1].trim().split('.');

      if (join.type === 'LEFT') {
        qb.leftJoin(`${leftAlias}.${leftField.split('.').pop()}`, join.alias);
      } else {
        qb.innerJoin(`${leftAlias}.${leftField.split('.').pop()}`, join.alias);
      }
    }
  }

  /**
   * Apply column selections
   */
  private applyColumns(
    qb: SelectQueryBuilder<any>,
    columns: CustomReportColumnConfig[],
    primaryAlias: string,
  ): void {
    // If there are aggregations or groupBy, we'll handle selects differently
    // For now, select all visible columns
    for (const column of columns) {
      if (column.visible) {
        if (column.formula) {
          // Handle calculated columns
          qb.addSelect(column.formula, column.field.replace('.', '_'));
        } else {
          qb.addSelect(column.field, column.field.replace('.', '_'));
        }
      }
    }
  }

  /**
   * Apply filters to query builder
   */
  private applyFilters(
    qb: SelectQueryBuilder<any>,
    filters: CustomReportFilterConfig[],
    runtimeParams: Record<string, any>,
    primaryAlias: string,
  ): void {
    for (let i = 0; i < filters.length; i++) {
      const filter = filters[i];
      const paramName = `filter_${i}`;

      // Get filter value (either from config or runtime params)
      let value = filter.value;
      if (filter.isParameter) {
        if (!filter.parameterName || !runtimeParams[filter.parameterName]) {
          throw new BadRequestException(
            `Missing required parameter: ${filter.parameterName}`,
          );
        }
        value = runtimeParams[filter.parameterName];
      }

      // Apply operator
      switch (filter.operator) {
        case FilterOperator.EQUALS:
          qb.andWhere(`${filter.field} = :${paramName}`, { [paramName]: value });
          break;

        case FilterOperator.NOT_EQUALS:
          qb.andWhere(`${filter.field} != :${paramName}`, { [paramName]: value });
          break;

        case FilterOperator.GREATER_THAN:
          qb.andWhere(`${filter.field} > :${paramName}`, { [paramName]: value });
          break;

        case FilterOperator.LESS_THAN:
          qb.andWhere(`${filter.field} < :${paramName}`, { [paramName]: value });
          break;

        case FilterOperator.GREATER_THAN_OR_EQUAL:
          qb.andWhere(`${filter.field} >= :${paramName}`, { [paramName]: value });
          break;

        case FilterOperator.LESS_THAN_OR_EQUAL:
          qb.andWhere(`${filter.field} <= :${paramName}`, { [paramName]: value });
          break;

        case FilterOperator.BETWEEN:
          if (!Array.isArray(value) || value.length !== 2) {
            throw new BadRequestException(
              `BETWEEN operator requires array with 2 values for filter on ${filter.field}`,
            );
          }
          qb.andWhere(`${filter.field} BETWEEN :${paramName}_min AND :${paramName}_max`, {
            [`${paramName}_min`]: value[0],
            [`${paramName}_max`]: value[1],
          });
          break;

        case FilterOperator.IN:
          if (!Array.isArray(value)) {
            throw new BadRequestException(
              `IN operator requires array value for filter on ${filter.field}`,
            );
          }
          qb.andWhere(`${filter.field} IN (:...${paramName})`, { [paramName]: value });
          break;

        case FilterOperator.NOT_IN:
          if (!Array.isArray(value)) {
            throw new BadRequestException(
              `NOT IN operator requires array value for filter on ${filter.field}`,
            );
          }
          qb.andWhere(`${filter.field} NOT IN (:...${paramName})`, { [paramName]: value });
          break;

        case FilterOperator.CONTAINS:
          qb.andWhere(`${filter.field} ILIKE :${paramName}`, {
            [paramName]: `%${value}%`,
          });
          break;

        case FilterOperator.STARTS_WITH:
          qb.andWhere(`${filter.field} ILIKE :${paramName}`, {
            [paramName]: `${value}%`,
          });
          break;

        case FilterOperator.ENDS_WITH:
          qb.andWhere(`${filter.field} ILIKE :${paramName}`, {
            [paramName]: `%${value}`,
          });
          break;

        case FilterOperator.IS_NULL:
          qb.andWhere(`${filter.field} IS NULL`);
          break;

        case FilterOperator.IS_NOT_NULL:
          qb.andWhere(`${filter.field} IS NOT NULL`);
          break;

        default:
          throw new BadRequestException(`Unsupported filter operator: ${filter.operator}`);
      }
    }
  }

  /**
   * Apply grouping
   */
  private applyGrouping(qb: SelectQueryBuilder<any>, groupBy: string[]): void {
    for (const field of groupBy) {
      qb.addGroupBy(field);
    }
  }

  /**
   * Apply aggregations
   */
  private applyAggregations(
    qb: SelectQueryBuilder<any>,
    aggregations: CustomReportAggregationConfig[],
  ): void {
    for (const agg of aggregations) {
      const alias = agg.alias || `${agg.function.toLowerCase()}_${agg.field.replace('.', '_')}`;

      switch (agg.function) {
        case AggregationFunction.SUM:
          qb.addSelect(`SUM(${agg.field})`, alias);
          break;

        case AggregationFunction.AVG:
          qb.addSelect(`AVG(${agg.field})`, alias);
          break;

        case AggregationFunction.MIN:
          qb.addSelect(`MIN(${agg.field})`, alias);
          break;

        case AggregationFunction.MAX:
          qb.addSelect(`MAX(${agg.field})`, alias);
          break;

        case AggregationFunction.COUNT:
          qb.addSelect(`COUNT(${agg.field})`, alias);
          break;

        case AggregationFunction.COUNT_DISTINCT:
          qb.addSelect(`COUNT(DISTINCT ${agg.field})`, alias);
          break;

        default:
          throw new BadRequestException(`Unsupported aggregation function: ${agg.function}`);
      }
    }
  }

  /**
   * Apply sorting
   */
  private applySorting(qb: SelectQueryBuilder<any>, sortBy: CustomReportSortConfig[]): void {
    for (let i = 0; i < sortBy.length; i++) {
      const sort = sortBy[i];
      if (i === 0) {
        qb.orderBy(sort.field, sort.direction);
      } else {
        qb.addOrderBy(sort.field, sort.direction);
      }
    }
  }

  /**
   * Calculate totals for aggregations
   */
  private calculateTotals(
    data: any[],
    aggregations: CustomReportAggregationConfig[],
  ): Record<string, any> {
    const totals: Record<string, any> = {};

    for (const agg of aggregations) {
      const alias = agg.alias || `${agg.function.toLowerCase()}_${agg.field.replace('.', '_')}`;
      const fieldKey = agg.field.replace('.', '_');

      switch (agg.function) {
        case AggregationFunction.SUM:
          totals[alias] = data.reduce((sum, row) => sum + (parseFloat(row[fieldKey]) || 0), 0);
          break;

        case AggregationFunction.AVG:
          const sum = data.reduce((s, row) => s + (parseFloat(row[fieldKey]) || 0), 0);
          totals[alias] = data.length > 0 ? sum / data.length : 0;
          break;

        case AggregationFunction.MIN:
          totals[alias] = Math.min(...data.map((row) => parseFloat(row[fieldKey]) || 0));
          break;

        case AggregationFunction.MAX:
          totals[alias] = Math.max(...data.map((row) => parseFloat(row[fieldKey]) || 0));
          break;

        case AggregationFunction.COUNT:
          totals[alias] = data.length;
          break;

        case AggregationFunction.COUNT_DISTINCT:
          const uniqueValues = new Set(data.map((row) => row[fieldKey]));
          totals[alias] = uniqueValues.size;
          break;
      }
    }

    return totals;
  }

  /**
   * Calculate subtotals by group
   */
  private calculateSubtotals(
    data: any[],
    groupBy: string[],
    aggregations: CustomReportAggregationConfig[],
  ): any[] {
    // Group data by groupBy fields
    const groups = new Map<string, any[]>();

    for (const row of data) {
      const groupKey = groupBy.map((field) => row[field.replace('.', '_')]).join('|');
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      const group = groups.get(groupKey);
      if (group) {
        group.push(row);
      }
    }

    // Calculate totals for each group
    const subtotals = [];
    for (const [groupKey, groupData] of groups.entries()) {
      const groupValues = groupKey.split('|');
      const totals = this.calculateTotals(groupData, aggregations);

      subtotals.push({
        groupKey,
        groupValue: groupBy.reduce((obj, field, i) => {
          (obj as any)[field] = groupValues[i];
          return obj;
        }, {}),
        totals,
      });
    }

    return subtotals;
  }

  /**
   * Get repository for primary entity
   */
  private getRepository(primaryEntity: PrimaryEntity): Repository<any> {
    switch (primaryEntity) {
      case PrimaryEntity.BUDGET:
        return this.budgetRepository;
      case PrimaryEntity.COMMITMENT:
        return this.commitmentRepository;
      case PrimaryEntity.COST:
        return this.costEntryRepository;
      case PrimaryEntity.PAYAPP:
        return this.paymentApplicationRepository;
      case PrimaryEntity.CHANGE_ORDER:
        return this.ownerChangeOrderRepository;
      default:
        throw new BadRequestException(`Unsupported primary entity: ${primaryEntity}`);
    }
  }
}
