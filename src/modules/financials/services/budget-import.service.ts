import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { parse } from 'csv-parse/sync';
import { Budget } from '../entities/budget.entity';
import { BudgetLineItem } from '../entities/budget-line-item.entity';
import { CostCode } from '../entities/cost-code.entity';
import { BudgetCategory } from '../enums/budget-category.enum';
import { BudgetStatus } from '../enums/budget-status.enum';
import { BudgetCalculationService } from './budget-calculation.service';

/**
 * Budget Import Result
 */
export interface BudgetImportResult {
  success: boolean;
  budgetId?: string;
  lineItemsImported: number;
  errors: string[];
  warnings: string[];
}

/**
 * Budget Line Item Import Row
 */
interface BudgetLineItemRow {
  costCode: string;
  category: string;
  description?: string;
  quantity?: number;
  unitCost?: number;
  budgetedCost: number;
  rowNumber: number;
}

/**
 * Budget Import Service
 *
 * Handles importing budgets from Excel and CSV files.
 * Supports standard budget templates with validation and error reporting.
 */
@Injectable()
export class BudgetImportService {
  private readonly logger = new Logger(BudgetImportService.name);

  constructor(
    @InjectRepository(Budget)
    private readonly budgetRepo: Repository<Budget>,
    @InjectRepository(BudgetLineItem)
    private readonly lineItemRepo: Repository<BudgetLineItem>,
    @InjectRepository(CostCode)
    private readonly costCodeRepo: Repository<CostCode>,
    private readonly calculationService: BudgetCalculationService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Import budget from Excel file
   *
   * Expected format:
   * - First row: Headers (Cost Code, Category, Description, Quantity, Unit Cost, Budgeted Cost)
   * - Subsequent rows: Line item data
   *
   * @param fileBuffer - Excel file buffer
   * @param projectId - Project ID
   * @param budgetName - Budget name
   * @param userId - User ID creating the budget
   * @returns Import result with budget ID and statistics
   */
  async importFromExcel(
    fileBuffer: Buffer | ArrayBuffer,
    projectId: string,
    budgetName: string,
    userId: string,
  ): Promise<BudgetImportResult> {
    this.logger.log(
      `Importing budget from Excel for project ${projectId}: ${budgetName}`,
    );

    const errors: string[] = [];
    const warnings: string[] = [];
    const lineItemRows: BudgetLineItemRow[] = [];

    try {
      // Load workbook
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer as any);

      // Get first worksheet
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new BadRequestException('Excel file has no worksheets');
      }

      // Parse header row
      const headerRow = worksheet.getRow(1);
      const headers = this.extractHeaders(headerRow);

      // Validate required columns
      const requiredColumns = ['costCode', 'category', 'budgetedCost'];
      const missingColumns = requiredColumns.filter(
        (col) => !headers[col] || headers[col] === -1,
      );

      if (missingColumns.length > 0) {
        throw new BadRequestException(
          `Missing required columns: ${missingColumns.join(', ')}`,
        );
      }

      // Parse data rows
      worksheet.eachRow((row, rowNumber) => {
        // Skip header row
        if (rowNumber === 1) return;

        // Skip empty rows
        if (this.isEmptyRow(row)) return;

        try {
          const lineItem = this.parseExcelRow(row, headers, rowNumber);
          lineItemRows.push(lineItem);
        } catch (error) {
          errors.push(`Row ${rowNumber}: ${(error as Error).message}`);
        }
      });

      // If parsing errors, return early
      if (errors.length > 0) {
        return {
          success: false,
          lineItemsImported: 0,
          errors,
          warnings,
        };
      }

      // Create budget and import line items
      const result = await this.createBudgetWithLineItems(
        projectId,
        budgetName,
        userId,
        lineItemRows,
        errors,
        warnings,
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to import budget from Excel: ${(error as Error).message}`);
      errors.push(`Import failed: ${(error as Error).message}`);
      return {
        success: false,
        lineItemsImported: 0,
        errors,
        warnings,
      };
    }
  }

  /**
   * Import budget from CSV file
   *
   * Expected format:
   * - First row: Headers (Cost Code, Category, Description, Quantity, Unit Cost, Budgeted Cost)
   * - Subsequent rows: Line item data
   *
   * @param fileBuffer - CSV file buffer
   * @param projectId - Project ID
   * @param budgetName - Budget name
   * @param userId - User ID creating the budget
   * @returns Import result with budget ID and statistics
   */
  async importFromCSV(
    fileBuffer: Buffer,
    projectId: string,
    budgetName: string,
    userId: string,
  ): Promise<BudgetImportResult> {
    this.logger.log(
      `Importing budget from CSV for project ${projectId}: ${budgetName}`,
    );

    const errors: string[] = [];
    const warnings: string[] = [];
    const lineItemRows: BudgetLineItemRow[] = [];

    try {
      // Parse CSV
      const records = parse(fileBuffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      // Validate required columns
      if (records.length === 0) {
        throw new BadRequestException('CSV file is empty');
      }

      const firstRecord = records[0] as any;
      const headers = Object.keys(firstRecord).map((key) =>
        key.toLowerCase().replace(/\s+/g, ''),
      );

      const requiredColumns = ['costcode', 'category', 'budgetedcost'];
      const missingColumns = requiredColumns.filter(
        (col) => !headers.includes(col),
      );

      if (missingColumns.length > 0) {
        throw new BadRequestException(
          `Missing required columns: ${missingColumns.join(', ')}`,
        );
      }

      // Parse data rows
      records.forEach((record, index) => {
        const rowNumber = index + 2; // +2 because: +1 for header, +1 for 0-index

        try {
          const lineItem = this.parseCSVRow(record, rowNumber);
          lineItemRows.push(lineItem);
        } catch (error) {
          errors.push(`Row ${rowNumber}: ${(error as Error).message}`);
        }
      });

      // If parsing errors, return early
      if (errors.length > 0) {
        return {
          success: false,
          lineItemsImported: 0,
          errors,
          warnings,
        };
      }

      // Create budget and import line items
      const result = await this.createBudgetWithLineItems(
        projectId,
        budgetName,
        userId,
        lineItemRows,
        errors,
        warnings,
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to import budget from CSV: ${(error as Error).message}`);
      errors.push(`Import failed: ${(error as Error).message}`);
      return {
        success: false,
        lineItemsImported: 0,
        errors,
        warnings,
      };
    }
  }

  /**
   * Extract column headers from Excel row
   */
  private extractHeaders(row: ExcelJS.Row): { [key: string]: number } {
    const headers: { [key: string]: number } = {};

    row.eachCell((cell, colNumber) => {
      const headerName = String(cell.value || '')
        .toLowerCase()
        .replace(/\s+/g, '');

      // Map common variations
      if (headerName.includes('costcode') || headerName === 'code') {
        headers.costCode = colNumber;
      } else if (headerName.includes('category') || headerName === 'type') {
        headers.category = colNumber;
      } else if (headerName.includes('description') || headerName === 'desc') {
        headers.description = colNumber;
      } else if (headerName.includes('quantity') || headerName === 'qty') {
        headers.quantity = colNumber;
      } else if (
        headerName.includes('unitcost') ||
        headerName === 'rate' ||
        headerName === 'unit'
      ) {
        headers.unitCost = colNumber;
      } else if (
        headerName.includes('budgetedcost') ||
        headerName.includes('budget') ||
        headerName === 'cost' ||
        headerName === 'amount'
      ) {
        headers.budgetedCost = colNumber;
      }
    });

    return headers;
  }

  /**
   * Check if Excel row is empty
   */
  private isEmptyRow(row: ExcelJS.Row): boolean {
    let isEmpty = true;
    row.eachCell((cell) => {
      if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
        isEmpty = false;
      }
    });
    return isEmpty;
  }

  /**
   * Parse Excel row into line item data
   */
  private parseExcelRow(
    row: ExcelJS.Row,
    headers: { [key: string]: number },
    rowNumber: number,
  ): BudgetLineItemRow {
    const costCode = String(row.getCell(headers.costCode).value || '').trim();
    const category = String(row.getCell(headers.category).value || '').trim();
    const description = headers.description
      ? String(row.getCell(headers.description).value || '').trim()
      : undefined;
    const quantity = headers.quantity
      ? this.parseNumber(row.getCell(headers.quantity).value)
      : undefined;
    const unitCost = headers.unitCost
      ? this.parseNumber(row.getCell(headers.unitCost).value)
      : undefined;
    const budgetedCost = this.parseNumber(
      row.getCell(headers.budgetedCost).value,
    );

    return this.validateLineItem({
      costCode,
      category,
      description,
      quantity: quantity ?? undefined,
      unitCost: unitCost ?? undefined,
      budgetedCost: budgetedCost ?? 0,
      rowNumber,
    });
  }

  /**
   * Parse CSV row into line item data
   */
  private parseCSVRow(record: any, rowNumber: number): BudgetLineItemRow {
    const normalizedKeys: { [key: string]: string } = {};
    Object.keys(record).forEach((key) => {
      normalizedKeys[key.toLowerCase().replace(/\s+/g, '')] = key;
    });

    const costCode = String(record[normalizedKeys.costcode] || '').trim();
    const category = String(record[normalizedKeys.category] || '').trim();
    const description = normalizedKeys.description
      ? String(record[normalizedKeys.description] || '').trim()
      : undefined;
    const quantity = normalizedKeys.quantity
      ? this.parseNumber(record[normalizedKeys.quantity])
      : undefined;
    const unitCost = normalizedKeys.unitcost
      ? this.parseNumber(record[normalizedKeys.unitcost])
      : undefined;
    const budgetedCost = this.parseNumber(
      record[normalizedKeys.budgetedcost] || record[normalizedKeys.cost],
    );

    return this.validateLineItem({
      costCode,
      category,
      description,
      quantity: quantity ?? undefined,
      unitCost: unitCost ?? undefined,
      budgetedCost: budgetedCost ?? 0,
      rowNumber,
    });
  }

  /**
   * Parse number from cell value
   */
  private parseNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const num = Number(value);
    if (isNaN(num)) {
      throw new Error(`Invalid number: ${value}`);
    }

    return num;
  }

  /**
   * Validate line item data
   */
  private validateLineItem(item: BudgetLineItemRow): BudgetLineItemRow {
    if (!item.costCode) {
      throw new Error('Cost code is required');
    }

    if (!item.category) {
      throw new Error('Category is required');
    }

    // Validate category enum
    const validCategories = Object.values(BudgetCategory);
    const normalizedCategory = item.category.toUpperCase();
    if (!validCategories.includes(normalizedCategory as BudgetCategory)) {
      throw new Error(
        `Invalid category: ${item.category}. Must be one of: ${validCategories.join(', ')}`,
      );
    }
    item.category = normalizedCategory;

    if (item.budgetedCost === null || item.budgetedCost === undefined) {
      throw new Error('Budgeted cost is required');
    }

    if (item.budgetedCost < 0) {
      throw new Error('Budgeted cost must be non-negative');
    }

    // Validate quantity and unit cost if provided
    if (item.quantity !== null && item.quantity !== undefined) {
      if (item.quantity < 0) {
        throw new Error('Quantity must be non-negative');
      }
    }

    if (item.unitCost !== null && item.unitCost !== undefined) {
      if (item.unitCost < 0) {
        throw new Error('Unit cost must be non-negative');
      }
    }

    return item;
  }

  /**
   * Create budget with line items in a transaction
   */
  private async createBudgetWithLineItems(
    projectId: string,
    budgetName: string,
    userId: string,
    lineItemRows: BudgetLineItemRow[],
    errors: string[],
    warnings: string[],
  ): Promise<BudgetImportResult> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create budget
      const budget = queryRunner.manager.create(Budget, {
        projectId,
        name: budgetName,
        status: BudgetStatus.DRAFT,
        totalBudget: 0,
        createdById: userId,
      });

      const savedBudget = await queryRunner.manager.save(Budget, budget);

      // Get all cost codes (for validation)
      const costCodes = await queryRunner.manager.find(CostCode);
      const costCodeMap = new Map(costCodes.map((cc) => [cc.code, cc]));

      // Create line items
      let importedCount = 0;

      for (const row of lineItemRows) {
        // Find cost code
        const costCode = costCodeMap.get(row.costCode);
        if (!costCode) {
          warnings.push(
            `Row ${row.rowNumber}: Cost code ${row.costCode} not found, skipping`,
          );
          continue;
        }

        // Create line item
        const lineItem = queryRunner.manager.create(BudgetLineItem, {
          budgetId: savedBudget.id,
          costCodeId: costCode.id,
          category: row.category as BudgetCategory,
          description: row.description,
          quantity: row.quantity,
          unitCost: row.unitCost,
          budgetedCost: row.budgetedCost,
        });

        await queryRunner.manager.save(BudgetLineItem, lineItem);
        importedCount++;
      }

      // Recalculate budget total
      const total = await this.calculationService.calculateBudgetTotal(
        savedBudget.id,
      );
      await queryRunner.manager.update(Budget, savedBudget.id, {
        totalBudget: total,
      });

      await queryRunner.commitTransaction();

      this.logger.log(
        `Successfully imported budget ${savedBudget.id} with ${importedCount} line items`,
      );

      return {
        success: true,
        budgetId: savedBudget.id,
        lineItemsImported: importedCount,
        errors,
        warnings,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create budget: ${(error as Error).message}`);
      errors.push(`Database error: ${(error as Error).message}`);
      return {
        success: false,
        lineItemsImported: 0,
        errors,
        warnings,
      };
    } finally {
      await queryRunner.release();
    }
  }
}
