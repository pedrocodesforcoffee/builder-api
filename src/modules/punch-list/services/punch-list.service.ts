import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  TreeRepository,
  DataSource,
  QueryRunner,
  IsNull,
  In,
} from 'typeorm';
import { ProjectLocation } from '../entities/project-location.entity';
import { PunchList } from '../entities/punch-list.entity';
import { PunchItem } from '../entities/punch-item.entity';
import { PunchItemPhoto } from '../entities/punch-item-photo.entity';
import { PunchItemHistory, HistoryAction } from '../entities/punch-item-history.entity';
import { User } from '../../users/entities/user.entity';
import { Project } from '../../projects/entities/project.entity';
import {
  CreateLocationDto,
  UpdateLocationDto,
  QueryLocationsDto,
  BulkCreateLocationsDto,
} from '../dto/location.dto';
import {
  CreatePunchListDto,
  UpdatePunchListDto,
  QueryPunchListsDto,
} from '../dto/punch-list.dto';
import {
  CreatePunchItemDto,
  UpdatePunchItemDto,
  QueryPunchItemsDto,
  ChangeStatusDto,
  AssignPunchItemDto,
  AddCommentDto,
  BulkUpdatePunchItemsDto,
} from '../dto/punch-item.dto';
import { PunchItemStatus, BallInCourt } from '../enums/punch-list.enum';

@Injectable()
export class PunchListService {
  constructor(
    @InjectRepository(ProjectLocation)
    private readonly locationRepository: TreeRepository<ProjectLocation>,
    @InjectRepository(PunchList)
    private readonly punchListRepository: Repository<PunchList>,
    @InjectRepository(PunchItem)
    private readonly punchItemRepository: Repository<PunchItem>,
    @InjectRepository(PunchItemPhoto)
    private readonly photoRepository: Repository<PunchItemPhoto>,
    @InjectRepository(PunchItemHistory)
    private readonly historyRepository: Repository<PunchItemHistory>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  // ============================================================================
  // LOCATION MANAGEMENT
  // ============================================================================

  /**
   * Create a new project location
   */
  async createLocation(
    createDto: CreateLocationDto,
    user: User,
  ): Promise<ProjectLocation> {
    // Verify project exists
    const project = await this.projectRepository.findOne({
      where: { id: createDto.projectId },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check for duplicate code within project
    const existing = await this.locationRepository.findOne({
      where: {
        projectId: createDto.projectId,
        code: createDto.code,
      },
    });
    if (existing) {
      throw new BadRequestException(
        `Location code '${createDto.code}' already exists in this project`,
      );
    }

    // Get parent if specified
    let parent: ProjectLocation = null;
    if (createDto.parentId) {
      parent = await this.locationRepository.findOne({
        where: { id: createDto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Parent location not found');
      }
      if (parent.projectId !== createDto.projectId) {
        throw new BadRequestException('Parent location must be in the same project');
      }
    }

    const location = this.locationRepository.create({
      ...createDto,
      parent,
      createdById: user.id,
    });

    return this.locationRepository.save(location);
  }

  /**
   * Get all locations with tree structure
   */
  async getLocations(
    queryDto: QueryLocationsDto,
  ): Promise<{ locations: ProjectLocation[]; total: number }> {
    const query = this.locationRepository.createQueryBuilder('location');

    if (queryDto.projectId) {
      query.andWhere('location.projectId = :projectId', {
        projectId: queryDto.projectId,
      });
    }

    if (queryDto.type) {
      query.andWhere('location.type = :type', { type: queryDto.type });
    }

    if (queryDto.parentId) {
      query.andWhere('location.parentId = :parentId', {
        parentId: queryDto.parentId,
      });
    }

    if (queryDto.search) {
      query.andWhere(
        '(location.name ILIKE :search OR location.code ILIKE :search)',
        { search: `%${queryDto.search}%` },
      );
    }

    if (queryDto.includeCounts) {
      query
        .leftJoin('location.punchItems', 'punchItem')
        .addSelect('COUNT(punchItem.id)', 'punchItemCount')
        .groupBy('location.id');
    }

    query.orderBy('location.sortOrder', 'ASC').addOrderBy('location.name', 'ASC');

    const page = queryDto.page || 1;
    const limit = queryDto.limit || 50;
    const skip = (page - 1) * limit;

    const [locations, total] = await query.skip(skip).take(limit).getManyAndCount();

    return { locations, total };
  }

  /**
   * Get location tree for a project
   */
  async getLocationTree(projectId: string): Promise<ProjectLocation[]> {
    const roots = await this.locationRepository.find({
      where: {
        projectId,
        parent: IsNull(),
      },
      order: {
        sortOrder: 'ASC',
        name: 'ASC',
      },
    });

    const trees = await Promise.all(
      roots.map((root) => this.locationRepository.findDescendantsTree(root)),
    );

    return trees;
  }

  /**
   * Get single location with details
   */
  async getLocation(id: string): Promise<ProjectLocation> {
    const location = await this.locationRepository.findOne({
      where: { id },
      relations: ['parent', 'project', 'createdBy'],
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    // Get punch item count
    const punchItemCount = await this.punchItemRepository.count({
      where: { locationId: id },
    });
    location.punchItemCount = punchItemCount;

    // Build full path
    const ancestors = await this.locationRepository.findAncestors(location);
    location.fullPath = ancestors.map((a) => a.name).join(' / ');

    return location;
  }

  /**
   * Update a location
   */
  async updateLocation(
    id: string,
    updateDto: UpdateLocationDto,
    user: User,
  ): Promise<ProjectLocation> {
    const location = await this.getLocation(id);

    // If updating parent, validate
    if (updateDto.parentId !== undefined) {
      if (updateDto.parentId) {
        const newParent = await this.locationRepository.findOne({
          where: { id: updateDto.parentId },
        });
        if (!newParent) {
          throw new NotFoundException('New parent location not found');
        }
        if (newParent.projectId !== location.projectId) {
          throw new BadRequestException('Parent must be in same project');
        }
        // Prevent circular reference
        const descendants = await this.locationRepository.findDescendants(location);
        if (descendants.some((d) => d.id === updateDto.parentId)) {
          throw new BadRequestException('Cannot set descendant as parent');
        }
      }
    }

    // Check code uniqueness if changed
    if (updateDto.code && updateDto.code !== location.code) {
      const existing = await this.locationRepository.findOne({
        where: {
          projectId: location.projectId,
          code: updateDto.code,
        },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException(
          `Location code '${updateDto.code}' already exists in this project`,
        );
      }
    }

    Object.assign(location, updateDto);
    return this.locationRepository.save(location);
  }

  /**
   * Delete a location
   */
  async deleteLocation(id: string): Promise<void> {
    const location = await this.getLocation(id);

    // Check if location has punch items
    const itemCount = await this.punchItemRepository.count({
      where: { locationId: id },
    });
    if (itemCount > 0) {
      throw new BadRequestException(
        'Cannot delete location with punch items. Remove or reassign items first.',
      );
    }

    // Check if location has children
    const children = await this.locationRepository.findDescendants(location);
    if (children.length > 1) {
      // More than 1 means it has children (includes itself)
      throw new BadRequestException(
        'Cannot delete location with child locations. Delete children first.',
      );
    }

    await this.locationRepository.remove(location);
  }

  /**
   * Bulk create locations
   */
  async bulkCreateLocations(
    bulkDto: BulkCreateLocationsDto,
    user: User,
  ): Promise<ProjectLocation[]> {
    const locations: ProjectLocation[] = [];

    for (const locationDto of bulkDto.locations) {
      const location = await this.createLocation(locationDto, user);
      locations.push(location);
    }

    return locations;
  }

  // ============================================================================
  // PUNCH LIST MANAGEMENT
  // ============================================================================

  /**
   * Create a new punch list
   */
  async createPunchList(
    createDto: CreatePunchListDto,
    user: User,
  ): Promise<PunchList> {
    // Verify project exists
    const project = await this.projectRepository.findOne({
      where: { id: createDto.projectId },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const punchList = this.punchListRepository.create({
      ...createDto,
      createdById: user.id,
      updatedById: user.id,
    });

    return this.punchListRepository.save(punchList);
  }

  /**
   * Get punch lists with filters
   */
  async getPunchLists(
    queryDto: QueryPunchListsDto,
  ): Promise<{ punchLists: PunchList[]; total: number }> {
    const query = this.punchListRepository
      .createQueryBuilder('punchList')
      .leftJoinAndSelect('punchList.createdBy', 'createdBy')
      .leftJoinAndSelect('punchList.project', 'project');

    if (queryDto.projectId) {
      query.andWhere('punchList.projectId = :projectId', {
        projectId: queryDto.projectId,
      });
    }

    if (queryDto.type) {
      query.andWhere('punchList.type = :type', { type: queryDto.type });
    }

    if (queryDto.isActive !== undefined) {
      query.andWhere('punchList.isActive = :isActive', {
        isActive: queryDto.isActive,
      });
    }

    if (queryDto.isLocked !== undefined) {
      query.andWhere('punchList.isLocked = :isLocked', {
        isLocked: queryDto.isLocked,
      });
    }

    if (queryDto.includeItems) {
      query.leftJoinAndSelect('punchList.punchItems', 'punchItems');
    }

    query.orderBy('punchList.createdAt', 'DESC');

    const [punchLists, total] = await query.getManyAndCount();

    return { punchLists, total };
  }

  /**
   * Get single punch list
   */
  async getPunchList(id: string): Promise<PunchList> {
    const punchList = await this.punchListRepository.findOne({
      where: { id },
      relations: ['project', 'createdBy', 'updatedBy'],
    });

    if (!punchList) {
      throw new NotFoundException('Punch list not found');
    }

    // Update statistics
    await this.updatePunchListStats(id);

    return this.punchListRepository.findOne({
      where: { id },
      relations: ['project', 'createdBy', 'updatedBy'],
    });
  }

  /**
   * Update punch list
   */
  async updatePunchList(
    id: string,
    updateDto: UpdatePunchListDto,
    user: User,
  ): Promise<PunchList> {
    const punchList = await this.getPunchList(id);

    if (punchList.isLocked && !updateDto.isLocked) {
      // Allow unlocking but validate user has permission
      // You might want to add role checks here
    }

    Object.assign(punchList, {
      ...updateDto,
      updatedById: user.id,
    });

    return this.punchListRepository.save(punchList);
  }

  /**
   * Delete punch list
   */
  async deletePunchList(id: string): Promise<void> {
    const punchList = await this.getPunchList(id);

    if (punchList.isLocked) {
      throw new BadRequestException('Cannot delete locked punch list');
    }

    // Check if has items
    const itemCount = await this.punchItemRepository.count({
      where: { punchListId: id },
    });
    if (itemCount > 0) {
      throw new BadRequestException(
        'Cannot delete punch list with items. Delete items first or mark list as inactive.',
      );
    }

    await this.punchListRepository.remove(punchList);
  }

  /**
   * Update punch list statistics
   */
  private async updatePunchListStats(punchListId: string): Promise<void> {
    const stats = await this.punchItemRepository
      .createQueryBuilder('item')
      .select('COUNT(*)', 'total')
      .addSelect(
        "SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END)",
        'openItems',
      )
      .addSelect(
        "SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END)",
        'inProgressItems',
      )
      .addSelect(
        "SUM(CASE WHEN status IN ('APPROVED', 'CLOSED') THEN 1 ELSE 0 END)",
        'completedItems',
      )
      .where('item.punchListId = :punchListId', { punchListId })
      .getRawOne();

    await this.punchListRepository.update(punchListId, {
      totalItems: parseInt(stats.total) || 0,
      openItems: parseInt(stats.openItems) || 0,
      inProgressItems: parseInt(stats.inProgressItems) || 0,
      completedItems: parseInt(stats.completedItems) || 0,
    });
  }

  // ============================================================================
  // PUNCH ITEM MANAGEMENT
  // ============================================================================

  /**
   * Create a new punch item
   */
  async createPunchItem(
    createDto: CreatePunchItemDto,
    user: User,
  ): Promise<PunchItem> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verify punch list exists and is not locked
      const punchList = await this.punchListRepository.findOne({
        where: { id: createDto.punchListId },
      });
      if (!punchList) {
        throw new NotFoundException('Punch list not found');
      }
      if (punchList.isLocked) {
        throw new BadRequestException('Cannot add items to locked punch list');
      }

      // Create punch item
      const punchItem = this.punchItemRepository.create({
        ...createDto,
        status: PunchItemStatus.OPEN,
        ballInCourt: createDto.ballInCourt || BallInCourt.SUBCONTRACTOR,
        createdById: user.id,
        updatedById: user.id,
      });

      const savedItem = await queryRunner.manager.save(punchItem) as PunchItem;

      // Create history entry
      await this.createHistoryEntry(
        savedItem.id,
        HistoryAction.CREATED,
        'Punch item created',
        null,
        user,
        queryRunner.manager,
      );

      // Update punch list stats
      await this.updatePunchListStats(createDto.punchListId);

      await queryRunner.commitTransaction();

      return this.getPunchItem(savedItem.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get punch items with advanced filters
   */
  async getPunchItems(
    queryDto: QueryPunchItemsDto,
  ): Promise<{ items: PunchItem[]; total: number }> {
    const query = this.punchItemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.punchList', 'punchList')
      .leftJoinAndSelect('item.location', 'location')
      .leftJoinAndSelect('item.assignedTo', 'assignedTo')
      .leftJoinAndSelect('item.createdBy', 'createdBy');

    if (queryDto.punchListId) {
      query.andWhere('item.punchListId = :punchListId', {
        punchListId: queryDto.punchListId,
      });
    }

    if (queryDto.projectId) {
      query.andWhere('item.projectId = :projectId', {
        projectId: queryDto.projectId,
      });
    }

    if (queryDto.locationId) {
      query.andWhere('item.locationId = :locationId', {
        locationId: queryDto.locationId,
      });
    }

    if (queryDto.status) {
      query.andWhere('item.status = :status', { status: queryDto.status });
    }

    if (queryDto.priority) {
      query.andWhere('item.priority = :priority', { priority: queryDto.priority });
    }

    if (queryDto.category) {
      query.andWhere('item.category = :category', { category: queryDto.category });
    }

    if (queryDto.ballInCourt) {
      query.andWhere('item.ballInCourt = :ballInCourt', {
        ballInCourt: queryDto.ballInCourt,
      });
    }

    if (queryDto.assignedToId) {
      query.andWhere('item.assignedToId = :assignedToId', {
        assignedToId: queryDto.assignedToId,
      });
    }

    if (queryDto.trade) {
      query.andWhere('item.trade = :trade', { trade: queryDto.trade });
    }

    if (queryDto.responsibleCompany) {
      query.andWhere('item.responsibleCompany = :responsibleCompany', {
        responsibleCompany: queryDto.responsibleCompany,
      });
    }

    if (queryDto.overdue) {
      query.andWhere('item.dueDate < :now', { now: new Date() });
      query.andWhere("item.status NOT IN ('CLOSED', 'APPROVED')");
    }

    if (queryDto.search) {
      query.andWhere('item.description ILIKE :search', {
        search: `%${queryDto.search}%`,
      });
    }

    if (queryDto.includePhotos) {
      query.leftJoinAndSelect('item.photos', 'photos');
    }

    if (queryDto.includeHistory) {
      query.leftJoinAndSelect('item.history', 'history');
    }

    // Sorting
    const sortBy = queryDto.sortBy || 'createdAt';
    const sortOrder = queryDto.sortOrder || 'DESC';
    query.orderBy(`item.${sortBy}`, sortOrder as any);

    // Pagination
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await query.skip(skip).take(limit).getManyAndCount();

    return { items, total };
  }

  /**
   * Get single punch item with full details
   */
  async getPunchItem(id: string): Promise<PunchItem> {
    const item = await this.punchItemRepository.findOne({
      where: { id },
      relations: [
        'punchList',
        'location',
        'assignedTo',
        'createdBy',
        'updatedBy',
        'photos',
        'history',
        'history.createdBy',
      ],
      order: {
        photos: { createdAt: 'ASC' },
        history: { createdAt: 'DESC' },
      },
    });

    if (!item) {
      throw new NotFoundException('Punch item not found');
    }

    return item;
  }

  /**
   * Update punch item
   */
  async updatePunchItem(
    id: string,
    updateDto: UpdatePunchItemDto,
    user: User,
  ): Promise<PunchItem> {
    const item = await this.getPunchItem(id);

    if (item.punchList.isLocked) {
      throw new BadRequestException('Cannot update items in locked punch list');
    }

    const changes: any = {};
    for (const key of Object.keys(updateDto)) {
      if (item[key] !== updateDto[key]) {
        changes[key] = { old: item[key], new: updateDto[key] };
      }
    }

    Object.assign(item, {
      ...updateDto,
      updatedById: user.id,
    });

    const savedItem = await this.punchItemRepository.save(item);

    // Create history entry for significant changes
    if (Object.keys(changes).length > 0) {
      await this.createHistoryEntry(
        id,
        HistoryAction.UPDATED,
        'Punch item updated',
        { changes },
        user,
      );
    }

    return this.getPunchItem(id);
  }

  /**
   * Change punch item status
   */
  async changeStatus(
    id: string,
    statusDto: ChangeStatusDto,
    user: User,
  ): Promise<PunchItem> {
    const item = await this.getPunchItem(id);

    if (item.punchList.isLocked) {
      throw new BadRequestException('Cannot change status in locked punch list');
    }

    const oldStatus = item.status;
    item.status = statusDto.status;
    item.updatedById = user.id;

    if (statusDto.resolutionNotes) {
      item.resolutionNotes = statusDto.resolutionNotes;
    }

    if (statusDto.rejectionReason) {
      item.rejectionReason = statusDto.rejectionReason;
    }

    if (
      statusDto.status === PunchItemStatus.APPROVED ||
      statusDto.status === PunchItemStatus.CLOSED
    ) {
      item.completedDate = new Date();
    }

    const savedItem = await this.punchItemRepository.save(item);

    // Create history entry
    await this.createHistoryEntry(
      id,
      HistoryAction.STATUS_CHANGED,
      `Status changed from ${oldStatus} to ${statusDto.status}`,
      {
        changes: {
          status: { oldValue: oldStatus, newValue: statusDto.status },
        },
      },
      user,
    );

    if (statusDto.comment) {
      await this.addComment(id, { comment: statusDto.comment }, user);
    }

    // Update punch list stats
    await this.updatePunchListStats(item.punchListId);

    return this.getPunchItem(id);
  }

  /**
   * Assign punch item
   */
  async assignPunchItem(
    id: string,
    assignDto: AssignPunchItemDto,
    user: User,
  ): Promise<PunchItem> {
    const item = await this.getPunchItem(id);

    // Verify assigned user exists
    const assignedUser = await this.userRepository.findOne({
      where: { id: assignDto.assignedToId },
    });
    if (!assignedUser) {
      throw new NotFoundException('Assigned user not found');
    }

    const oldAssignedId = item.assignedToId;
    item.assignedToId = assignDto.assignedToId;
    item.updatedById = user.id;

    if (assignDto.dueDate) {
      item.dueDate = new Date(assignDto.dueDate);
    }

    const savedItem = await this.punchItemRepository.save(item);

    // Create history entry
    await this.createHistoryEntry(
      id,
      HistoryAction.ASSIGNED,
      `Assigned to ${assignedUser.name}`,
      {
        changes: {
          assignedTo: {
            oldValue: oldAssignedId,
            newValue: assignDto.assignedToId,
          },
        },
      },
      user,
    );

    if (assignDto.comment) {
      await this.addComment(id, { comment: assignDto.comment }, user);
    }

    return this.getPunchItem(id);
  }

  /**
   * Add comment to punch item
   */
  async addComment(
    id: string,
    commentDto: AddCommentDto,
    user: User,
  ): Promise<PunchItemHistory> {
    const item = await this.getPunchItem(id);

    return this.createHistoryEntry(
      id,
      HistoryAction.COMMENTED,
      null,
      null,
      user,
      null,
      commentDto.comment,
    );
  }

  /**
   * Bulk update punch items
   */
  async bulkUpdatePunchItems(
    bulkDto: BulkUpdatePunchItemsDto,
    user: User,
  ): Promise<{ updated: number; errors: string[] }> {
    const errors: string[] = [];
    let updated = 0;

    for (const itemId of bulkDto.itemIds) {
      try {
        const item = await this.getPunchItem(itemId);

        if (item.punchList.isLocked) {
          errors.push(`Item ${itemId}: Punch list is locked`);
          continue;
        }

        const updates: any = {};
        if (bulkDto.status) updates.status = bulkDto.status;
        if (bulkDto.priority) updates.priority = bulkDto.priority;
        if (bulkDto.assignedToId) updates.assignedToId = bulkDto.assignedToId;
        if (bulkDto.dueDate) updates.dueDate = new Date(bulkDto.dueDate);
        if (bulkDto.ballInCourt) updates.ballInCourt = bulkDto.ballInCourt;

        Object.assign(item, { ...updates, updatedById: user.id });
        await this.punchItemRepository.save(item);

        // Create history entry
        await this.createHistoryEntry(
          itemId,
          HistoryAction.UPDATED,
          'Bulk update applied',
          { updates },
          user,
        );

        updated++;
      } catch (error) {
        errors.push(`Item ${itemId}: ${error.message}`);
      }
    }

    // Update stats for affected punch lists
    const punchListIds = [
      ...new Set(
        (
          await this.punchItemRepository.find({
            where: { id: In(bulkDto.itemIds) },
            select: ['punchListId'],
          })
        ).map((item) => item.punchListId),
      ),
    ];

    for (const punchListId of punchListIds) {
      await this.updatePunchListStats(punchListId);
    }

    return { updated, errors };
  }

  /**
   * Delete punch item
   */
  async deletePunchItem(id: string, user: User): Promise<void> {
    const item = await this.getPunchItem(id);

    if (item.punchList.isLocked) {
      throw new BadRequestException('Cannot delete items from locked punch list');
    }

    const punchListId = item.punchListId;
    await this.punchItemRepository.remove(item);

    // Update punch list stats
    await this.updatePunchListStats(punchListId);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Create history entry
   */
  private async createHistoryEntry(
    punchItemId: string,
    action: HistoryAction,
    description: string,
    changes: any,
    user: User,
    manager?: any,
    comment?: string,
  ): Promise<PunchItemHistory> {
    const history = this.historyRepository.create({
      punchItemId,
      action,
      description,
      comment,
      changes,
      createdById: user.id,
    });

    if (manager) {
      return manager.save(PunchItemHistory, history);
    }
    return this.historyRepository.save(history);
  }

  /**
   * Get punch item statistics
   */
  async getPunchItemStats(projectId?: string): Promise<any> {
    const query = this.punchItemRepository.createQueryBuilder('item');

    if (projectId) {
      query.where('item.projectId = :projectId', { projectId });
    }

    const total = await query.getCount();

    const byStatus = await query
      .select('item.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('item.status')
      .getRawMany();

    const byPriority = await query
      .select('item.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .groupBy('item.priority')
      .getRawMany();

    const byCategory = await query
      .select('item.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy('item.category')
      .getRawMany();

    const byBallInCourt = await query
      .select('item.ballInCourt', 'ballInCourt')
      .addSelect('COUNT(*)', 'count')
      .groupBy('item.ballInCourt')
      .getRawMany();

    const overdue = await query
      .where('item.dueDate < :now', { now: new Date() })
      .andWhere("item.status NOT IN ('CLOSED', 'APPROVED')")
      .getCount();

    const completedThisWeek = await query
      .where('item.completedDate >= :weekAgo', {
        weekAgo: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      })
      .getCount();

    return {
      total,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
      byPriority: byPriority.reduce((acc, item) => {
        acc[item.priority] = parseInt(item.count);
        return acc;
      }, {}),
      byCategory: byCategory.reduce((acc, item) => {
        acc[item.category] = parseInt(item.count);
        return acc;
      }, {}),
      byBallInCourt: byBallInCourt.reduce((acc, item) => {
        acc[item.ballInCourt] = parseInt(item.count);
        return acc;
      }, {}),
      overdue,
      completedThisWeek,
      averageDaysToComplete: 0, // TODO: Calculate this
    };
  }
}
