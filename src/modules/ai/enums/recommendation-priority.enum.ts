/**
 * Recommendation Priority Enum
 * Indicates the urgency/importance of a recommendation
 */
export enum RecommendationPriority {
  CRITICAL = 'CRITICAL', // Requires immediate attention (e.g., safety risks)
  HIGH = 'HIGH', // Important, should be addressed soon
  MEDIUM = 'MEDIUM', // Standard priority
  LOW = 'LOW', // Nice to have, can be addressed later
  INFO = 'INFO', // Informational only, no action required
}
