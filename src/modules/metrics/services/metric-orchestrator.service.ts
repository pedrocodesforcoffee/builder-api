import { Injectable, Logger } from '@nestjs/common';
import { MetricCacheService } from './metric-cache.service';
import { MetricCalculator } from '../interfaces/metric-calculator.interface';
import { MetricResult } from '../interfaces/metric-result.interface';
import { CalculationOptions } from '../interfaces/calculation-options.interface';
import { MetricGroup } from '../enums/metric-group.enum';

// Import all calculators
import { ScheduleCalculatorService } from './calculators/schedule-calculator.service';
import { BudgetCalculatorService } from './calculators/budget-calculator.service';
import { DocumentCalculatorService } from './calculators/document-calculator.service';
import { TeamCalculatorService } from './calculators/team-calculator.service';
import { RFICalculatorService } from './calculators/rfi-calculator.service';
import { SubmittalsCalculatorService } from './calculators/submittals-calculator.service';
import { SafetyCalculatorService } from './calculators/safety-calculator.service';
import { QualityCalculatorService } from './calculators/quality-calculator.service';

/**
 * MetricOrchestratorService
 *
 * Main coordinator for metric calculations.
 * Manages calculator registration, parallel execution, and result aggregation.
 */
@Injectable()
export class MetricOrchestratorService {
  private readonly logger = new Logger(MetricOrchestratorService.name);
  private readonly calculators = new Map<MetricGroup, MetricCalculator>();

  constructor(
    private readonly cacheService: MetricCacheService,
    private readonly scheduleCalculator: ScheduleCalculatorService,
    private readonly budgetCalculator: BudgetCalculatorService,
    private readonly documentCalculator: DocumentCalculatorService,
    private readonly teamCalculator: TeamCalculatorService,
    private readonly rfiCalculator: RFICalculatorService,
    private readonly submittalsCalculator: SubmittalsCalculatorService,
    private readonly safetyCalculator: SafetyCalculatorService,
    private readonly qualityCalculator: QualityCalculatorService,
  ) {
    this.registerCalculators();
  }

  /**
   * Register all calculators
   */
  private registerCalculators(): void {
    this.calculators.set(MetricGroup.SCHEDULE, this.scheduleCalculator);
    this.calculators.set(MetricGroup.BUDGET, this.budgetCalculator);
    this.calculators.set(MetricGroup.DOCUMENTS, this.documentCalculator);
    this.calculators.set(MetricGroup.TEAM, this.teamCalculator);
    this.calculators.set(MetricGroup.RFIS, this.rfiCalculator);
    this.calculators.set(MetricGroup.SUBMITTALS, this.submittalsCalculator);
    this.calculators.set(MetricGroup.SAFETY, this.safetyCalculator);
    this.calculators.set(MetricGroup.QUALITY, this.qualityCalculator);

    this.logger.log(`Registered ${this.calculators.size} metric calculators`);
  }

  /**
   * Calculate all metrics for a project
   */
  async calculate(
    projectId: string,
    options?: CalculationOptions,
  ): Promise<Record<MetricGroup, MetricResult>> {
    const startTime = Date.now();
    const results: Record<string, MetricResult> = {};
    const groups = options?.metrics ? this.parseMetricGroups(options.metrics) : Array.from(this.calculators.keys());

    this.logger.debug(`Calculating ${groups.length} metric groups for project ${projectId}`);

    // Resolve dependencies and calculate in order
    const calculationOrder = this.resolveDependencyOrder(groups);

    // Group by dependency level for parallel execution
    const levels = this.groupByDependencyLevel(calculationOrder);

    for (const level of levels) {
      // Calculate all metrics at this level in parallel
      const levelPromises = level.map(async (group) => {
        try {
          const result = await this.calculateGroup(projectId, group, options);
          results[group] = result;
        } catch (error) {
          this.logger.error(`Failed to calculate ${group} metrics:`, error);
          results[group] = this.createErrorResult(group, error as Error);
        }
      });

      await Promise.all(levelPromises);
    }

    const totalDuration = Date.now() - startTime;
    this.logger.log(`Calculated ${groups.length} metric groups in ${totalDuration}ms`);

    return results as Record<MetricGroup, MetricResult>;
  }

  /**
   * Calculate a single metric group
   */
  async calculateGroup(
    projectId: string,
    group: MetricGroup,
    options?: CalculationOptions,
  ): Promise<MetricResult> {
    const calculator = this.calculators.get(group);

    if (!calculator) {
      throw new Error(`No calculator registered for metric group: ${group}`);
    }

    const startTime = Date.now();

    try {
      // Validate before calculation
      const validation = await calculator.validate(projectId);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Calculate metrics
      const result = await calculator.calculate(projectId, options);

      // Add validation warnings to result
      if (validation.warnings.length > 0) {
        result.warnings = [...(result.warnings || []), ...validation.warnings.map(w => w.message)];
      }

      // Cache the result
      const ttl = calculator.ttl || this.cacheService.getTTLForGroup(group);
      await this.cacheService.set(projectId, group, result, ttl);

      // Log slow calculations
      const duration = Date.now() - startTime;
      if (duration > 1000) {
        this.logger.warn(`Slow calculation for ${group}: ${duration}ms`);
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to calculate ${group} metrics for project ${projectId}:`, error);

      // Try to get fallback from calculator
      if (calculator.handleError) {
        return await calculator.handleError(error as Error, projectId);
      }

      throw error;
    }
  }

  /**
   * Get metrics with caching
   */
  async getMetrics(
    projectId: string,
    options?: CalculationOptions,
  ): Promise<Record<MetricGroup, MetricResult>> {
    const groups = options?.metrics ? this.parseMetricGroups(options.metrics) : Array.from(this.calculators.keys());
    const results: Record<string, MetricResult> = {};

    // Process each group
    const promises = groups.map(async (group) => {
      try {
        // Check if we should force refresh
        if (options?.forceRefresh) {
          results[group] = await this.calculateGroup(projectId, group, options);
        } else {
          // Try to get from cache
          const cached = await this.cacheService.get(projectId, group);

          if (cached) {
            results[group] = cached;
          } else {
            // Calculate if not cached
            results[group] = await this.calculateGroup(projectId, group, options);
          }
        }
      } catch (error) {
        this.logger.error(`Failed to get ${group} metrics:`, error);
        results[group] = this.createErrorResult(group, error as Error);
      }
    });

    await Promise.all(promises);

    return results as Record<MetricGroup, MetricResult>;
  }

  /**
   * Force refresh specific metric groups
   */
  async forceRefresh(
    projectId: string,
    groups?: MetricGroup[],
  ): Promise<Record<MetricGroup, MetricResult>> {
    // Invalidate cache first
    await this.cacheService.invalidate(projectId, groups);

    // Recalculate
    const options: CalculationOptions = {
      forceRefresh: true,
      metrics: groups?.map(g => g.toString()),
    };

    return this.calculate(projectId, options);
  }

  /**
   * Warm cache for multiple projects
   */
  async warmCache(projectIds: string[]): Promise<void> {
    this.logger.log(`Warming cache for ${projectIds.length} projects`);

    const promises = projectIds.map(async (projectId) => {
      try {
        // Calculate all metrics for the project
        await this.calculate(projectId, {
          includeKpis: true,
          includeBreakdown: false,
          includeTimeSeries: false,
        });
      } catch (error) {
        this.logger.error(`Failed to warm cache for project ${projectId}:`, error);
      }
    });

    await Promise.all(promises);

    this.logger.log('Cache warming completed');
  }

  /**
   * Get calculator for a specific group
   */
  getCalculator(group: MetricGroup): MetricCalculator | undefined {
    return this.calculators.get(group);
  }

  /**
   * Get all registered calculators
   */
  getAllCalculators(): Map<MetricGroup, MetricCalculator> {
    return this.calculators;
  }

  /**
   * Resolve dependency order for calculations
   */
  private resolveDependencyOrder(groups: MetricGroup[]): MetricGroup[] {
    const order: MetricGroup[] = [];
    const visited = new Set<MetricGroup>();
    const visiting = new Set<MetricGroup>();

    const visit = (group: MetricGroup) => {
      if (visited.has(group)) return;
      if (visiting.has(group)) {
        throw new Error(`Circular dependency detected for metric group: ${group}`);
      }

      visiting.add(group);

      const calculator = this.calculators.get(group);
      if (calculator) {
        // Visit dependencies first
        for (const dep of calculator.dependencies) {
          const depGroup = this.findGroupByName(dep);
          if (depGroup && groups.includes(depGroup)) {
            visit(depGroup);
          }
        }
      }

      visiting.delete(group);
      visited.add(group);
      order.push(group);
    };

    for (const group of groups) {
      visit(group);
    }

    return order;
  }

  /**
   * Group metrics by dependency level for parallel execution
   */
  private groupByDependencyLevel(groups: MetricGroup[]): MetricGroup[][] {
    const levels: MetricGroup[][] = [];
    const processed = new Set<MetricGroup>();

    while (processed.size < groups.length) {
      const level: MetricGroup[] = [];

      for (const group of groups) {
        if (processed.has(group)) continue;

        const calculator = this.calculators.get(group);
        if (!calculator) continue;

        // Check if all dependencies are processed
        const depsReady = calculator.dependencies.every((dep) => {
          const depGroup = this.findGroupByName(dep);
          return !depGroup || processed.has(depGroup) || !groups.includes(depGroup);
        });

        if (depsReady) {
          level.push(group);
        }
      }

      if (level.length === 0) {
        // Remaining groups have unresolvable dependencies
        level.push(...groups.filter(g => !processed.has(g)));
      }

      level.forEach(g => processed.add(g));
      levels.push(level);
    }

    return levels;
  }

  /**
   * Find metric group by calculator name
   */
  private findGroupByName(name: string): MetricGroup | undefined {
    for (const [group, calculator] of this.calculators.entries()) {
      if (calculator.name === name) {
        return group;
      }
    }
    return undefined;
  }

  /**
   * Parse metric names to groups
   */
  private parseMetricGroups(metrics: string[]): MetricGroup[] {
    return metrics
      .map((m) => m.toUpperCase() as MetricGroup)
      .filter((g) => Object.values(MetricGroup).includes(g));
  }

  /**
   * Create error result for failed calculations
   */
  private createErrorResult(group: MetricGroup, error: Error): MetricResult {
    return {
      group,
      calculatedAt: new Date(),
      calculationDuration: 0,
      metrics: {},
      errors: [{
        metric: group,
        error: error.message,
      }],
      isPartial: true,
      warnings: ['Calculation failed, returning empty metrics'],
    };
  }
}