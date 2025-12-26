/**
 * Post Cost Entry DTO
 *
 * Workflow action DTO for posting a cost entry.
 *
 * Posting a cost entry moves it from DRAFT status to POSTED status,
 * which makes it affect the budget's actual cost calculations.
 * Once posted, the cost entry is immutable and can only be reversed
 * by voiding it.
 *
 * This is an empty DTO as the cost entry ID is provided in the
 * URL path parameter and no additional data is required for the
 * post action.
 *
 * Usage:
 * POST /api/cost-entries/:id/post
 */
export class PostCostEntryDto {}
