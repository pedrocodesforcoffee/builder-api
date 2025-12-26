import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Budget } from '../entities/budget.entity';
import { BudgetLineItem } from '../entities/budget-line-item.entity';
import { BudgetCalculationService } from './budget-calculation.service';

/**
 * Budget Export Service
 *
 * Handles exporting budgets to Excel and CSV formats.
 * Provides formatted budget reports with summary sheets and detailed line items.
 */
@Injectable()
export class BudgetExportService {
  private readonly logger = new Logger(BudgetExportService.name);

  constructor(
    @InjectRepository(Budget)
    private readonly budgetRepo: Repository<Budget>,
    @InjectRepository(BudgetLineItem)
    private readonly lineItemRepo: Repository<BudgetLineItem>,
    private readonly calculationService: BudgetCalculationService,
  ) {}

  /**
   * Export budget to Excel
   *
   * Creates a formatted Excel workbook with:
   * - Summary sheet with budget overview and category breakdown
   * - Detail sheet with all line items
   *
   * @param budgetId - Budget ID
   * @param includeSummary - Include summary sheet (default: true)
   * @returns Excel workbook buffer
   */
  async exportToExcel(
    budgetId: string,
    includeSummary = true,
  ): Promise<Buffer> {
    this.logger.log(`Exporting budget ${budgetId} to Excel`);

    // Load budget with line items
    const budget = await this.budgetRepo.findOne({
      where: { id: budgetId },
      relations: ['lineItems', 'lineItems.costCode', 'project'],
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${budgetId} not found`);
    }

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Bob The Builder';
    workbook.created = new Date();

    // Add summary sheet if requested
    if (includeSummary) {
      await this.createSummarySheet(workbook, budget);
    }

    // Add detail sheet
    await this.createDetailSheet(workbook, budget);

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    this.logger.log(`Successfully exported budget ${budgetId} to Excel`);

    return Buffer.from(buffer);
  }

  /**
   * Export budget to CSV
   *
   * Creates a CSV file with all line items.
   *
   * @param budgetId - Budget ID
   * @returns CSV buffer
   */
  async exportToCSV(budgetId: string): Promise<Buffer> {
    this.logger.log(`Exporting budget ${budgetId} to CSV`);

    // Load budget with line items
    const budget = await this.budgetRepo.findOne({
      where: { id: budgetId },
      relations: ['lineItems', 'lineItems.costCode'],
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${budgetId} not found`);
    }

    // Create CSV content
    const rows: string[] = [];

    // Header row
    rows.push(
      'Cost Code,Cost Code Name,Category,Description,Quantity,Unit Cost,Budgeted Cost',
    );

    // Data rows
    const sortedLineItems = (budget.lineItems || []).sort((a, b) =>
      a.costCode.code.localeCompare(b.costCode.code),
    );

    for (const item of sortedLineItems) {
      const row = [
        this.csvEscape(item.costCode.code),
        this.csvEscape(item.costCode.name),
        this.csvEscape(item.category),
        this.csvEscape(item.description || ''),
        item.quantity !== null && item.quantity !== undefined
          ? item.quantity.toString()
          : '',
        item.unitCost !== null && item.unitCost !== undefined
          ? item.unitCost.toString()
          : '',
        item.budgetedCost.toString(),
      ];
      rows.push(row.join(','));
    }

    const csv = rows.join('\n');

    this.logger.log(`Successfully exported budget ${budgetId} to CSV`);

    return Buffer.from(csv, 'utf-8');
  }

  /**
   * Create summary sheet in workbook
   */
  private async createSummarySheet(
    workbook: ExcelJS.Workbook,
    budget: Budget,
  ): Promise<void> {
    const sheet = workbook.addWorksheet('Summary');

    // Set column widths
    sheet.columns = [
      { width: 30 },
      { width: 20 },
      { width: 20 },
    ];

    let row = 1;

    // Title
    sheet.getCell(`A${row}`).value = 'Budget Summary';
    sheet.getCell(`A${row}`).font = { size: 16, bold: true };
    row += 2;

    // Budget info
    sheet.getCell(`A${row}`).value = 'Budget Name:';
    sheet.getCell(`A${row}`).font = { bold: true };
    sheet.getCell(`B${row}`).value = budget.name;
    row++;

    sheet.getCell(`A${row}`).value = 'Project:';
    sheet.getCell(`A${row}`).font = { bold: true };
    sheet.getCell(`B${row}`).value = budget.project?.name || 'Unknown';
    row++;

    sheet.getCell(`A${row}`).value = 'Status:';
    sheet.getCell(`A${row}`).font = { bold: true };
    sheet.getCell(`B${row}`).value = budget.status;
    row++;

    sheet.getCell(`A${row}`).value = 'Total Budget:';
    sheet.getCell(`A${row}`).font = { bold: true };
    sheet.getCell(`B${row}`).value = budget.totalBudget;
    sheet.getCell(`B${row}`).numFmt = '$#,##0.00';
    row++;

    sheet.getCell(`A${row}`).value = 'Line Items:';
    sheet.getCell(`A${row}`).font = { bold: true };
    sheet.getCell(`B${row}`).value = budget.lineItems?.length || 0;
    row += 2;

    // Category breakdown
    const categoryBreakdown =
      await this.calculationService.getBudgetByCategory(budget.id);

    sheet.getCell(`A${row}`).value = 'Category Breakdown';
    sheet.getCell(`A${row}`).font = { size: 14, bold: true };
    row++;

    // Header row for category table
    sheet.getCell(`A${row}`).value = 'Category';
    sheet.getCell(`A${row}`).font = { bold: true };
    sheet.getCell(`B${row}`).value = 'Amount';
    sheet.getCell(`B${row}`).font = { bold: true };
    sheet.getCell(`C${row}`).value = 'Percentage';
    sheet.getCell(`C${row}`).font = { bold: true };
    row++;

    // Category data
    Object.entries(categoryBreakdown).forEach(([category, amount]) => {
      const percentage =
        budget.totalBudget > 0 ? (amount / budget.totalBudget) * 100 : 0;

      sheet.getCell(`A${row}`).value = category;
      sheet.getCell(`B${row}`).value = amount;
      sheet.getCell(`B${row}`).numFmt = '$#,##0.00';
      sheet.getCell(`C${row}`).value = percentage / 100;
      sheet.getCell(`C${row}`).numFmt = '0.00%';
      row++;
    });

    // Total row
    sheet.getCell(`A${row}`).value = 'Total';
    sheet.getCell(`A${row}`).font = { bold: true };
    sheet.getCell(`B${row}`).value = budget.totalBudget;
    sheet.getCell(`B${row}`).numFmt = '$#,##0.00';
    sheet.getCell(`B${row}`).font = { bold: true };
    sheet.getCell(`C${row}`).value = 1;
    sheet.getCell(`C${row}`).numFmt = '0.00%';
    sheet.getCell(`C${row}`).font = { bold: true };
  }

  /**
   * Create detail sheet in workbook
   */
  private async createDetailSheet(
    workbook: ExcelJS.Workbook,
    budget: Budget,
  ): Promise<void> {
    const sheet = workbook.addWorksheet('Detail');

    // Set column widths
    sheet.columns = [
      { header: 'Cost Code', key: 'costCode', width: 15 },
      { header: 'Cost Code Name', key: 'costCodeName', width: 30 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Unit Cost', key: 'unitCost', width: 12 },
      { header: 'Budgeted Cost', key: 'budgetedCost', width: 15 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };

    // Sort line items by cost code
    const sortedLineItems = (budget.lineItems || []).sort((a, b) =>
      a.costCode.code.localeCompare(b.costCode.code),
    );

    // Add data rows
    sortedLineItems.forEach((item) => {
      sheet.addRow({
        costCode: item.costCode.code,
        costCodeName: item.costCode.name,
        category: item.category,
        description: item.description || '',
        quantity:
          item.quantity !== null && item.quantity !== undefined
            ? item.quantity
            : '',
        unitCost:
          item.unitCost !== null && item.unitCost !== undefined
            ? item.unitCost
            : '',
        budgetedCost: item.budgetedCost,
      });
    });

    // Format number columns
    sheet.getColumn('quantity').numFmt = '#,##0.00';
    sheet.getColumn('unitCost').numFmt = '$#,##0.00';
    sheet.getColumn('budgetedCost').numFmt = '$#,##0.00';

    // Add total row
    const totalRow = sheet.addRow({
      costCode: '',
      costCodeName: '',
      category: '',
      description: '',
      quantity: '',
      unitCost: 'Total:',
      budgetedCost: budget.totalBudget,
    });

    totalRow.font = { bold: true };
    totalRow.getCell('budgetedCost').numFmt = '$#,##0.00';

    // Freeze header row
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  /**
   * Escape CSV value
   */
  private csvEscape(value: string): string {
    if (!value) return '';

    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }

    return value;
  }
}
