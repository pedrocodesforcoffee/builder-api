/**
 * Recommendation Status Enum
 * Tracks the lifecycle state of a recommendation
 */
export enum RecommendationStatus {
  PENDING = 'PENDING', // Generated, not yet shown to user
  ACTIVE = 'ACTIVE', // Currently visible to user
  ACCEPTED = 'ACCEPTED', // User accepted and applied recommendation
  REJECTED = 'REJECTED', // User explicitly dismissed
  EXPIRED = 'EXPIRED', // Expired due to time or context change
  SUPERSEDED = 'SUPERSEDED', // Replaced by newer recommendation
}
