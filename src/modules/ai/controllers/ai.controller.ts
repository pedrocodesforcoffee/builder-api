/**
 * AI Controller
 * Main API endpoints for AI usage, metrics, and management
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AiService } from '../services/ai.service';
import { AiOperationType } from '../constants/ai-config.constants';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private aiService: AiService) {}

  /**
   * GET /ai/availability
   * Check if AI features are available
   */
  @Get('availability')
  checkAvailability() {
    return {
      available: this.aiService.isAvailable(),
      message: this.aiService.isAvailable()
        ? 'AI features are available'
        : 'AI features are not configured. Please set OPENAI_API_KEY.',
    };
  }

  /**
   * GET /ai/projects/:projectId/usage
   * Get AI usage metrics for a project
   */
  @Get('projects/:projectId/usage')
  async getUsageMetrics(@Param('projectId') projectId: string) {
    return this.aiService.getUsageMetrics(projectId);
  }

  /**
   * GET /ai/projects/:projectId/cost-summary
   * Get cost summary for a period
   */
  @Get('projects/:projectId/cost-summary')
  async getCostSummary(
    @Param('projectId') projectId: string,
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'monthly',
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.aiService.getCostSummary(
      projectId,
      period,
      new Date(startDate),
      new Date(endDate),
    );
  }

  /**
   * GET /ai/projects/:projectId/operation-logs
   * Get operation logs
   */
  @Get('projects/:projectId/operation-logs')
  async getOperationLogs(
    @Param('projectId') projectId: string,
    @Query('userId') userId?: string,
    @Query('operationType') operationType?: AiOperationType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
  ) {
    return this.aiService.getOperationLogs({
      projectId,
      userId,
      operationType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });
  }

  /**
   * GET /ai/cache/stats
   * Get cache statistics
   */
  @Get('cache/stats')
  async getCacheStats() {
    return this.aiService.getCacheStats();
  }

  /**
   * DELETE /ai/cache/invalidate
   * Invalidate cache
   */
  @Delete('cache/invalidate')
  async invalidateCache(
    @Query('operationType') operationType?: AiOperationType,
  ) {
    const count = await this.aiService.invalidateCache(operationType);
    return {
      message: `Invalidated ${count} cache entries`,
      count,
    };
  }

  /**
   * POST /ai/cleanup
   * Cleanup expired cache and old logs
   */
  @Post('cleanup')
  async cleanup() {
    const result = await this.aiService.cleanup();
    return {
      message: 'Cleanup completed',
      expiredCache: result.expiredCache,
      oldLogs: result.oldLogs,
    };
  }
}
