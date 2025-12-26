import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Decimal from 'decimal.js';
import { OwnerChangeOrder } from '../entities/owner-change-order.entity';
import { CommitmentChangeOrder } from '../entities/commitment-change-order.entity';
import { OcoCostBreakdown } from '../entities/oco-cost-breakdown.entity';
import { CcoLineItem } from '../entities/cco-line-item.entity';
import { Budget } from '../entities/budget.entity';
import { BudgetLineItem } from '../entities/budget-line-item.entity';
import { CostCode } from '../entities/cost-code.entity';
import { MarkupConfigDto, BudgetImpactDto, COSummaryDto } from '../dto';
import { OcoStatus } from '../enums/oco-status.enum';
import { CcoStatus } from '../enums/cco-status.enum';
import { BudgetStatus } from '../enums/budget-status.enum';

/**
 * Cost Breakdown Interface
 *
 * Represents the cost breakdown structure for markup calculations.
 */
export interface COCostBreakdown {
  laborCost?: number;
  materialCost?: number;
  equipmentCost?: number;
  subcontractCost?: number;
  otherCost?: number;
}

/**
 * Change Order Calculation Service
 *
 * Handles all cost breakdown and budget impact calculations for change orders.
 * Provides precision calculations using Decimal.js for financial accuracy.
 *
 * Features:
 * - Cost total calculations with Decimal precision
 * - Markup calculations (overhead, profit, bond, insurance)
 * - Budget impact analysis for OCO and CCO
 * - Project-wide change order summaries
 */
@Injectable()
export class ChangeOrderCalculationService {
  private readonly logger = new Logger(ChangeOrderCalculationService.name);

  constructor(
    @InjectRepository(OwnerChangeOrder)
    private readonly ocoRepo: Repository<OwnerChangeOrder>,
    @InjectRepository(CommitmentChangeOrder)
    private readonly ccoRepo: Repository<CommitmentChangeOrder>,
    @InjectRepository(OcoCostBreakdown)
    private readonly ocoCostBreakdownRepo: Repository<OcoCostBreakdown>,
    @InjectRepository(CcoLineItem)
    private readonly ccoLineItemRepo: Repository<CcoLineItem>,
    @InjectRepository(Budget)
    private readonly budgetRepo: Repository<Budget>,
    @InjectRepository(BudgetLineItem)
    private readonly budgetLineItemRepo: Repository<BudgetLineItem>,
    @InjectRepository(CostCode)
    private readonly costCodeRepo: Repository<CostCode>,
  ) {}

  /**
   * Calculate total from cost breakdown
   *
   * Sums all cost categories (labor, material, equipment, subcontract, other).
   *
   * @param breakdown - Cost breakdown object
   * @returns Total as Decimal
   */
  calculateTotal(breakdown: COCostBreakdown): Decimal {
    this.logger.debug('Calculating total from cost breakdown');

    const labor = new Decimal(breakdown.laborCost || 0);
    const material = new Decimal(breakdown.materialCost || 0);
    const equipment = new Decimal(breakdown.equipmentCost || 0);
    const subcontract = new Decimal(breakdown.subcontractCost || 0);
    const other = new Decimal(breakdown.otherCost || 0);

    const total = labor.plus(material).plus(equipment).plus(subcontract).plus(other);

    this.logger.debug(`Total calculated: ${total.toFixed(2)}`);
    return total;
  }

  /**
   * Calculate markup amounts
   *
   * Applies markup percentages to base cost according to specified logic:
   * 1. overheadAmount = directCostSubtotal × (overheadPercent / 100)
   * 2. profitAmount = (directCostSubtotal + overheadAmount) × (profitPercent / 100)
   * 3. bondAmount = (directCostSubtotal + overheadAmount + profitAmount) × (bondPercent / 100)
   * 4. insuranceAmount = (directCostSubtotal + overheadAmount + profitAmount) × (insurancePercent / 100)
   *
   * @param breakdown - Cost breakdown object
   * @param markupConfig - Markup configuration with percentages
   * @returns Markup amount as Decimal
   */
  calculateMarkup(breakdown: COCostBreakdown, markupConfig: MarkupConfigDto): Decimal {
    this.logger.debug('Calculating markup amounts');

    const directCostSubtotal = this.calculateTotal(breakdown);

    // Default percentages to 0 if not provided
    const overheadPercent = new Decimal(markupConfig.overheadPercent || 0);
    const profitPercent = new Decimal(markupConfig.profitPercent || 0);
    const bondPercent = new Decimal(markupConfig.bondPercent || 0);
    const insurancePercent = new Decimal(markupConfig.insurancePercent || 0);

    // Calculate overhead
    const overheadAmount = directCostSubtotal.times(overheadPercent.dividedBy(100));

    // Calculate profit (on direct + overhead)
    const baseForProfit = directCostSubtotal.plus(overheadAmount);
    const profitAmount = baseForProfit.times(profitPercent.dividedBy(100));

    // Calculate bond (on direct + overhead + profit)
    const baseForBondAndInsurance = baseForProfit.plus(profitAmount);
    const bondAmount = baseForBondAndInsurance.times(bondPercent.dividedBy(100));

    // Calculate insurance (on direct + overhead + profit)
    const insuranceAmount = baseForBondAndInsurance.times(insurancePercent.dividedBy(100));

    // Total markup
    const totalMarkup = overheadAmount.plus(profitAmount).plus(bondAmount).plus(insuranceAmount);

    this.logger.debug(`Markup breakdown - Overhead: ${overheadAmount.toFixed(2)}, Profit: ${profitAmount.toFixed(2)}, Bond: ${bondAmount.toFixed(2)}, Insurance: ${insuranceAmount.toFixed(2)}, Total: ${totalMarkup.toFixed(2)}`);

    return totalMarkup;
  }

  /**
   * Calculate total with markup
   *
   * Calculates the final total including all markup amounts.
   *
   * Formula:
   * totalAmount = directCostSubtotal + overheadAmount + profitAmount + bondAmount + insuranceAmount
   *
   * @param breakdown - Cost breakdown object
   * @param markupConfig - Markup configuration with percentages
   * @returns Total with markup as Decimal
   */
  calculateWithMarkup(breakdown: COCostBreakdown, markupConfig: MarkupConfigDto): Decimal {
    this.logger.debug('Calculating total with markup');

    const directCostSubtotal = this.calculateTotal(breakdown);
    const markupAmount = this.calculateMarkup(breakdown, markupConfig);
    const totalWithMarkup = directCostSubtotal.plus(markupAmount);

    this.logger.debug(`Total with markup: ${totalWithMarkup.toFixed(2)}`);
    return totalWithMarkup;
  }

  /**
   * Calculate budget impact for a change order
   *
   * Analyzes how a change order affects the project budget.
   * Returns current vs projected budget totals and cost code breakdown.
   *
   * @param changeOrderId - Change order ID
   * @param type - Change order type ('OCO' or 'CCO')
   * @returns Budget impact details
   */
  async calculateBudgetImpact(
    changeOrderId: string,
    type: 'OCO' | 'CCO',
  ): Promise<BudgetImpactDto> {
    this.logger.log(`Calculating budget impact for ${type} ${changeOrderId}`);

    // Fetch change order
    let changeOrder: OwnerChangeOrder | CommitmentChangeOrder;
    let projectId: string;
    let amount: number;

    if (type === 'OCO') {
      const oco = await this.ocoRepo.findOne({
        where: { id: changeOrderId },
        relations: ['costBreakdowns', 'costBreakdowns.costCode'],
      });
      if (!oco) {
        throw new NotFoundException(`OCO with ID ${changeOrderId} not found`);
      }
      changeOrder = oco;
      projectId = oco.projectId;
      amount = Number(oco.amount);
    } else {
      const cco = await this.ccoRepo.findOne({
        where: { id: changeOrderId },
        relations: ['lineItems', 'lineItems.costCode'],
      });
      if (!cco) {
        throw new NotFoundException(`CCO with ID ${changeOrderId} not found`);
      }
      changeOrder = cco;
      projectId = cco.projectId;
      amount = Number(cco.amount);
    }

    // Get current budget total
    const budget = await this.budgetRepo.findOne({
      where: { projectId, status: BudgetStatus.ACTIVE },
    });

    const currentBudgetTotal = budget ? Number(budget.totalBudget) : 0;
    const projectedBudgetTotal = currentBudgetTotal + amount;
    const budgetImpact = amount;
    const percentageImpact = currentBudgetTotal > 0 ? (budgetImpact / currentBudgetTotal) * 100 : 0;

    // Build cost code breakdown
    const costCodeBreakdown: Array<{
      costCodeId: string;
      costCode: string;
      costCodeName: string;
      amount: number;
      currentBudget: number;
      projectedBudget: number;
    }> = [];

    if (type === 'OCO' && 'costBreakdowns' in changeOrder) {
      for (const breakdown of changeOrder.costBreakdowns || []) {
        if (breakdown.costCodeId) {
          const costCode = breakdown.costCode;
          const breakdownAmount = Number(breakdown.amount);

          // Get current budget for this cost code
          const lineItem = await this.budgetLineItemRepo.findOne({
            where: { budgetId: budget?.id, costCodeId: breakdown.costCodeId },
          });
          const currentBudget = lineItem ? Number(lineItem.budgetedCost) : 0;
          const projectedBudget = currentBudget + breakdownAmount;

          costCodeBreakdown.push({
            costCodeId: breakdown.costCodeId,
            costCode: costCode?.code || 'N/A',
            costCodeName: costCode?.name || 'N/A',
            amount: breakdownAmount,
            currentBudget,
            projectedBudget,
          });
        }
      }
    } else if (type === 'CCO' && 'lineItems' in changeOrder) {
      for (const lineItem of changeOrder.lineItems || []) {
        if (lineItem.costCodeId) {
          const costCode = lineItem.costCode;
          const lineAmount = Number(lineItem.amount);

          // Get current budget for this cost code
          const budgetLineItem = await this.budgetLineItemRepo.findOne({
            where: { budgetId: budget?.id, costCodeId: lineItem.costCodeId },
          });
          const currentBudget = budgetLineItem ? Number(budgetLineItem.budgetedCost) : 0;
          const projectedBudget = currentBudget + lineAmount;

          costCodeBreakdown.push({
            costCodeId: lineItem.costCodeId,
            costCode: costCode?.code || 'N/A',
            costCodeName: costCode?.name || 'N/A',
            amount: lineAmount,
            currentBudget,
            projectedBudget,
          });
        }
      }
    }

    return {
      changeOrderId,
      changeOrderType: type,
      changeOrderAmount: amount,
      currentBudgetTotal,
      projectedBudgetTotal,
      budgetImpact,
      percentageImpact,
      costCodeBreakdown,
    };
  }

  /**
   * Calculate project change order summary
   *
   * Aggregates all change orders (OCO and CCO) in a project.
   * Provides comprehensive statistics by status and type.
   *
   * @param projectId - Project ID
   * @returns Change order summary
   */
  async calculateProjectCOSummary(projectId: string): Promise<COSummaryDto> {
    this.logger.log(`Calculating change order summary for project ${projectId}`);

    // Fetch all OCOs for project
    const ocos = await this.ocoRepo.find({ where: { projectId } });

    // Fetch all CCOs for project
    const ccos = await this.ccoRepo.find({ where: { projectId } });

    // Initialize summary
    const summary: COSummaryDto = {
      projectId,
      totalOcoCount: 0,
      totalOcoAmount: 0,
      ocoDraftCount: 0,
      ocoPendingCount: 0,
      ocoApprovedCount: 0,
      ocoRejectedCount: 0,
      ocoExecutedCount: 0,
      ocoApprovedAmount: 0,
      ocoExecutedAmount: 0,
      totalCcoCount: 0,
      totalCcoAmount: 0,
      ccoDraftCount: 0,
      ccoPendingCount: 0,
      ccoApprovedCount: 0,
      ccoRejectedCount: 0,
      ccoExecutedCount: 0,
      ccoApprovedAmount: 0,
      ccoExecutedAmount: 0,
      totalChangeOrderCount: 0,
      totalChangeOrderAmount: 0,
      totalApprovedAmount: 0,
      totalExecutedAmount: 0,
      budgetImpactPercentage: 0,
    };

    // Process OCOs
    summary.totalOcoCount = ocos.length;
    for (const oco of ocos) {
      const amount = Number(oco.amount);
      summary.totalOcoAmount += amount;

      switch (oco.status) {
        case OcoStatus.DRAFT:
          summary.ocoDraftCount++;
          break;
        case OcoStatus.PENDING_APPROVAL:
          summary.ocoPendingCount++;
          break;
        case OcoStatus.APPROVED:
          summary.ocoApprovedCount++;
          summary.ocoApprovedAmount += amount;
          break;
        case OcoStatus.REJECTED:
          summary.ocoRejectedCount++;
          break;
        case OcoStatus.EXECUTED:
          summary.ocoExecutedCount++;
          summary.ocoExecutedAmount += amount;
          break;
      }
    }

    // Process CCOs
    summary.totalCcoCount = ccos.length;
    for (const cco of ccos) {
      const amount = Number(cco.amount);
      summary.totalCcoAmount += amount;

      switch (cco.status) {
        case CcoStatus.DRAFT:
          summary.ccoDraftCount++;
          break;
        case CcoStatus.PENDING_APPROVAL:
          summary.ccoPendingCount++;
          break;
        case CcoStatus.APPROVED:
          summary.ccoApprovedCount++;
          summary.ccoApprovedAmount += amount;
          break;
        case CcoStatus.REJECTED:
          summary.ccoRejectedCount++;
          break;
        case CcoStatus.EXECUTED:
          summary.ccoExecutedCount++;
          summary.ccoExecutedAmount += amount;
          break;
      }
    }

    // Calculate combined totals
    summary.totalChangeOrderCount = summary.totalOcoCount + summary.totalCcoCount;
    summary.totalChangeOrderAmount = summary.totalOcoAmount + summary.totalCcoAmount;
    summary.totalApprovedAmount = summary.ocoApprovedAmount + summary.ccoApprovedAmount;
    summary.totalExecutedAmount = summary.ocoExecutedAmount + summary.ccoExecutedAmount;

    // Calculate budget impact percentage
    const budget = await this.budgetRepo.findOne({
      where: { projectId, status: BudgetStatus.ACTIVE },
    });
    const currentBudgetTotal = budget ? Number(budget.totalBudget) : 0;
    summary.budgetImpactPercentage =
      currentBudgetTotal > 0 ? (summary.totalApprovedAmount / currentBudgetTotal) * 100 : 0;

    this.logger.log(`Summary calculated: ${summary.totalChangeOrderCount} total COs, $${summary.totalChangeOrderAmount} total amount`);

    return summary;
  }
}
