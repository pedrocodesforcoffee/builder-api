/**
 * AI Cost Tracking Service
 * Tracks AI usage, costs, and enforces budget limits
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { AiOperationLog } from '../entities/ai-operation-log.entity';
import {
  AI_CONFIG,
  AiModel,
  AiOperationType,
} from '../constants/ai-config.constants';
import {
  AiCostSummary,
  AiUsageMetrics,
} from '../interfaces/ai-operation.interface';

@Injectable()
export class AiCostTrackingService {
  private readonly logger = new Logger(AiCostTrackingService.name);

  constructor(
    @InjectRepository(AiOperationLog)
    private aiOperationLogRepo: Repository<AiOperationLog>,
  ) {}

  /**
   * Log an AI operation
   */
  async logOperation(params: {
    projectId: string;
    userId: string;
    operationType: AiOperationType;
    model: AiModel;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    responseTime: number;
    cached: boolean;
    success: boolean;
    errorMessage?: string;
    inputSummary?: Record<string, any>;
    outputSummary?: Record<string, any>;
  }): Promise<AiOperationLog> {
    const log = this.aiOperationLogRepo.create({
      ...params,
      totalTokens: params.inputTokens + params.outputTokens,
    });

    const savedLog = await this.aiOperationLogRepo.save(log);

    this.logger.log(
      `AI operation logged: ${params.operationType} | Tokens: ${savedLog.totalTokens} | Cost: $${params.cost.toFixed(4)} | Cached: ${params.cached}`,
    );

    return savedLog;
  }

  /**
   * Get usage metrics for a project
   */
  async getUsageMetrics(projectId: string): Promise<AiUsageMetrics> {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Daily tokens
    const dailyStats = await this.aiOperationLogRepo
      .createQueryBuilder('log')
      .select('SUM(log.totalTokens)', 'totalTokens')
      .where('log.projectId = :projectId', { projectId })
      .andWhere('log.createdAt >= :dayStart', { dayStart })
      .andWhere('log.success = true')
      .getRawOne();

    const dailyTokensUsed = parseInt(dailyStats?.totalTokens || '0', 10);

    // Monthly tokens and cost
    const monthlyStats = await this.aiOperationLogRepo
      .createQueryBuilder('log')
      .select('SUM(log.totalTokens)', 'totalTokens')
      .addSelect('SUM(log.cost)', 'totalCost')
      .where('log.projectId = :projectId', { projectId })
      .andWhere('log.createdAt >= :monthStart', { monthStart })
      .andWhere('log.success = true')
      .getRawOne();

    const monthlyTokensUsed = parseInt(monthlyStats?.totalTokens || '0', 10);
    const monthlyCost = parseFloat(monthlyStats?.totalCost || '0');

    // Top operations
    const topOperations = await this.aiOperationLogRepo
      .createQueryBuilder('log')
      .select('log.operationType', 'operationType')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(log.cost)', 'cost')
      .where('log.projectId = :projectId', { projectId })
      .andWhere('log.createdAt >= :monthStart', { monthStart })
      .andWhere('log.success = true')
      .groupBy('log.operationType')
      .orderBy('COUNT(*)', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      projectId,
      dailyTokensUsed,
      monthlyTokensUsed,
      dailyTokensRemaining: Math.max(
        0,
        AI_CONFIG.BUDGET.DAILY_LIMIT - dailyTokensUsed,
      ),
      monthlyTokensRemaining: Math.max(
        0,
        AI_CONFIG.BUDGET.MONTHLY_LIMIT - monthlyTokensUsed,
      ),
      monthlyCost,
      topOperations: topOperations.map((op) => ({
        operationType: op.operationType as AiOperationType,
        count: parseInt(op.count, 10),
        cost: parseFloat(op.cost),
      })),
    };
  }

  /**
   * Check if project is within budget limits
   */
  async checkBudgetLimits(projectId: string): Promise<{
    withinLimits: boolean;
    dailyLimitReached: boolean;
    monthlyLimitReached: boolean;
    costAlertThresholdReached: boolean;
  }> {
    const metrics = await this.getUsageMetrics(projectId);

    const dailyLimitReached =
      metrics.dailyTokensUsed >= AI_CONFIG.BUDGET.DAILY_LIMIT;
    const monthlyLimitReached =
      metrics.monthlyTokensUsed >= AI_CONFIG.BUDGET.MONTHLY_LIMIT;
    const costAlertThresholdReached =
      metrics.monthlyCost >= AI_CONFIG.BUDGET.COST_ALERT_THRESHOLD;

    const withinLimits =
      !dailyLimitReached && !monthlyLimitReached && !costAlertThresholdReached;

    if (!withinLimits) {
      this.logger.warn(
        `Budget limits exceeded for project ${projectId}: daily=${dailyLimitReached}, monthly=${monthlyLimitReached}, cost=${costAlertThresholdReached}`,
      );
    }

    return {
      withinLimits,
      dailyLimitReached,
      monthlyLimitReached,
      costAlertThresholdReached,
    };
  }

  /**
   * Get cost summary for a period
   */
  async getCostSummary(
    projectId: string,
    period: 'daily' | 'weekly' | 'monthly',
    startDate: Date,
    endDate: Date,
  ): Promise<AiCostSummary> {
    const logs = await this.aiOperationLogRepo.find({
      where: {
        projectId,
        createdAt: Between(startDate, endDate),
        success: true,
      },
      select: ['operationType', 'totalTokens', 'cost'],
    });

    const totalOperations = logs.length;
    const totalTokens = logs.reduce((sum, log) => sum + log.totalTokens, 0);
    const totalCost = logs.reduce((sum, log) => sum + Number(log.cost), 0);

    const costByOperation: Record<AiOperationType, number> = {} as any;
    const tokensByOperation: Record<AiOperationType, number> = {} as any;

    for (const log of logs) {
      const opType = log.operationType;
      costByOperation[opType] = (costByOperation[opType] || 0) + Number(log.cost);
      tokensByOperation[opType] = (tokensByOperation[opType] || 0) + log.totalTokens;
    }

    return {
      projectId,
      period,
      startDate,
      endDate,
      totalOperations,
      totalTokens,
      totalCost,
      costByOperation,
      tokensByOperation,
    };
  }

  /**
   * Get operation logs with filters
   */
  async getOperationLogs(params: {
    projectId: string;
    userId?: string;
    operationType?: AiOperationType;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ data: AiOperationLog[]; total: number }> {
    const queryBuilder = this.aiOperationLogRepo
      .createQueryBuilder('log')
      .where('log.projectId = :projectId', { projectId: params.projectId });

    if (params.userId) {
      queryBuilder.andWhere('log.userId = :userId', { userId: params.userId });
    }

    if (params.operationType) {
      queryBuilder.andWhere('log.operationType = :operationType', {
        operationType: params.operationType,
      });
    }

    if (params.startDate) {
      queryBuilder.andWhere('log.createdAt >= :startDate', {
        startDate: params.startDate,
      });
    }

    if (params.endDate) {
      queryBuilder.andWhere('log.createdAt <= :endDate', {
        endDate: params.endDate,
      });
    }

    const total = await queryBuilder.getCount();

    queryBuilder
      .orderBy('log.createdAt', 'DESC')
      .limit(params.limit || 50)
      .offset(params.offset || 0);

    const data = await queryBuilder.getMany();

    return { data, total };
  }

  /**
   * Get average response time by operation type
   */
  async getAverageResponseTimes(
    projectId: string,
  ): Promise<Record<AiOperationType, number>> {
    const stats = await this.aiOperationLogRepo
      .createQueryBuilder('log')
      .select('log.operationType', 'operationType')
      .addSelect('AVG(log.responseTime)', 'avgResponseTime')
      .where('log.projectId = :projectId', { projectId })
      .andWhere('log.success = true')
      .groupBy('log.operationType')
      .getRawMany();

    const result: Record<AiOperationType, number> = {} as any;

    for (const stat of stats) {
      result[stat.operationType as AiOperationType] = parseFloat(
        stat.avgResponseTime,
      );
    }

    return result;
  }

  /**
   * Get cache hit rate
   */
  async getCacheHitRate(
    projectId: string,
    operationType?: AiOperationType,
  ): Promise<{ cacheHitRate: number; totalOperations: number }> {
    const queryBuilder = this.aiOperationLogRepo
      .createQueryBuilder('log')
      .where('log.projectId = :projectId', { projectId })
      .andWhere('log.success = true');

    if (operationType) {
      queryBuilder.andWhere('log.operationType = :operationType', {
        operationType,
      });
    }

    const [totalOperations, cachedOperations] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.clone().andWhere('log.cached = true').getCount(),
    ]);

    const cacheHitRate =
      totalOperations > 0 ? (cachedOperations / totalOperations) * 100 : 0;

    return {
      cacheHitRate,
      totalOperations,
    };
  }

  /**
   * Clean up old logs (retention policy)
   */
  async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.aiOperationLogRepo
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    const deletedCount = result.affected || 0;

    if (deletedCount > 0) {
      this.logger.log(
        `Cleaned up ${deletedCount} AI operation logs older than ${retentionDays} days`,
      );
    }

    return deletedCount;
  }
}
