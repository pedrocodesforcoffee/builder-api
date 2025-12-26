/**
 * AI Service
 * Main orchestration service for all AI operations
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { OpenAiClientService } from './openai-client.service';
import { AiPromptService } from './ai-prompt.service';
import { AiCostTrackingService } from './ai-cost-tracking.service';
import { AiCacheService } from './ai-cache.service';
import {
  AiOperationType,
  AI_TEMPERATURE,
  AI_MODEL_SELECTION,
  AiModel,
} from '../constants/ai-config.constants';
import { AiRequest, AiResponse } from '../interfaces/ai-operation.interface';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private openaiClient: OpenAiClientService,
    private promptService: AiPromptService,
    private costTracking: AiCostTrackingService,
    private cacheService: AiCacheService,
  ) {}

  /**
   * Check if AI features are available
   */
  isAvailable(): boolean {
    return this.openaiClient.isAvailable();
  }

  /**
   * Execute an AI operation
   */
  async executeOperation<TResult = any>(
    request: AiRequest,
    variables: Record<string, any>,
  ): Promise<AiResponse<TResult>> {
    const startTime = Date.now();

    try {
      // Check if AI is available
      if (!this.isAvailable()) {
        throw new ServiceUnavailableException(
          'AI features are not available. Please configure OPENAI_API_KEY.',
        );
      }

      // Check budget limits
      const budgetCheck = await this.costTracking.checkBudgetLimits(
        request.projectId,
      );

      if (!budgetCheck.withinLimits) {
        throw new BadRequestException(
          'AI usage budget exceeded. Please contact support to increase limits.',
        );
      }

      // Try to get cached response
      let cached = false;
      if (request.useCache !== false) {
        const cachedResponse = await this.cacheService.get(
          request.operationType,
          variables,
        );

        if (cachedResponse) {
          cached = true;

          // Still log the cached operation (with zero cost)
          await this.costTracking.logOperation({
            projectId: request.projectId,
            userId: request.userId,
            operationType: request.operationType,
            model: request.model || AI_MODEL_SELECTION[request.operationType],
            inputTokens: 0,
            outputTokens: 0,
            cost: 0,
            responseTime: Date.now() - startTime,
            cached: true,
            success: true,
            inputSummary: this.promptService.buildContextSummary(variables),
          });

          return {
            operationType: request.operationType,
            result: cachedResponse,
            tokensUsed: { input: 0, output: 0, total: 0 },
            cost: 0,
            responseTime: Date.now() - startTime,
            cached: true,
            model: request.model || AI_MODEL_SELECTION[request.operationType],
            timestamp: new Date(),
          };
        }
      }

      // Sanitize inputs
      const sanitizedVariables = this.sanitizeVariables(variables);

      // Render prompt
      const { systemPrompt, userPrompt, outputFormat } =
        this.promptService.renderPrompt(
          request.operationType,
          sanitizedVariables,
        );

      // Determine model and temperature
      const model = request.model || AI_MODEL_SELECTION[request.operationType];
      const temperature =
        request.temperature ?? AI_TEMPERATURE[request.operationType];

      // Check token limits
      if (this.openaiClient.wouldExceedTokenLimit(systemPrompt, userPrompt, model)) {
        throw new BadRequestException(
          'Request exceeds token limits. Please reduce input size.',
        );
      }

      this.logger.debug(
        `Executing AI operation: ${request.operationType} | Model: ${model} | Temp: ${temperature}`,
      );

      // Call OpenAI
      const completion = await this.openaiClient.createCompletion({
        model,
        systemPrompt,
        userPrompt,
        temperature,
        maxTokens: request.maxTokens,
        responseFormat: outputFormat === 'json' ? 'json_object' : 'text',
      });

      // Format output
      const formattedResult = this.promptService.formatOutput(
        completion.content,
        outputFormat,
      );

      // Cache the response
      if (request.useCache !== false) {
        await this.cacheService.set(
          request.operationType,
          variables,
          formattedResult,
        );
      }

      // Log the operation
      await this.costTracking.logOperation({
        projectId: request.projectId,
        userId: request.userId,
        operationType: request.operationType,
        model: completion.model,
        inputTokens: completion.tokensUsed.input,
        outputTokens: completion.tokensUsed.output,
        cost: completion.cost,
        responseTime: completion.responseTime,
        cached: false,
        success: true,
        inputSummary: this.promptService.buildContextSummary(variables),
        outputSummary: this.createOutputSummary(formattedResult),
      });

      this.logger.log(
        `AI operation completed: ${request.operationType} | Tokens: ${completion.tokensUsed.total} | Cost: $${completion.cost.toFixed(4)} | Time: ${completion.responseTime}ms`,
      );

      return {
        operationType: request.operationType,
        result: formattedResult,
        tokensUsed: completion.tokensUsed,
        cost: completion.cost,
        responseTime: Date.now() - startTime,
        cached: false,
        model: completion.model,
        timestamp: new Date(),
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      // Log failed operation
      await this.costTracking.logOperation({
        projectId: request.projectId,
        userId: request.userId,
        operationType: request.operationType,
        model: request.model || AI_MODEL_SELECTION[request.operationType],
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        responseTime,
        cached: false,
        success: false,
        errorMessage: error.message,
        inputSummary: this.promptService.buildContextSummary(variables),
      });

      this.logger.error(
        `AI operation failed: ${request.operationType} | Error: ${error.message}`,
        error.stack,
      );

      throw error;
    }
  }

  /**
   * Sanitize input variables
   */
  private sanitizeVariables(
    variables: Record<string, any>,
  ): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(variables)) {
      if (typeof value === 'string') {
        sanitized[key] = this.promptService.sanitizeInput(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map((item) =>
          typeof item === 'string'
            ? this.promptService.sanitizeInput(item)
            : item,
        );
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Create output summary for logging
   */
  private createOutputSummary(result: any): Record<string, any> {
    if (typeof result === 'string') {
      return {
        type: 'string',
        length: result.length,
        preview: this.promptService.createContentPreview(result, 200),
      };
    }

    if (Array.isArray(result)) {
      return {
        type: 'array',
        length: result.length,
        preview: result.slice(0, 3),
      };
    }

    if (typeof result === 'object' && result !== null) {
      return {
        type: 'object',
        keys: Object.keys(result),
      };
    }

    return { value: result };
  }

  /**
   * Get usage metrics for a project
   */
  async getUsageMetrics(projectId: string) {
    return this.costTracking.getUsageMetrics(projectId);
  }

  /**
   * Get cost summary for a period
   */
  async getCostSummary(
    projectId: string,
    period: 'daily' | 'weekly' | 'monthly',
    startDate: Date,
    endDate: Date,
  ) {
    return this.costTracking.getCostSummary(projectId, period, startDate, endDate);
  }

  /**
   * Get operation logs
   */
  async getOperationLogs(params: {
    projectId: string;
    userId?: string;
    operationType?: AiOperationType;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    return this.costTracking.getOperationLogs(params);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    return this.cacheService.getCacheStats();
  }

  /**
   * Invalidate cache
   */
  async invalidateCache(
    operationType?: AiOperationType,
    requestData?: Record<string, any>,
  ) {
    return this.cacheService.invalidate(operationType, requestData);
  }

  /**
   * Cleanup expired cache and old logs
   */
  async cleanup() {
    const [expiredCache, oldLogs] = await Promise.all([
      this.cacheService.cleanupExpired(),
      this.costTracking.cleanupOldLogs(90),
    ]);

    this.logger.log(
      `AI cleanup completed: ${expiredCache} expired cache entries, ${oldLogs} old logs`,
    );

    return { expiredCache, oldLogs };
  }
}
