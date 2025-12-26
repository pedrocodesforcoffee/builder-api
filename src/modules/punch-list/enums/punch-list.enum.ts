/**
 * Punch List Management System - Enums
 * Defines all enumeration types for punch list workflow and categorization
 */

/**
 * Status workflow for punch items
 * Flow: OPEN -> IN_PROGRESS -> READY_FOR_REVIEW -> APPROVED/DISPUTED/DEFERRED
 */
export enum PunchItemStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  READY_FOR_REVIEW = 'READY_FOR_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DISPUTED = 'DISPUTED',
  DEFERRED = 'DEFERRED',
  CLOSED = 'CLOSED',
}

/**
 * Priority levels for punch items
 */
export enum PunchItemPriority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  COSMETIC = 'COSMETIC',
}

/**
 * Categories for punch item classification
 */
export enum PunchItemCategory {
  STRUCTURAL = 'STRUCTURAL',
  ARCHITECTURAL = 'ARCHITECTURAL',
  MEP = 'MEP',
  ELECTRICAL = 'ELECTRICAL',
  PLUMBING = 'PLUMBING',
  HVAC = 'HVAC',
  FINISHES = 'FINISHES',
  DOORS_WINDOWS = 'DOORS_WINDOWS',
  FLOORING = 'FLOORING',
  CEILING = 'CEILING',
  LANDSCAPING = 'LANDSCAPING',
  OTHER = 'OTHER',
}

/**
 * Types of punch lists (scope/phase)
 */
export enum PunchListType {
  PRE_FINAL = 'PRE_FINAL',
  FINAL = 'FINAL',
  WARRANTY = 'WARRANTY',
  CLOSEOUT = 'CLOSEOUT',
  PHASE_COMPLETION = 'PHASE_COMPLETION',
  CUSTOM = 'CUSTOM',
}

/**
 * Ball-in-court tracking - who needs to act on the punch item
 */
export enum BallInCourt {
  SUBCONTRACTOR = 'SUBCONTRACTOR',
  GENERAL_CONTRACTOR = 'GENERAL_CONTRACTOR',
  OWNER = 'OWNER',
  ARCHITECT = 'ARCHITECT',
}
