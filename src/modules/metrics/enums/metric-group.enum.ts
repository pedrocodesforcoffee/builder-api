/**
 * MetricGroup Enum
 *
 * Categories of metrics for project dashboards
 */
export enum MetricGroup {
  /** Schedule-related metrics (timelines, milestones, phases) */
  SCHEDULE = 'SCHEDULE',

  /** Budget and financial metrics */
  BUDGET = 'BUDGET',

  /** Document management metrics */
  DOCUMENTS = 'DOCUMENTS',

  /** RFI (Request for Information) metrics */
  RFIS = 'RFIS',

  /** Submittal tracking metrics */
  SUBMITTALS = 'SUBMITTALS',

  /** Team and collaboration metrics */
  TEAM = 'TEAM',

  /** Safety incident and compliance metrics */
  SAFETY = 'SAFETY',

  /** Quality control and assurance metrics */
  QUALITY = 'QUALITY',
}