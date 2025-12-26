/**
 * Lock Cost Period DTO
 *
 * Workflow action DTO for locking a cost period.
 * No request body required - this is a state transition action.
 *
 * Workflow Transition: CLOSED → LOCKED
 *
 * What happens when a period is locked:
 * 1. Status changes from CLOSED to LOCKED
 * 2. Period becomes permanently immutable (cannot be reopened)
 * 3. lockedById and lockedAt are set
 * 4. Snapshot data is preserved for audit compliance
 * 5. Period data is frozen for historical reporting
 *
 * Important: LOCKED is a terminal state. Once locked, a period cannot be
 * unlocked or modified in any way. This ensures data integrity for
 * financial audits and regulatory compliance.
 */
export class LockCostPeriodDto {}
