/**
 * Submit Cost Transfer DTO
 *
 * Empty DTO for workflow action: DRAFT → PENDING_APPROVAL
 *
 * This action submits a draft cost transfer for approval.
 * Once submitted, the transfer cannot be edited. It must be
 * either approved or rejected by an authorized user.
 *
 * Validation rules enforced during submission:
 * - Transfer must be in DRAFT status
 * - All required fields must be populated
 * - From and To cost codes must exist in the specified budget
 * - From and To cost codes must be different
 * - Amount must be greater than 0
 */
export class SubmitCostTransferDto {}
