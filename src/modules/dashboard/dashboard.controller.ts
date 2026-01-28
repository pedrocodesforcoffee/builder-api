import {
  Controller,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { NeedsAttentionService } from './services/needs-attention.service';
import { AttentionItemsService } from './services/attention-items.service';
import { ActionItemDto } from './dto/action-item.dto';
import { AttentionItemsResponseDto } from './dto/attention-items-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

/**
 * Dashboard Controller
 *
 * Handles dashboard-related endpoints:
 * - Attention items (aggregated by type)
 * - Needs attention items (individual actionable items)
 *
 * All endpoints require authentication (JwtAuthGuard)
 */
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(
    private readonly needsAttentionService: NeedsAttentionService,
    private readonly attentionItemsService: AttentionItemsService,
  ) {}

  /**
   * Get needs attention items
   *
   * GET /dashboard/needs-attention
   *
   * Returns actionable items requiring immediate user attention across all their projects.
   * Aggregates items from multiple sources:
   * - RFIs awaiting response (assigned or ball-in-court)
   * - Punch list items past due or in progress
   * - Inspections due soon or overdue
   * - Approvals pending (budgets, change orders, submittals, payment applications)
   * - Safety incidents requiring follow-up
   *
   * Returns maximum 10 items, sorted by priority (high first) then due date.
   *
   * @param req - Request with authenticated user
   * @returns Array of action items (max 10)
   *
   * @example
   * Request:
   * ```
   * GET /dashboard/needs-attention
   * Authorization: Bearer <token>
   * ```
   *
   * Success Response (200):
   * ```json
   * [
   *   {
   *     "id": "rfi-042",
   *     "type": "rfi",
   *     "title": "RFI-042: HVAC Routing Conflict",
   *     "description": "Mechanical and structural conflict on Level 3",
   *     "projectId": "proj-123",
   *     "projectName": "Downtown Tower",
   *     "priority": "high",
   *     "dueDate": "2025-01-20T00:00:00Z",
   *     "isOverdue": true,
   *     "assignedToMe": true,
   *     "createdAt": "2025-01-10T08:00:00Z",
   *     "url": "/projects/proj-123/rfis/rfi-042"
   *   },
   *   {
   *     "id": "punch-015",
   *     "type": "punch_list",
   *     "title": "Punch Item #15: Drywall patch in lobby",
   *     "projectId": "proj-456",
   *     "projectName": "Riverside Apartments",
   *     "priority": "medium",
   *     "dueDate": "2025-01-28T00:00:00Z",
   *     "isOverdue": false,
   *     "assignedToMe": true,
   *     "createdAt": "2025-01-15T10:00:00Z",
   *     "url": "/projects/proj-456/punch-lists/pl-01/items/punch-015"
   *   }
   * ]
   * ```
   */
  @Get('needs-attention')
  @HttpCode(HttpStatus.OK)
  async getNeedsAttention(@Req() req: Request): Promise<ActionItemDto[]> {
    const userId = (req as any).user.id;
    return this.needsAttentionService.getNeedsAttention(userId);
  }

  /**
   * Get aggregated attention items
   *
   * GET /dashboard/attention-items
   *
   * Returns attention items aggregated by type with counts and urgency levels.
   * Groups RFIs, inspections, approvals, safety incidents, and punch list items.
   *
   * @param req - Request with authenticated user
   * @param limit - Max types to return (default: 5)
   * @param projectId - Optional filter by specific project
   * @returns Aggregated attention items
   *
   * @example
   * Request:
   * ```
   * GET /dashboard/attention-items?limit=5
   * Authorization: Bearer <token>
   * ```
   *
   * Success Response (200):
   * ```json
   * {
   *   "totalCount": 10,
   *   "items": [
   *     {
   *       "type": "rfi",
   *       "count": 5,
   *       "label": "RFIs",
   *       "urgency": "high",
   *       "viewAllUrl": "/rfis",
   *       "projects": [
   *         {
   *           "id": "proj-123",
   *           "name": "Downtown Tower"
   *         },
   *         {
   *           "id": "proj-456",
   *           "name": "Riverside Apartments"
   *         }
   *       ]
   *     },
   *     {
   *       "type": "punchlist",
   *       "count": 3,
   *       "label": "Punch List Items",
   *       "urgency": "medium",
   *       "viewAllUrl": "/punch-lists",
   *       "projects": [
   *         {
   *           "id": "proj-123",
   *           "name": "Downtown Tower"
   *         }
   *       ]
   *     }
   *   ]
   * }
   * ```
   */
  @Get('attention-items')
  @HttpCode(HttpStatus.OK)
  async getAttentionItems(
    @Req() req: Request,
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit?: number,
    @Query('projectId') projectId?: string,
  ): Promise<AttentionItemsResponseDto> {
    const userId = (req as any).user.id;
    return this.attentionItemsService.getAttentionItems(userId, limit, projectId);
  }
}
