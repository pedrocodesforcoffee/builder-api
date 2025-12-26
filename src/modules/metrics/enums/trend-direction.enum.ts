/**
 * TrendDirection Enum
 *
 * Direction of metric trends over time
 */
export enum TrendDirection {
  /** Metric value is increasing over time */
  INCREASING = 'INCREASING',

  /** Metric value is decreasing over time */
  DECREASING = 'DECREASING',

  /** Metric value is relatively stable */
  STABLE = 'STABLE',
}