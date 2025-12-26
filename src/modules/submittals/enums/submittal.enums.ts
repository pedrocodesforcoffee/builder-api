/**
 * Submittal Status Enum
 * Tracks the lifecycle status of a submittal
 */
export enum SubmittalStatus {
  NOT_STARTED = 'NOT_STARTED',
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  APPROVED_AS_NOTED = 'APPROVED_AS_NOTED',
  REVISE_RESUBMIT = 'REVISE_RESUBMIT',
  REJECTED = 'REJECTED',
  CLOSED = 'CLOSED',
  VOID = 'VOID',
}

/**
 * Submittal Type Enum
 * Different types of submittals
 */
export enum SubmittalType {
  PRODUCT_DATA = 'PRODUCT_DATA',
  SHOP_DRAWING = 'SHOP_DRAWING',
  SAMPLE = 'SAMPLE',
  MOCKUP = 'MOCKUP',
  CERTIFICATION = 'CERTIFICATION',
  TEST_REPORT = 'TEST_REPORT',
  DESIGN_DATA = 'DESIGN_DATA',
  MANUFACTURER_INSTRUCTIONS = 'MANUFACTURER_INSTRUCTIONS',
  OPERATION_MAINTENANCE_DATA = 'OPERATION_MAINTENANCE_DATA',
  CLOSEOUT = 'CLOSEOUT',
  OTHER = 'OTHER',
}

/**
 * Submittal Priority Enum
 * Priority levels for submittals
 */
export enum SubmittalPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}
