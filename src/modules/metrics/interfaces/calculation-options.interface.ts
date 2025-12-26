import { ComparisonType } from '../enums/comparison-type.enum';

/**
 * CalculationOptions Interface
 *
 * Options that can be passed to metric calculators
 */
export interface CalculationOptions {
  /** Force fresh calculation, bypass cache */
  forceRefresh?: boolean;

  /** Include historical data */
  includeHistory?: boolean;

  /** Date range for historical data */
  dateRange?: {
    start: Date;
    end: Date;
  };

  /** Include comparison data */
  includeComparison?: boolean;

  /** Type of comparison to perform */
  comparisonType?: ComparisonType;

  /** Include breakdown by dimension */
  includeBreakdown?: boolean;

  /** Dimension to break down by */
  breakdownDimension?: string;

  /** Include time series data */
  includeTimeSeries?: boolean;

  /** Time series interval (e.g., 'daily', 'weekly', 'monthly') */
  timeSeriesInterval?: 'hourly' | 'daily' | 'weekly' | 'monthly';

  /** Include trend analysis */
  includeTrends?: boolean;

  /** Number of periods for trend calculation */
  trendPeriods?: number;

  /** Include KPI calculations */
  includeKpis?: boolean;

  /** Specific metrics to calculate (if not all) */
  metrics?: string[];

  /** Exclude specific metrics */
  excludeMetrics?: string[];

  /** Include debug information */
  debug?: boolean;

  /** Timeout for calculation in milliseconds */
  timeout?: number;

  /** User context for permissions/filtering */
  userContext?: {
    userId: string;
    roles: string[];
    permissions: string[];
  };

  /** Additional context data */
  context?: Record<string, any>;

  /** Whether to include alerts in response */
  includeAlerts?: boolean;

  /** Whether to evaluate thresholds */
  evaluateThresholds?: boolean;

  /** Custom thresholds to use (overrides defaults) */
  customThresholds?: Array<{
    metric: string;
    condition: string;
    value: any;
    severity: string;
  }>;

  /** Aggregation options */
  aggregation?: {
    method: 'sum' | 'avg' | 'min' | 'max' | 'count';
    groupBy?: string;
  };

  /** Pagination for large datasets */
  pagination?: {
    page: number;
    limit: number;
  };

  /** Sorting options */
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };

  /** Locale for formatting */
  locale?: string;

  /** Timezone for date calculations */
  timezone?: string;

  /** Currency for financial metrics */
  currency?: string;
}