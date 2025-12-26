import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Budget } from '../entities/budget.entity';
import { BudgetLineItem } from '../entities/budget-line-item.entity';
import { BudgetSnapshot } from '../entities/budget-snapshot.entity';
import { CostCode } from '../entities/cost-code.entity';
import { BudgetCategory } from '../enums/budget-category.enum';
import {
  BudgetSnapshotComparisonDto,
  BaselineBudgetDto,
  ComparisonBudgetDto,
  SnapshotVarianceDto,
  LineItemChangeDto,
} from '../dto/budget-snapshot-comparison.dto';

/**
 * Budget Calculation Service
 *
 * Provides calculation, aggregation, and analysis functionality for budgets.
 * Handles:
 * - Total budget calculation from line items
 * - Category-wise aggregations
 * - Cost code hierarchy aggregations
 * - Variance analysis (planned vs actual)
 * - Budget utilization metrics
 */
@Injectable()
export class BudgetCalculationService {
  private readonly logger = new Logger(BudgetCalculationService.name);

  constructor(
    @InjectRepository(Budget)
    private readonly budgetRepo: Repository<Budget>,
    @InjectRepository(BudgetLineItem)
    private readonly lineItemRepo: Repository<BudgetLineItem>,
    @InjectRepository(BudgetSnapshot)
    private readonly snapshotRepo: Repository<BudgetSnapshot>,
    @InjectRepository(CostCode)
    private readonly costCodeRepo: Repository<CostCode>,
  ) {}

  /**
   * Calculate total budgeted cost from line items
   *
   * @param budgetId - Budget ID
   * @returns Total budgeted cost
   */
  async calculateBudgetTotal(budgetId: string): Promise<number> {
    this.logger.debug(`Calculating total for budget ${budgetId}`);

    const result = await this.lineItemRepo
      .createQueryBuilder('item')
      .select('SUM(item.budgeted_cost)', 'total')
      .where('item.budget_id = :budgetId', { budgetId })
      .getRawOne();

    return result?.total ? Number(result.total) : 0;
  }

  /**
   * Get budget breakdown by category
   *
   * Returns the total budgeted cost for each budget category.
   *
   * @param budgetId - Budget ID
   * @returns Object with category totals
   */
  async getBudgetByCategory(budgetId: string): Promise<{
    [key in BudgetCategory]: number;
  }> {
    this.logger.debug(`Getting category breakdown for budget ${budgetId}`);

    const results = await this.lineItemRepo
      .createQueryBuilder('item')
      .select('item.category', 'category')
      .addSelect('SUM(item.budgeted_cost)', 'total')
      .where('item.budget_id = :budgetId', { budgetId })
      .groupBy('item.category')
      .getRawMany();

    // Initialize all categories with 0
    const breakdown: any = {
      [BudgetCategory.LABOR]: 0,
      [BudgetCategory.MATERIAL]: 0,
      [BudgetCategory.EQUIPMENT]: 0,
      [BudgetCategory.SUBCONTRACT]: 0,
      [BudgetCategory.OTHER]: 0,
    };

    // Fill in actual values
    results.forEach((row) => {
      breakdown[row.category as BudgetCategory] = Number(row.total);
    });

    return breakdown;
  }

  /**
   * Get budget breakdown by cost code
   *
   * Returns the total budgeted cost for each cost code.
   * Optionally includes hierarchy (parent codes).
   *
   * @param budgetId - Budget ID
   * @param includeHierarchy - Include parent cost codes in aggregation
   * @returns Array of cost code breakdowns
   */
  async getBudgetByCostCode(
    budgetId: string,
    includeHierarchy = false,
  ): Promise<
    Array<{
      costCodeId: string;
      costCode: string;
      costCodeName: string;
      total: number;
      lineItemCount: number;
    }>
  > {
    this.logger.debug(
      `Getting cost code breakdown for budget ${budgetId} (hierarchy: ${includeHierarchy})`,
    );

    const results = await this.lineItemRepo
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.costCode', 'costCode')
      .select('costCode.id', 'costCodeId')
      .addSelect('costCode.code', 'costCode')
      .addSelect('costCode.name', 'costCodeName')
      .addSelect('SUM(item.budgeted_cost)', 'total')
      .addSelect('COUNT(item.id)', 'lineItemCount')
      .where('item.budget_id = :budgetId', { budgetId })
      .groupBy('costCode.id')
      .addGroupBy('costCode.code')
      .addGroupBy('costCode.name')
      .orderBy('costCode.code', 'ASC')
      .getRawMany();

    return results.map((row) => ({
      costCodeId: row.costCodeId,
      costCode: row.costCode,
      costCodeName: row.costCodeName,
      total: Number(row.total),
      lineItemCount: Number(row.lineItemCount),
    }));
  }

  /**
   * Get budget summary
   *
   * Returns comprehensive budget summary including:
   * - Total budgeted cost
   * - Category breakdown
   * - Top cost codes
   * - Line item statistics
   *
   * @param budgetId - Budget ID
   * @returns Budget summary object
   */
  async getBudgetSummary(budgetId: string): Promise<{
    budgetId: string;
    totalBudget: number;
    lineItemCount: number;
    categoryBreakdown: { [key in BudgetCategory]: number };
    topCostCodes: Array<{
      costCode: string;
      costCodeName: string;
      total: number;
      percentage: number;
    }>;
  }> {
    this.logger.debug(`Getting summary for budget ${budgetId}`);

    // Calculate total and line item count
    const totalResult = await this.lineItemRepo
      .createQueryBuilder('item')
      .select('SUM(item.budgeted_cost)', 'total')
      .addSelect('COUNT(item.id)', 'count')
      .where('item.budget_id = :budgetId', { budgetId })
      .getRawOne();

    const totalBudget = totalResult?.total ? Number(totalResult.total) : 0;
    const lineItemCount = totalResult?.count ? Number(totalResult.count) : 0;

    // Get category breakdown
    const categoryBreakdown = await this.getBudgetByCategory(budgetId);

    // Get top 5 cost codes
    const costCodeBreakdown = await this.getBudgetByCostCode(budgetId, false);
    const topCostCodes = costCodeBreakdown
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map((item) => ({
        costCode: item.costCode,
        costCodeName: item.costCodeName,
        total: item.total,
        percentage: totalBudget > 0 ? (item.total / totalBudget) * 100 : 0,
      }));

    return {
      budgetId,
      totalBudget,
      lineItemCount,
      categoryBreakdown,
      topCostCodes,
    };
  }

  /**
   * Recalculate and update budget total
   *
   * Recalculates the total from line items and updates the budget entity.
   * Should be called after line item changes.
   *
   * @param budgetId - Budget ID
   * @returns Updated total
   */
  async recalculateAndUpdateBudgetTotal(budgetId: string): Promise<number> {
    this.logger.log(`Recalculating total for budget ${budgetId}`);

    const total = await this.calculateBudgetTotal(budgetId);

    await this.budgetRepo.update(budgetId, {
      totalBudget: total,
    });

    this.logger.debug(`Updated budget ${budgetId} total to ${total}`);

    return total;
  }

  /**
   * Validate budget line item calculations
   *
   * Checks if the line item's budgeted cost matches quantity × unit cost.
   * Returns validation errors if inconsistencies are found.
   *
   * @param lineItem - Budget line item to validate
   * @returns Validation result with errors
   */
  validateLineItemCalculation(lineItem: Partial<BudgetLineItem>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // If quantity and unit cost are provided, verify budgeted cost
    if (
      lineItem.quantity !== null &&
      lineItem.quantity !== undefined &&
      lineItem.unitCost !== null &&
      lineItem.unitCost !== undefined
    ) {
      const calculated =
        Number(lineItem.quantity) * Number(lineItem.unitCost);
      const provided = Number(lineItem.budgetedCost);

      // Allow small floating point differences (0.01)
      if (Math.abs(calculated - provided) > 0.01) {
        errors.push(
          `Budgeted cost (${provided}) does not match quantity × unit cost (${calculated})`,
        );
      }
    }

    // Validate non-negative values
    if (
      lineItem.budgetedCost !== null &&
      lineItem.budgetedCost !== undefined &&
      Number(lineItem.budgetedCost) < 0
    ) {
      errors.push('Budgeted cost must be non-negative');
    }

    if (
      lineItem.quantity !== null &&
      lineItem.quantity !== undefined &&
      Number(lineItem.quantity) < 0
    ) {
      errors.push('Quantity must be non-negative');
    }

    if (
      lineItem.unitCost !== null &&
      lineItem.unitCost !== undefined &&
      Number(lineItem.unitCost) < 0
    ) {
      errors.push('Unit cost must be non-negative');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Compare two budgets
   *
   * Compares two budgets and returns the differences.
   * Useful for analyzing revisions or comparing original vs. revised budgets.
   *
   * @param budget1Id - First budget ID (e.g., original)
   * @param budget2Id - Second budget ID (e.g., revised)
   * @returns Comparison result
   */
  async compareBudgets(
    budget1Id: string,
    budget2Id: string,
  ): Promise<{
    budget1Total: number;
    budget2Total: number;
    difference: number;
    percentageChange: number;
    categoryComparison: Array<{
      category: BudgetCategory;
      budget1: number;
      budget2: number;
      difference: number;
      percentageChange: number;
    }>;
  }> {
    this.logger.debug(`Comparing budgets ${budget1Id} and ${budget2Id}`);

    // Get totals
    const budget1Total = await this.calculateBudgetTotal(budget1Id);
    const budget2Total = await this.calculateBudgetTotal(budget2Id);

    const difference = budget2Total - budget1Total;
    const percentageChange =
      budget1Total > 0 ? (difference / budget1Total) * 100 : 0;

    // Get category breakdowns
    const budget1Categories = await this.getBudgetByCategory(budget1Id);
    const budget2Categories = await this.getBudgetByCategory(budget2Id);

    // Compare categories
    const categoryComparison = Object.values(BudgetCategory).map(
      (category) => {
        const cat1 = budget1Categories[category];
        const cat2 = budget2Categories[category];
        const catDiff = cat2 - cat1;
        const catPercent = cat1 > 0 ? (catDiff / cat1) * 100 : 0;

        return {
          category,
          budget1: cat1,
          budget2: cat2,
          difference: catDiff,
          percentageChange: catPercent,
        };
      },
    );

    return {
      budget1Total,
      budget2Total,
      difference,
      percentageChange,
      categoryComparison,
    };
  }

  /**
   * Compare Budget Snapshot to Current Budget
   *
   * Compares a historical snapshot to the current budget state,
   * providing detailed line-by-line variance analysis.
   *
   * @param snapshotId - Snapshot ID (historical state)
   * @param budgetId - Budget ID (current state)
   * @returns Comprehensive comparison with line item changes
   */
  async compareSnapshotToBudget(
    snapshotId: string,
    budgetId: string,
  ): Promise<BudgetSnapshotComparisonDto> {
    this.logger.debug(
      `Comparing snapshot ${snapshotId} to budget ${budgetId}`,
    );

    // Fetch snapshot with data
    const snapshot = await this.snapshotRepo.findOne({
      where: { id: snapshotId },
    });

    if (!snapshot) {
      throw new Error('Snapshot not found');
    }

    // Fetch current budget with line items and cost codes
    const budget = await this.budgetRepo.findOne({
      where: { id: budgetId },
      relations: ['lineItems', 'lineItems.costCode'],
    });

    if (!budget) {
      throw new Error('Budget not found');
    }

    // Extract snapshot data
    const snapshotData = snapshot.snapshotData as {
      budget: Record<string, any>;
      lineItems: Record<string, any>[];
    };

    // Build baseline info from snapshot
    const baseline: BaselineBudgetDto = {
      budgetId: snapshot.id,
      name: snapshot.name,
      totalBudget: Number(snapshot.revisedAmount),
      snapshotDate: snapshot.createdAt.toISOString(),
    };

    // Build comparison info from current budget
    const comparison: ComparisonBudgetDto = {
      budgetId: budget.id,
      name: budget.name,
      totalBudget: budget.totalBudget,
      snapshotDate: null,
    };

    // Create maps for efficient lookup
    const snapshotLineItemsMap = new Map<string, Record<string, any>>();
    snapshotData.lineItems?.forEach((item) => {
      snapshotLineItemsMap.set(item.costCodeId || item.costCode, item);
    });

    const currentLineItemsMap = new Map<string, BudgetLineItem>();
    budget.lineItems?.forEach((item) => {
      currentLineItemsMap.set(item.costCodeId, item);
    });

    // Get all unique cost codes
    const allCostCodeIds = new Set([
      ...snapshotLineItemsMap.keys(),
      ...currentLineItemsMap.keys(),
    ]);

    // Compare line items
    const lineItemChanges: LineItemChangeDto[] = [];

    for (const costCodeId of allCostCodeIds) {
      const snapshotItem = snapshotLineItemsMap.get(costCodeId);
      const currentItem = currentLineItemsMap.get(costCodeId);

      const baselineAmount = snapshotItem
        ? Number(snapshotItem.budgetedCost || 0)
        : 0;
      const comparisonAmount = currentItem
        ? Number(currentItem.budgetedCost)
        : 0;

      const difference = comparisonAmount - baselineAmount;
      const percentChange =
        baselineAmount > 0 ? (difference / baselineAmount) * 100 : 0;

      // Determine change type
      let changeType: 'added' | 'removed' | 'changed' | 'unchanged';
      if (!snapshotItem && currentItem) {
        changeType = 'added';
      } else if (snapshotItem && !currentItem) {
        changeType = 'removed';
      } else if (Math.abs(difference) < 0.01) {
        changeType = 'unchanged';
      } else {
        changeType = 'changed';
      }

      // Get cost code name
      let costCodeName = '';
      let costCode = '';
      if (currentItem?.costCode) {
        costCodeName = currentItem.costCode.description;
        costCode = currentItem.costCode.code;
      } else if (snapshotItem) {
        costCodeName = snapshotItem.costCodeName || '';
        costCode = snapshotItem.costCode || '';
      }

      lineItemChanges.push({
        costCode,
        costCodeName,
        baselineAmount,
        comparisonAmount,
        difference,
        percentChange,
        changeType,
      });
    }

    // Calculate total difference
    const totalDifference = comparison.totalBudget - baseline.totalBudget;
    const percentChange =
      baseline.totalBudget > 0
        ? (totalDifference / baseline.totalBudget) * 100
        : 0;

    // Build variance analysis
    const variance: SnapshotVarianceDto = {
      totalDifference,
      percentChange,
      lineItemChanges,
    };

    return {
      baseline,
      comparison,
      variance,
    };
  }
}
