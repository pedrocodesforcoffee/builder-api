import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, ILike } from 'typeorm';
import { ProjectFolder } from '../entities/project-folder.entity';
import { CreateFolderDto } from '../dto/folders/create-folder.dto';
import { UpdateFolderDto } from '../dto/folders/update-folder.dto';
import { FolderValidationService } from './folder-validation.service';
import { FolderPermissionsService } from './folder-permissions.service';
import { FolderStatisticsService } from './folder-statistics.service';
import { FolderOperationsService } from './folder-operations.service';
import { AccessLevel } from '../enums/access-level.enum';
import { FolderType } from '../enums/folder-type.enum';

/**
 * Folder tree node interface for hierarchical responses
 */
export interface FolderTreeNode extends ProjectFolder {
  children?: FolderTreeNode[];
}

/**
 * Folder list options interface
 */
export interface FolderListOptions {
  parentId?: string | null;
  folderType?: FolderType;
  includeChildren?: boolean;
  flat?: boolean;
}

/**
 * Folder search options interface
 */
export interface FolderSearchOptions {
  folderType?: FolderType;
  tags?: string[];
  includeDeleted?: boolean;
}

/**
 * Project Folder Service
 *
 * Main CRUD service for managing project folders.
 * Handles folder creation, retrieval, updates, and deletion.
 * Integrates with validation, permissions, and statistics services.
 */
@Injectable()
export class ProjectFolderService {
  constructor(
    @InjectRepository(ProjectFolder)
    private readonly folderRepository: Repository<ProjectFolder>,
    private readonly validationService: FolderValidationService,
    private readonly permissionsService: FolderPermissionsService,
    private readonly statisticsService: FolderStatisticsService,
    private readonly operationsService: FolderOperationsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new folder
   *
   * Creates a folder with proper path calculation and validation.
   * Validates name uniqueness within the same parent.
   *
   * @param projectId - Project ID
   * @param dto - Folder creation data
   * @param userId - ID of user creating the folder
   * @returns Created folder entity
   * @throws BadRequestException if validation fails
   */
  async create(
    projectId: string,
    dto: CreateFolderDto,
    userId: string,
  ): Promise<ProjectFolder> {
    // Validate folder name uniqueness
    await this.validationService.validateFolderName(
      dto.name,
      projectId,
      dto.parentId || null,
    );

    // Validate permissions if provided
    if (dto.permissions && dto.permissions.length > 0) {
      this.validationService.validatePermissions(dto.permissions);
    }

    // Get parent folder if specified
    let parent: ProjectFolder | null = null;
    if (dto.parentId) {
      parent = await this.folderRepository.findOne({
        where: { id: dto.parentId },
      });

      if (!parent) {
        throw new NotFoundException('Parent folder not found');
      }

      if (parent.projectId !== projectId) {
        throw new BadRequestException(
          'Parent folder must be in the same project',
        );
      }

      // Validate depth
      this.validationService.validateDepth(parent.level + 1);
    }

    // Create folder
    const folder = new ProjectFolder();
    folder.projectId = projectId;
    folder.parentId = dto.parentId || null;
    folder.name = dto.name;
    folder.description = dto.description;
    folder.folderType = dto.folderType;
    folder.color = dto.color;
    folder.icon = dto.icon;
    folder.inheritPermissions = dto.inheritPermissions ?? true;
    folder.isPublic = dto.isPublic ?? false;
    folder.permissions = dto.permissions || [];
    folder.tags = dto.tags || [];
    folder.customFields = dto.customFields || {};
    folder.order = dto.order || 0;
    folder.createdBy = userId;
    folder.updatedBy = userId;

    // Calculate path and level
    folder.level = this.validationService.calculateLevel(parent?.level || null);
    folder.path = this.validationService.calculatePath(folder, parent || null);

    const savedFolder = await this.folderRepository.save(folder);

    // Update parent statistics if applicable
    if (parent) {
      await this.statisticsService.propagateStatisticsToParent(parent.id);
    }

    return savedFolder;
  }

  /**
   * Find all folders in a project
   *
   * Lists folders with optional filtering by parent, type, etc.
   * Can return hierarchical or flat structure.
   *
   * @param projectId - Project ID
   * @param options - Filtering and display options
   * @returns Array of folders
   */
  async findAll(
    projectId: string,
    options: FolderListOptions = {},
  ): Promise<ProjectFolder[]> {
    const queryBuilder = this.folderRepository
      .createQueryBuilder('folder')
      .where('folder.projectId = :projectId', { projectId })
      .orderBy('folder.order', 'ASC')
      .addOrderBy('folder.name', 'ASC');

    // Filter by parent
    if (options.parentId !== undefined) {
      if (options.parentId === null) {
        queryBuilder.andWhere('folder.parentId IS NULL');
      } else {
        queryBuilder.andWhere('folder.parentId = :parentId', {
          parentId: options.parentId,
        });
      }
    }

    // Filter by folder type
    if (options.folderType) {
      queryBuilder.andWhere('folder.folderType = :folderType', {
        folderType: options.folderType,
      });
    }

    // Include children relation if needed
    if (options.includeChildren) {
      queryBuilder.leftJoinAndSelect('folder.children', 'children');
    }

    return await queryBuilder.getMany();
  }

  /**
   * Find a single folder by ID
   *
   * Retrieves a folder with optional relations.
   *
   * @param id - Folder ID
   * @returns Folder entity
   * @throws NotFoundException if folder not found
   */
  async findOne(id: string): Promise<ProjectFolder> {
    const folder = await this.folderRepository.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    return folder;
  }

  /**
   * Update a folder
   *
   * Updates folder properties.
   * Handles name changes by updating paths for folder and descendants.
   *
   * @param id - Folder ID
   * @param dto - Update data
   * @param userId - ID of user updating the folder
   * @returns Updated folder entity
   * @throws NotFoundException if folder not found
   * @throws BadRequestException if validation fails
   */
  async update(
    id: string,
    dto: UpdateFolderDto,
    userId: string,
  ): Promise<ProjectFolder> {
    const folder = await this.folderRepository.findOne({
      where: { id },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    // Check if folder can be modified
    if (!folder.canModify()) {
      throw new BadRequestException('This folder is locked and cannot be modified');
    }

    // Validate name change if provided
    if (dto.name && dto.name !== folder.name) {
      await this.validationService.validateFolderName(
        dto.name,
        folder.projectId,
        folder.parentId || null,
        folder.id,
      );
    }

    // Validate permissions if provided
    if (dto.permissions && dto.permissions.length > 0) {
      this.validationService.validatePermissions(dto.permissions);
    }

    const nameChanged = dto.name && dto.name !== folder.name;

    return await this.dataSource.transaction(async (manager) => {
      // Update folder properties
      if (dto.name) folder.name = dto.name;
      if (dto.description !== undefined) folder.description = dto.description;
      if (dto.folderType) folder.folderType = dto.folderType;
      if (dto.color !== undefined) folder.color = dto.color;
      if (dto.icon !== undefined) folder.icon = dto.icon;
      if (dto.inheritPermissions !== undefined)
        folder.inheritPermissions = dto.inheritPermissions;
      if (dto.isPublic !== undefined) folder.isPublic = dto.isPublic;
      if (dto.permissions) folder.permissions = dto.permissions;
      if (dto.tags) folder.tags = dto.tags;
      if (dto.customFields) folder.customFields = dto.customFields;
      if (dto.order !== undefined) folder.order = dto.order;

      folder.updatedBy = userId;

      await manager.save(ProjectFolder, folder);

      // Update paths if name changed
      if (nameChanged) {
        await this.operationsService.updatePathsAfterRename(id, manager);
      }

      return folder;
    });
  }

  /**
   * Soft delete a folder
   *
   * Marks folder as deleted (can be restored).
   * Validates that folder can be deleted (not system, not locked, etc.).
   *
   * @param id - Folder ID
   * @throws NotFoundException if folder not found
   * @throws BadRequestException if folder cannot be deleted
   */
  async remove(id: string): Promise<void> {
    const folder = await this.folderRepository.findOne({
      where: { id },
      relations: ['children'],
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    // Check if folder can be deleted
    if (!folder.canDelete()) {
      throw new BadRequestException(
        'This folder cannot be deleted (system folder or locked)',
      );
    }

    // Check for files
    if (folder.hasFiles()) {
      throw new BadRequestException(
        'Cannot delete folder that contains files. Please delete or move files first.',
      );
    }

    // Check for children
    if (folder.hasChildren()) {
      throw new BadRequestException(
        'Cannot delete folder that contains subfolders. Please delete or move subfolders first.',
      );
    }

    // Soft delete
    await this.folderRepository.softRemove(folder);

    // Update parent statistics
    if (folder.parentId) {
      await this.statisticsService.propagateStatisticsToParent(folder.parentId);
    }
  }

  /**
   * Restore a soft-deleted folder
   *
   * @param id - Folder ID
   * @returns Restored folder entity
   * @throws NotFoundException if folder not found
   */
  async restore(id: string): Promise<ProjectFolder> {
    const folder = await this.folderRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    if (!folder.deletedAt) {
      throw new BadRequestException('Folder is not deleted');
    }

    await this.folderRepository.recover(folder);

    // Update parent statistics
    if (folder.parentId) {
      await this.statisticsService.propagateStatisticsToParent(folder.parentId);
    }

    return folder;
  }

  /**
   * Get folder tree for a project
   *
   * Returns hierarchical folder structure with access control.
   * Only includes folders the user has access to.
   *
   * @param projectId - Project ID
   * @param user - User object with id and roleIds
   * @returns Root-level folders with nested children
   */
  async getFolderTree(
    projectId: string,
    user?: { id: string; roleIds?: string[] },
  ): Promise<FolderTreeNode[]> {
    // Get all folders for the project
    const allFolders = await this.folderRepository.find({
      where: { projectId },
      order: { order: 'ASC', name: 'ASC' },
    });

    // Filter folders based on user access if user is provided
    let accessibleFolders = allFolders;
    if (user) {
      accessibleFolders = await this.filterFoldersByAccess(allFolders, user);
    }

    // Build tree structure
    return this.buildFolderTree(accessibleFolders, null);
  }

  /**
   * Filter folders by user access
   *
   * @private
   */
  private async filterFoldersByAccess(
    folders: ProjectFolder[],
    user: { id: string; roleIds?: string[] },
  ): Promise<ProjectFolder[]> {
    const accessibleFolders: ProjectFolder[] = [];

    for (const folder of folders) {
      try {
        const accessLevel = await this.permissionsService.getUserAccessLevel(
          folder,
          user,
        );

        if (accessLevel !== AccessLevel.NO_ACCESS) {
          accessibleFolders.push(folder);
        }
      } catch {
        // Skip folders with access errors
      }
    }

    return accessibleFolders;
  }

  /**
   * Build hierarchical folder tree
   *
   * @private
   */
  private buildFolderTree(
    folders: ProjectFolder[],
    parentId: string | null,
  ): FolderTreeNode[] {
    const children = folders.filter((f) => f.parentId === parentId);

    return children.map((folder) => {
      const node: FolderTreeNode = {
        ...folder,
        children: this.buildFolderTree(folders, folder.id),
      } as FolderTreeNode;

      return node;
    });
  }

  /**
   * Search folders
   *
   * Searches folders by name or path with optional filters.
   *
   * @param projectId - Project ID
   * @param query - Search query string
   * @param options - Search options
   * @returns Array of matching folders
   */
  async searchFolders(
    projectId: string,
    query: string,
    options: FolderSearchOptions = {},
  ): Promise<ProjectFolder[]> {
    const queryBuilder = this.folderRepository
      .createQueryBuilder('folder')
      .where('folder.projectId = :projectId', { projectId });

    // Search by name or path
    if (query) {
      queryBuilder.andWhere(
        '(LOWER(folder.name) LIKE LOWER(:query) OR LOWER(folder.path) LIKE LOWER(:query))',
        { query: `%${query}%` },
      );
    }

    // Filter by folder type
    if (options.folderType) {
      queryBuilder.andWhere('folder.folderType = :folderType', {
        folderType: options.folderType,
      });
    }

    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      queryBuilder.andWhere('folder.tags && :tags', { tags: options.tags });
    }

    // Include deleted folders if requested
    if (options.includeDeleted) {
      queryBuilder.withDeleted();
    }

    queryBuilder.orderBy('folder.path', 'ASC');

    return await queryBuilder.getMany();
  }

  /**
   * Get breadcrumb trail for a folder
   *
   * Returns the path from root to the specified folder.
   *
   * @param folderId - Folder ID
   * @returns Array of folders from root to target
   * @throws NotFoundException if folder not found
   */
  async getBreadcrumb(folderId: string): Promise<ProjectFolder[]> {
    const folder = await this.folderRepository.findOne({
      where: { id: folderId },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    const breadcrumb: ProjectFolder[] = [folder];
    let currentFolder = folder;

    // Walk up the tree to root
    while (currentFolder.parentId) {
      const parent = await this.folderRepository.findOne({
        where: { id: currentFolder.parentId },
      });

      if (!parent) {
        break;
      }

      breadcrumb.unshift(parent);
      currentFolder = parent;
    }

    return breadcrumb;
  }
}
