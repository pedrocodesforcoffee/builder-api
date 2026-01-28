import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rfi, RfiStatus, RfiPriority } from '../../rfis/entities/rfi.entity';
import { PunchItem } from '../../punch-list/entities/punch-item.entity';
import {
  PunchItemStatus,
  PunchItemPriority,
} from '../../punch-list/enums/punch-list.enum';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import {
  AttentionItemsResponseDto,
  AttentionItemDto,
  AttentionItemType,
  AttentionItemUrgency,
  AttentionItemProjectDto,
} from '../dto/attention-items-response.dto';

/**
 * Internal item for aggregation
 */
interface InternalAttentionItem {
  type: AttentionItemType;
  projectId: string;
  projectName: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * AttentionItemsService
 *
 * Aggregates actionable items from multiple sources and groups them by type:
 * - RFIs awaiting response
 * - Punch list items past due
 * - Inspections due soon
 * - Approvals pending
 * - Safety incidents requiring follow-up
 *
 * Returns aggregated counts and urgency levels per type
 */
@Injectable()
export class AttentionItemsService {
  private readonly logger = new Logger(AttentionItemsService.name);

  constructor(
    @InjectRepository(Rfi)
    private readonly rfiRepo: Repository<Rfi>,
    @InjectRepository(PunchItem)
    private readonly punchItemRepo: Repository<PunchItem>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,
  ) {}

  /**
   * Get aggregated attention items for a user
   *
   * Groups items by type with counts and urgency levels
   *
   * @param userId - User ID to get items for
   * @param limit - Max types to return (default: 5)
   * @param projectId - Optional filter by project
   * @returns Aggregated attention items
   */
  async getAttentionItems(
    userId: string,
    limit = 5,
    projectId?: string,
  ): Promise<AttentionItemsResponseDto> {
    this.logger.log(
      `Fetching attention items for user ${userId} (limit: ${limit}, projectId: ${projectId || 'all'})`,
    );

    // Get user's projects
    const userProjects = await this.projectMemberRepo.find({
      where: projectId ? { userId, projectId } : { userId },
      relations: ['project'],
    });

    const projectIds = userProjects.map((pm) => pm.projectId);

    if (projectIds.length === 0) {
      this.logger.log(`User ${userId} has no projects, returning empty response`);
      return { totalCount: 0, items: [] };
    }

    // Create a project map for quick lookup
    const projectMap = new Map(
      userProjects.map((pm) => [pm.project.id, pm.project]),
    );

    // Fetch items from different sources in parallel
    const [rfiItems, punchItems] = await Promise.all([
      this.getRfiItems(userId, projectIds),
      this.getPunchListItems(userId, projectIds),
    ]);

    // Combine all items
    const allItems: InternalAttentionItem[] = [
      ...rfiItems.map((item) => ({
        type: AttentionItemType.RFI,
        projectId: item.projectId,
        projectName: projectMap.get(item.projectId)?.name || 'Unknown',
        priority: item.priority,
      })),
      ...punchItems.map((item) => ({
        type: AttentionItemType.PUNCHLIST,
        projectId: item.projectId,
        projectName: projectMap.get(item.projectId)?.name || 'Unknown',
        priority: item.priority,
      })),
    ];

    // Aggregate by type
    const aggregated = this.aggregateByType(allItems, limit);

    const totalCount = allItems.length;

    this.logger.log(
      `Found ${totalCount} attention items for user ${userId}, returning ${aggregated.length} types`,
    );

    return {
      totalCount,
      items: aggregated,
    };
  }

  /**
   * Get RFI items requiring attention
   */
  private async getRfiItems(
    userId: string,
    projectIds: string[],
  ): Promise<Array<{ projectId: string; priority: 'high' | 'medium' | 'low' }>> {
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
      select: ['id', 'projectId', 'priority'],
    });

    return rfis
      .filter((rfi) => projectIds.includes(rfi.projectId))
      .map((rfi) => ({
        projectId: rfi.projectId,
        priority: this.mapRfiPriority(rfi.priority),
      }));
  }

  /**
   * Get punch list items requiring attention
   */
  private async getPunchListItems(
    userId: string,
    projectIds: string[],
  ): Promise<Array<{ projectId: string; priority: 'high' | 'medium' | 'low' }>> {
    const punchItems = await this.punchItemRepo.find({
      where: {
        assignedToId: userId,
      },
      select: ['id', 'projectId', 'priority', 'status', 'dueDate'],
    });

    return punchItems
      .filter(
        (item) =>
          projectIds.includes(item.projectId) &&
          item.status !== PunchItemStatus.CLOSED &&
          (item.dueDate ? new Date(item.dueDate) < new Date() : false),
      )
      .map((item) => ({
        projectId: item.projectId,
        priority: this.mapPunchPriority(item.priority),
      }));
  }

  /**
   * Aggregate items by type
   */
  private aggregateByType(
    items: InternalAttentionItem[],
    limit: number,
  ): AttentionItemDto[] {
    // Group by type
    const typeGroups = new Map<
      AttentionItemType,
      {
        items: InternalAttentionItem[];
        projects: Map<string, string>;
      }
    >();

    for (const item of items) {
      if (!typeGroups.has(item.type)) {
        typeGroups.set(item.type, {
          items: [],
          projects: new Map<string, string>(),
        });
      }

      const group = typeGroups.get(item.type)!;
      group.items.push(item);
      group.projects.set(item.projectId, item.projectName);
    }

    // Convert to DTOs
    const result: AttentionItemDto[] = [];

    for (const [type, group] of typeGroups.entries()) {
      const urgency = this.calculateUrgency(group.items);
      const projects: AttentionItemProjectDto[] = Array.from(
        group.projects.entries(),
      ).map(([id, name]) => ({ id, name }));

      result.push({
        type,
        count: group.items.length,
        label: this.getTypeLabel(type),
        urgency,
        viewAllUrl: this.getViewAllUrl(type),
        projects,
      });
    }

    // Sort by urgency (high first) then count (descending)
    result.sort((a, b) => {
      const urgencyOrder = { high: 0, medium: 1, low: 2 };
      const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (urgencyDiff !== 0) return urgencyDiff;
      return b.count - a.count;
    });

    return result.slice(0, limit);
  }

  /**
   * Calculate urgency based on highest priority item
   */
  private calculateUrgency(
    items: InternalAttentionItem[],
  ): AttentionItemUrgency {
    const hasHigh = items.some((item) => item.priority === 'high');
    if (hasHigh) return AttentionItemUrgency.HIGH;

    const hasMedium = items.some((item) => item.priority === 'medium');
    if (hasMedium) return AttentionItemUrgency.MEDIUM;

    return AttentionItemUrgency.LOW;
  }

  /**
   * Get human-readable label for type
   */
  private getTypeLabel(type: AttentionItemType): string {
    switch (type) {
      case AttentionItemType.RFI:
        return 'RFIs';
      case AttentionItemType.INSPECTION:
        return 'Inspections';
      case AttentionItemType.APPROVAL:
        return 'Approvals';
      case AttentionItemType.SAFETY:
        return 'Safety Incidents';
      case AttentionItemType.PUNCHLIST:
        return 'Punch List Items';
      default:
        return 'Items';
    }
  }

  /**
   * Get view all URL for type
   */
  private getViewAllUrl(type: AttentionItemType): string {
    switch (type) {
      case AttentionItemType.RFI:
        return '/rfis';
      case AttentionItemType.INSPECTION:
        return '/inspections';
      case AttentionItemType.APPROVAL:
        return '/approvals';
      case AttentionItemType.SAFETY:
        return '/safety';
      case AttentionItemType.PUNCHLIST:
        return '/punch-lists';
      default:
        return '/';
    }
  }

  /**
   * Map RFI priority to standard priority
   */
  private mapRfiPriority(priority: RfiPriority): 'high' | 'medium' | 'low' {
    switch (priority) {
      case RfiPriority.CRITICAL:
      case RfiPriority.HIGH:
        return 'high';
      case RfiPriority.MEDIUM:
        return 'medium';
      case RfiPriority.LOW:
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Map PunchItem priority to standard priority
   */
  private mapPunchPriority(
    priority: PunchItemPriority,
  ): 'high' | 'medium' | 'low' {
    switch (priority) {
      case PunchItemPriority.HIGH:
      case PunchItemPriority.CRITICAL:
        return 'high';
      case PunchItemPriority.MEDIUM:
        return 'medium';
      case PunchItemPriority.LOW:
      case PunchItemPriority.COSMETIC:
        return 'low';
      default:
        return 'medium';
    }
  }
}
