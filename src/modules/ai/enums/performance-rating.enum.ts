/**
 * Performance Rating Enum
 * Used for rating subcontractor/vendor performance
 */
export enum PerformanceRating {
  EXCELLENT = 'EXCELLENT', // 90-100% - Outstanding performance
  GOOD = 'GOOD', // 75-89% - Above average
  SATISFACTORY = 'SATISFACTORY', // 60-74% - Meets expectations
  NEEDS_IMPROVEMENT = 'NEEDS_IMPROVEMENT', // 40-59% - Below expectations
  POOR = 'POOR', // 0-39% - Significant issues
  NOT_RATED = 'NOT_RATED', // Insufficient data to rate
}
