/**
 * ComparisonType Enum
 *
 * Types of comparisons for metric analysis
 */
export enum ComparisonType {
  /** Compare against original baseline/plan */
  BASELINE = 'BASELINE',

  /** Compare against similar projects */
  SIMILAR_PROJECTS = 'SIMILAR_PROJECTS',

  /** Compare against organization average */
  ORG_AVERAGE = 'ORG_AVERAGE',

  /** Compare against industry benchmarks */
  INDUSTRY = 'INDUSTRY',
}