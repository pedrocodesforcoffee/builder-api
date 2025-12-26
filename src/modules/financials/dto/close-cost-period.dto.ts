/**
 * Close Cost Period DTO
 *
 * Workflow action DTO for closing a cost period.
 * No request body required - this is a state transition action.
 *
 * Workflow Transition: OPEN → CLOSED
 *
 * What happens when a period is closed:
 * 1. Status changes from OPEN to CLOSED
 * 2. No new cost entries can be added to this period
 * 3. Snapshot of all cost data is created and stored in snapshotData (JSONB)
 * 4. closedById and closedAt are set
 * 5. Period can still be viewed but not modified
 *
 * Note: Once closed, a period can be LOCKED but cannot be reopened to OPEN status.
 * Use LOCK action to make the period permanently immutable.
 */
export class CloseCostPeriodDto {}
