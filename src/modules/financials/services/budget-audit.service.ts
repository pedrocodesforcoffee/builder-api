import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Between, LessThanOrEqual } from 'typeorm';
import { BudgetAuditLog } from '../entities/budget-audit-log.entity';
import { Budget } from '../entities/budget.entity';
import { BudgetLineItem } from '../entities/budget-line-item.entity';

/**
 * Budget Audit Service
 *
 * Handles creation and retrieval of audit logs for budget and line item changes.
 * Provides methods for compliance reporting and historical analysis.
 */
@Injectable()
export class BudgetAuditService {
  private readonly logger = new Logger(BudgetAuditService.name);

  constructor(
    @InjectRepository(BudgetAuditLog)
    private readonly auditLogRepo: Repository<BudgetAuditLog>,
    @InjectRepository(Budget)
    private readonly budgetRepo: Repository<Budget>,
    @InjectRepository(BudgetLineItem)
    private readonly lineItemRepo: Repository<BudgetLineItem>,
  ) {}

  /**
   * Log a budget-level change
   */
  async logBudgetChange(params: {
    budgetId: string;
    userId: string;
    action: string;
    before?: any;
    after?: any;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<BudgetAuditLog> {
    const logEntry = this.auditLogRepo.create(
      BudgetAuditLog.createBudgetLog(params),
    );

    await this.auditLogRepo.save(logEntry);

    this.logger.log(
      `Budget audit log created: budgetId=${params.budgetId}, action=${params.action}, userId=${params.userId}`,
    );

    return logEntry;
  }

  /**
   * Log a line item change
   */
  async logLineItemChange(params: {
    budgetId: string;
    lineItemId: string;
    userId: string;
    action: string;
    before?: any;
    after?: any;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<BudgetAuditLog> {
    const logEntry = this.auditLogRepo.create(
      BudgetAuditLog.createLineItemLog(params),
    );

    await this.auditLogRepo.save(logEntry);

    this.logger.log(
      `Line item audit log created: lineItemId=${params.lineItemId}, action=${params.action}, userId=${params.userId}`,
    );

    return logEntry;
  }

  /**
   * Get all audit logs for a specific budget
   */
  async getBudgetAuditLogs(
    budgetId: string,
    options?: {
      entityType?: 'budget' | 'line_item';
      action?: string;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ logs: BudgetAuditLog[]; total: number }> {
    const where: FindOptionsWhere<BudgetAuditLog> = {
      budgetId,
    };

    if (options?.entityType) {
      where.entityType = options.entityType;
    }

    if (options?.action) {
      where.action = options.action;
    }

    if (options?.userId) {
      where.userId = options.userId;
    }

    if (options?.startDate && options?.endDate) {
      where.timestamp = Between(options.startDate, options.endDate);
    } else if (options?.startDate) {
      where.timestamp = LessThanOrEqual(options.startDate);
    }

    const [logs, total] = await this.auditLogRepo.findAndCount({
      where,
      relations: ['user'],
      order: { timestamp: 'DESC' },
      take: options?.limit || 100,
      skip: options?.offset || 0,
    });

    return { logs, total };
  }

  /**
   * Get all audit logs for a specific line item
   */
  async getLineItemAuditLogs(
    lineItemId: string,
    options?: {
      action?: string;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ logs: BudgetAuditLog[]; total: number }> {
    const where: FindOptionsWhere<BudgetAuditLog> = {
      lineItemId,
      entityType: 'line_item',
    };

    if (options?.action) {
      where.action = options.action;
    }

    if (options?.userId) {
      where.userId = options.userId;
    }

    if (options?.startDate && options?.endDate) {
      where.timestamp = Between(options.startDate, options.endDate);
    } else if (options?.startDate) {
      where.timestamp = LessThanOrEqual(options.startDate);
    }

    const [logs, total] = await this.auditLogRepo.findAndCount({
      where,
      relations: ['user'],
      order: { timestamp: 'DESC' },
      take: options?.limit || 100,
      skip: options?.offset || 0,
    });

    return { logs, total };
  }

  /**
   * Get all audit logs for a specific user
   */
  async getUserAuditLogs(
    userId: string,
    options?: {
      budgetId?: string;
      entityType?: 'budget' | 'line_item';
      action?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ logs: BudgetAuditLog[]; total: number }> {
    const where: FindOptionsWhere<BudgetAuditLog> = {
      userId,
    };

    if (options?.budgetId) {
      where.budgetId = options.budgetId;
    }

    if (options?.entityType) {
      where.entityType = options.entityType;
    }

    if (options?.action) {
      where.action = options.action;
    }

    if (options?.startDate && options?.endDate) {
      where.timestamp = Between(options.startDate, options.endDate);
    } else if (options?.startDate) {
      where.timestamp = LessThanOrEqual(options.startDate);
    }

    const [logs, total] = await this.auditLogRepo.findAndCount({
      where,
      relations: ['budget', 'user'],
      order: { timestamp: 'DESC' },
      take: options?.limit || 100,
      skip: options?.offset || 0,
    });

    return { logs, total };
  }

  /**
   * Get a single audit log entry by ID
   */
  async getAuditLogById(id: string): Promise<BudgetAuditLog> {
    const log = await this.auditLogRepo.findOne({
      where: { id },
      relations: ['budget', 'lineItem', 'user'],
    });

    if (!log) {
      throw new NotFoundException(`Audit log with ID ${id} not found`);
    }

    return log;
  }

  /**
   * Reconstruct budget state at a specific point in time
   * Replays all audit logs up to the specified date
   */
  async reconstructBudgetSnapshot(
    budgetId: string,
    date: Date,
  ): Promise<{
    budget: any;
    lineItems: any[];
    reconstructedAt: Date;
  }> {
    // Get all budget-level changes up to the specified date
    const budgetLogs = await this.auditLogRepo.find({
      where: {
        budgetId,
        entityType: 'budget',
        timestamp: LessThanOrEqual(date),
      },
      order: { timestamp: 'ASC' },
    });

    // Get all line item changes up to the specified date
    const lineItemLogs = await this.auditLogRepo.find({
      where: {
        budgetId,
        entityType: 'line_item',
        timestamp: LessThanOrEqual(date),
      },
      order: { timestamp: 'ASC' },
    });

    // Reconstruct budget state
    let budgetState: any = null;

    for (const log of budgetLogs) {
      if (log.action === 'CREATE') {
        budgetState = log.after;
      } else if (log.action === 'UPDATE') {
        budgetState = { ...budgetState, ...log.after };
      } else if (log.action === 'DELETE') {
        budgetState = null;
      } else if (
        log.action === 'LOCK' ||
        log.action === 'UNLOCK' ||
        log.action === 'ACTIVATE'
      ) {
        budgetState = { ...budgetState, ...log.after };
      }
    }

    // Reconstruct line items state
    const lineItemsMap = new Map<string, any>();

    for (const log of lineItemLogs) {
      const itemId = log.lineItemId;

      // Skip if itemId is undefined
      if (!itemId) {
        continue;
      }

      if (log.action === 'LINE_ITEM_CREATE') {
        lineItemsMap.set(itemId, log.after);
      } else if (log.action === 'LINE_ITEM_UPDATE') {
        const existing = lineItemsMap.get(itemId) || {};
        lineItemsMap.set(itemId, { ...existing, ...log.after });
      } else if (log.action === 'LINE_ITEM_DELETE') {
        lineItemsMap.delete(itemId);
      }
    }

    const lineItems = Array.from(lineItemsMap.values());

    this.logger.log(
      `Reconstructed budget snapshot: budgetId=${budgetId}, date=${date.toISOString()}, lineItemCount=${lineItems.length}`,
    );

    return {
      budget: budgetState,
      lineItems,
      reconstructedAt: date,
    };
  }

  /**
   * Get activity summary for a budget
   * Returns counts of different actions
   */
  async getBudgetActivitySummary(
    budgetId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalChanges: number;
    budgetChanges: number;
    lineItemChanges: number;
    actionCounts: { action: string; count: number }[];
    userActivity: { userId: string; count: number }[];
  }> {
    const where: FindOptionsWhere<BudgetAuditLog> = {
      budgetId,
    };

    if (startDate && endDate) {
      where.timestamp = Between(startDate, endDate);
    } else if (startDate) {
      where.timestamp = LessThanOrEqual(startDate);
    }

    const logs = await this.auditLogRepo.find({
      where,
      relations: ['user'],
    });

    const totalChanges = logs.length;
    const budgetChanges = logs.filter((l) => l.entityType === 'budget').length;
    const lineItemChanges = logs.filter(
      (l) => l.entityType === 'line_item',
    ).length;

    // Count actions
    const actionMap = new Map<string, number>();
    logs.forEach((log) => {
      const count = actionMap.get(log.action) || 0;
      actionMap.set(log.action, count + 1);
    });

    const actionCounts = Array.from(actionMap.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count);

    // Count user activity
    const userMap = new Map<string, number>();
    logs.forEach((log) => {
      const count = userMap.get(log.userId) || 0;
      userMap.set(log.userId, count + 1);
    });

    const userActivity = Array.from(userMap.entries())
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalChanges,
      budgetChanges,
      lineItemChanges,
      actionCounts,
      userActivity,
    };
  }

  /**
   * Get the most recent audit log for a budget
   */
  async getLatestBudgetChange(budgetId: string): Promise<BudgetAuditLog | null> {
    return this.auditLogRepo.findOne({
      where: { budgetId, entityType: 'budget' },
      order: { timestamp: 'DESC' },
      relations: ['user'],
    });
  }

  /**
   * Get the most recent audit log for a line item
   */
  async getLatestLineItemChange(
    lineItemId: string,
  ): Promise<BudgetAuditLog | null> {
    return this.auditLogRepo.findOne({
      where: { lineItemId, entityType: 'line_item' },
      order: { timestamp: 'DESC' },
      relations: ['user'],
    });
  }

  /**
   * Delete all audit logs for a budget (use with caution)
   * This should only be used in development or for data cleanup
   */
  async deleteAuditLogs(budgetId: string): Promise<number> {
    const result = await this.auditLogRepo.delete({ budgetId });

    this.logger.warn(
      `Deleted ${result.affected || 0} audit logs for budgetId=${budgetId}`,
    );

    return result.affected || 0;
  }
}
