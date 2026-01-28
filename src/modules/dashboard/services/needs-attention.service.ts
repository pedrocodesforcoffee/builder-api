import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Rfi, RfiStatus, RfiPriority } from '../../rfis/entities/rfi.entity';
import { PunchItem } from '../../punch-list/entities/punch-item.entity';
import {
  PunchItemStatus,
  PunchItemPriority,
} from '../../punch-list/enums/punch-list.enum';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import {
  ActionItemDto,
  ActionItemType,
  ActionItemPriority,
} from '../dto/action-item.dto';

/**
 * NeedsAttentionService
 *
 * Aggregates actionable items from multiple sources:
 * - RFIs awaiting response
 * - Punch list items past due or assigned
 * - Inspections due soon
 * - Approvals pending
 * - Safety incidents requiring follow-up
 *
 * Returns top 10 items sorted by priority and due date
 */
@Injectable()
export class NeedsAttentionService {
  private readonly logger = new Logger(NeedsAttentionService.name);

  constructor(
    @InjectRepository(Rfi)
    private readonly rfiRepo: Repository<Rfi>,
    @InjectRepository(PunchItem)
    private readonly punchItemRepo: Repository<PunchItem>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,
  ) {}

  /**
   * Get needs attention items for a user
   *
   * Aggregates items from multiple sources and returns top 10
   * sorted by priority (high first) then due date
   *
   * @param userId - User ID to get items for
   * @returns Array of action items (max 10)
   */
  async getNeedsAttention(userId: string): Promise<ActionItemDto[]> {
    this.logger.log(`Fetching needs attention items for user ${userId}`);

    // Get user's projects
    const userProjects = await this.projectMemberRepo.find({
      where: { userId },
      relations: ['project'],
    });

    const projectIds = userProjects.map((pm) => pm.projectId);

    if (projectIds.length === 0) {
      this.logger.log(`User ${userId} has no projects, returning empty array`);
      return [];
    }

    // Create a project map for quick lookup
    const projectMap = new Map(
      userProjects.map((pm) => [pm.project.id, pm.project]),
    );

    // Fetch action items from different sources in parallel
    const [rfiItems, punchItems] = await Promise.all([
      this.getRfiActionItems(userId, projectIds, projectMap),
      this.getPunchListActionItems(userId, projectIds, projectMap),
    ]);

    // Combine all items
    const allItems = [...rfiItems, ...punchItems];

    // Sort by priority (high first) then by due date (earliest first)
    const sortedItems = allItems.sort((a, b) => {
      // Priority order: high > medium > low
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];

      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      // If same priority, sort by due date (items with no due date go last)
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;

      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    // Return top 10 items
    const topItems = sortedItems.slice(0, 10);

    this.logger.log(
      `Found ${allItems.length} needs attention items for user ${userId}, returning top ${topItems.length}`,
    );

    return topItems;
  }

  /**
   * Get RFI action items
   *
   * Returns RFIs that are:
   * - Assigned to the user
   * - In OPEN status
   * - Overdue or due soon
   */
  private async getRfiActionItems(
    userId: string,
    projectIds: string[],
    projectMap: Map<string, any>,
  ): Promise<ActionItemDto[]> {
    const rfis = await this.rfiRepo.find({
      where: [
        {
          assignedToId: userId,
          status: RfiStatus.OPEN,
        },
        {
          ballInCourtUserId: userId,
          status: RfiStatus.OPEN,
        },
      ],
      relations: ['project'],
      take: 20, // Get more than 10 so we can sort and filter
      order: { dueDate: 'ASC' },
    });

    return rfis
      .filter((rfi) => projectIds.includes(rfi.projectId))
      .map((rfi) => {
        const isOverdue = rfi.dueDate
          ? new Date(rfi.dueDate) < new Date()
          : false;

        return {
          id: rfi.id,
          type: ActionItemType.RFI,
          title: `RFI-${rfi.sequenceNumber}: ${rfi.subject}`,
          description: rfi.question?.substring(0, 200),
          projectId: rfi.projectId,
          projectName: rfi.project?.name || projectMap.get(rfi.projectId)?.name || 'Unknown',
          priority: this.mapRfiPriority(rfi.priority),
          dueDate: rfi.dueDate?.toISOString(),
          isOverdue,
          assignedToMe: rfi.assignedToId === userId,
          createdAt: rfi.createdAt.toISOString(),
          url: `/projects/${rfi.projectId}/rfis/${rfi.id}`,
        };
      });
  }

  /**
   * Get punch list action items
   *
   * Returns punch items that are:
   * - Assigned to the user
   * - Not closed
   * - Overdue or in progress
   */
  private async getPunchListActionItems(
    userId: string,
    projectIds: string[],
    projectMap: Map<string, any>,
  ): Promise<ActionItemDto[]> {
    const punchItems = await this.punchItemRepo.find({
      where: {
        assignedToId: userId,
      },
      relations: ['project'],
      take: 20,
      order: { dueDate: 'ASC' },
    });

    return punchItems
      .filter(
        (item) =>
          projectIds.includes(item.projectId) &&
          item.status !== PunchItemStatus.CLOSED,
      )
      .map((item) => {
        const isOverdue = item.dueDate
          ? new Date(item.dueDate) < new Date()
          : false;

        return {
          id: item.id,
          type: ActionItemType.PUNCH_LIST,
          title: `Punch Item #${item.itemNumber}: ${item.description.substring(0, 50)}`,
          description: item.description?.substring(0, 200),
          projectId: item.projectId,
          projectName: item.project?.name || projectMap.get(item.projectId)?.name || 'Unknown',
          priority: this.mapPunchPriority(item.priority),
          dueDate: item.dueDate?.toISOString(),
          isOverdue,
          assignedToMe: true,
          createdAt: item.createdAt.toISOString(),
          url: `/projects/${item.projectId}/punch-lists/${item.punchListId}/items/${item.id}`,
        };
      });
  }

  /**
   * Map RFI priority to ActionItem priority
   */
  private mapRfiPriority(priority: RfiPriority): ActionItemPriority {
    switch (priority) {
      case RfiPriority.CRITICAL:
      case RfiPriority.HIGH:
        return ActionItemPriority.HIGH;
      case RfiPriority.MEDIUM:
        return ActionItemPriority.MEDIUM;
      case RfiPriority.LOW:
        return ActionItemPriority.LOW;
      default:
        return ActionItemPriority.MEDIUM;
    }
  }

  /**
   * Map PunchItem priority to ActionItem priority
   */
  private mapPunchPriority(priority: PunchItemPriority): ActionItemPriority {
    switch (priority) {
      case PunchItemPriority.HIGH:
      case PunchItemPriority.CRITICAL:
        return ActionItemPriority.HIGH;
      case PunchItemPriority.MEDIUM:
        return ActionItemPriority.MEDIUM;
      case PunchItemPriority.LOW:
        return ActionItemPriority.LOW;
      default:
        return ActionItemPriority.MEDIUM;
    }
  }
}
