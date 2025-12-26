/**
 * Approve Cost Transfer DTO
 *
 * Empty DTO for workflow action: PENDING_APPROVAL → APPROVED
 *
 * This action approves a cost transfer request and creates the
 * associated cost entries to record the budget movement.
 *
 * When a cost transfer is approved, the system automatically creates
 * two CostEntry records:
 *
 * 1. FROM Entry (Debit):
 *    - Cost code: fromCostCodeId
 *    - Amount: -amount (negative to reduce budget)
 *    - Type: COST_TRANSFER
 *    - Description: "Cost transfer to [toCostCode] - [reason]"
 *
 * 2. TO Entry (Credit):
 *    - Cost code: toCostCodeId
 *    - Amount: +amount (positive to increase budget)
 *    - Type: COST_TRANSFER
 *    - Description: "Cost transfer from [fromCostCode] - [reason]"
 *
 * Both entries are linked back to the cost transfer record via
 * fromEntryId and toEntryId fields for complete audit traceability.
 *
 * Authorization:
 * - User must have permission to approve cost transfers
 * - May require specific approval thresholds based on amount
 */
export class ApproveCostTransferDto {}
