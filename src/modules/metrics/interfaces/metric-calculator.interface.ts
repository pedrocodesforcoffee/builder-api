import { MetricGroup } from '../enums/metric-group.enum';
import { MetricResult } from './metric-result.interface';
import { CalculationOptions } from './calculation-options.interface';
import { ValidationResult } from './validation-result.interface';

/**
 * MetricCalculator Interface
 *
 * Base interface that all metric calculators must implement.
 * Provides a consistent API for calculating, validating, and managing metrics.
 */
export interface MetricCalculator {
  /**
   * Unique name of this calculator
   */
  readonly name: string;

  /**
   * Metric group this calculator belongs to
   */
  readonly group: MetricGroup;

  /**
   * Time-to-live in seconds for cached results
   * 0 means no caching
   */
  readonly ttl: number;

  /**
   * Whether this calculator provides real-time metrics
   * Real-time metrics may bypass caching
   */
  readonly isRealTime: boolean;

  /**
   * List of other calculators this one depends on
   * Used for dependency resolution and cache invalidation
   */
  readonly dependencies: string[];

  /**
   * Calculate metrics for a project
   *
   * @param projectId - The project to calculate metrics for
   * @param options - Calculation options
   * @returns Calculated metrics result
   */
  calculate(projectId: string, options?: CalculationOptions): Promise<MetricResult>;

  /**
   * Get the current data source version
   * Used to detect when underlying data has changed
   *
   * @param projectId - The project ID
   * @returns Version string (e.g., timestamp, hash)
   */
  getDataSourceVersion(projectId: string): Promise<string>;

  /**
   * Validate that calculation can be performed
   *
   * @param projectId - The project to validate
   * @returns Validation result with any warnings or errors
   */
  validate(projectId: string): Promise<ValidationResult>;

  /**
   * Optional: Handle metric calculation error
   * Allows calculators to provide fallback values or custom error handling
   *
   * @param error - The error that occurred
   * @param projectId - The project ID
   * @returns Fallback metric result or rethrows error
   */
  handleError?(error: Error, projectId: string): Promise<MetricResult>;

  /**
   * Optional: Pre-warm cache for multiple projects
   * Used for batch processing and optimization
   *
   * @param projectIds - List of project IDs to pre-calculate
   */
  warmCache?(projectIds: string[]): Promise<void>;

  /**
   * Optional: Clean up resources
   * Called when calculator is being destroyed
   */
  cleanup?(): Promise<void>;
}