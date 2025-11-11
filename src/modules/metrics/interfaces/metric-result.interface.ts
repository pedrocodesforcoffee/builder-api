import { MetricGroup } from '../enums/metric-group.enum';
import { TrendDirection } from '../enums/trend-direction.enum';

/**
 * Individual metric value with metadata
 */
export interface MetricValue {
  /** The metric identifier */
  key: string;

  /** The calculated value */
  value: any;

  /** Display label for the metric */
  label?: string;

  /** Unit of measurement */
  unit?: string;

  /** Formatting hint (e.g., 'percentage', 'currency', 'number') */
  format?: string;

  /** Previous value for comparison */
  previousValue?: any;

  /** Change from previous value */
  change?: number;

  /** Percentage change from previous */
  changePercentage?: number;

  /** Trend direction */
  trend?: TrendDirection;

  /** Whether this metric has an alert */
  hasAlert?: boolean;

  /** Alert severity if applicable */
  alertSeverity?: string;

  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * MetricResult Interface
 *
 * Standard return type for all metric calculations
 */
export interface MetricResult {
  /** The metric group this result belongs to */
  group: MetricGroup;

  /** Timestamp when metrics were calculated */
  calculatedAt: Date;

  /** Time taken to calculate in milliseconds */
  calculationDuration: number;

  /** Main metrics data */
  metrics: Record<string, any>;

  /** Structured metric values for UI display */
  values?: MetricValue[];

  /** Key performance indicators */
  kpis?: {
    primary?: MetricValue;
    secondary?: MetricValue[];
  };

  /** Summary statistics */
  summary?: {
    total?: number;
    count?: number;
    average?: number;
    min?: number;
    max?: number;
    median?: number;
    [key: string]: any;
  };

  /** Breakdown by category/dimension */
  breakdown?: {
    dimension: string;
    items: Array<{
      name: string;
      value: any;
      percentage?: number;
      metadata?: Record<string, any>;
    }>;
  };

  /** Time series data if applicable */
  timeSeries?: Array<{
    timestamp: Date;
    value: any;
    label?: string;
  }>;

  /** Comparison data if requested */
  comparison?: {
    type: string;
    baseValue: any;
    currentValue: any;
    difference: number;
    percentageChange: number;
    direction: TrendDirection;
  };

  /** Any warnings during calculation */
  warnings?: string[];

  /** Any errors (partial failures) */
  errors?: Array<{
    metric: string;
    error: string;
    fallbackValue?: any;
  }>;

  /** Data source version for cache invalidation */
  dataSourceVersion?: string;

  /** Additional metadata */
  metadata?: Record<string, any>;

  /** Whether this is a partial result due to errors */
  isPartial?: boolean;

  /** Whether this result was served from cache */
  fromCache?: boolean;

  /** Cache expiry time if applicable */
  expiresAt?: Date;
}