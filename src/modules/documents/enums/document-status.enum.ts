/**
 * Document Status Enum
 *
 * Defines the lifecycle status of a document through review and approval process.
 *
 * SECURITY NOTE: QUARANTINED status is part of the quarantine-first architecture.
 * Documents remain QUARANTINED until they pass virus scanning.
 */
export enum DocumentStatus {
  /** Document is in quarantine pending virus scan (SECURITY CRITICAL) */
  QUARANTINED = 'quarantined',
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUPERSEDED = 'superseded',
  ARCHIVED = 'archived',
}
