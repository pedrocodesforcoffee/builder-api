import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProjectFolder } from '../entities/project-folder.entity';
import { FolderValidationService } from './folder-validation.service';
import { FolderStatisticsService } from './folder-statistics.service';

/**
 * Folder Operations Service
 *
 * Handles complex folder operations including:
 * - Moving folders (with path updates)
 * - Copying folders (with optional file copying)
 * - Duplicating folders
 * - Bulk operations
 * - Path and hierarchy updates
 */
@Injectable()
export class FolderOperationsService {
  constructor(
    @InjectRepository(ProjectFolder)
    private readonly folderRepository: Repository<ProjectFolder>,
    private readonly validationService: FolderValidationService,
    private readonly statisticsService: FolderStatisticsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Move folder to a new parent
   *
   * Moves a folder (and all its contents) to a new location.
   * Updates paths and levels for the folder and all descendants.
   *
   * @param folderId - ID of folder to move
   * @param newParentId - ID of new parent (null for root)
   * @param userId - ID of user performing the operation
   * @returns Updated folder entity
   * @throws NotFoundException if folder not found
   * @throws BadRequestException if move is invalid
   */
  async moveFolder(
    folderId: string,
    newParentId: string | null,
    userId: string,
  ): Promise<ProjectFolder> {
    // Validate the move
    await this.validationService.validateMove(folderId, newParentId);

    const folder = await this.folderRepository.findOne({
      where: { id: folderId },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    // Check if folder can be modified
    if (!folder.canModify()) {
      throw new BadRequestException('This folder is locked and cannot be moved');
    }

    // Get old parent for statistics update
    const oldParentId = folder.parentId;

    // Get new parent if specified
    let newParent: ProjectFolder | null = null;
    if (newParentId) {
      newParent = await this.folderRepository.findOne({
        where: { id: newParentId },
      });

      if (!newParent) {
        throw new NotFoundException('New parent folder not found');
      }

      // Ensure folders are in the same project
      if (folder.projectId !== newParent.projectId) {
        throw new BadRequestException(
          'Cannot move folder to a different project',
        );
      }

      // Validate name uniqueness in new location
      await this.validationService.validateFolderName(
        folder.name,
        folder.projectId,
        newParentId,
        folder.id,
      );
    }

    return await this.dataSource.transaction(async (manager) => {
      // Update folder's parent
      folder.parentId = newParentId;
      folder.level = this.validationService.calculateLevel(
        newParent?.level || null,
      );
      folder.path = this.validationService.calculatePath(
        folder,
        newParent || null,
      );
      folder.updatedBy = userId;

      await manager.save(ProjectFolder, folder);

      // Update paths and levels for all descendants
      await this.updateDescendantPaths(folderId, manager);

      // Update statistics for old and new parent
      if (oldParentId) {
        await this.statisticsService.propagateStatisticsToParent(oldParentId);
      }
      if (newParentId) {
        await this.statisticsService.propagateStatisticsToParent(newParentId);
      }

      return folder;
    });
  }

  /**
   * Copy folder to a different location or project
   *
   * Creates a copy of the folder (and optionally its files) in a new location.
   * Can copy to a different project.
   *
   * @param folderId - ID of folder to copy
   * @param targetProjectId - Target project ID
   * @param targetParentId - Target parent folder ID (null for root)
   * @param copyFiles - Whether to copy files (default false)
   * @param userId - ID of user performing the operation
   * @returns New folder entity
   */
  async copyFolder(
    folderId: string,
    targetProjectId: string,
    targetParentId: string | null,
    copyFiles: boolean,
    userId: string,
  ): Promise<ProjectFolder> {
    const sourceFolder = await this.folderRepository.findOne({
      where: { id: folderId },
      relations: ['children'],
    });

    if (!sourceFolder) {
      throw new NotFoundException('Source folder not found');
    }

    // Get target parent if specified
    let targetParent: ProjectFolder | null = null;
    if (targetParentId) {
      targetParent = await this.folderRepository.findOne({
        where: { id: targetParentId },
      });

      if (!targetParent) {
        throw new NotFoundException('Target parent folder not found');
      }

      if (targetParent.projectId !== targetProjectId) {
        throw new BadRequestException(
          'Target parent must be in the target project',
        );
      }
    }

    return await this.dataSource.transaction(async (manager) => {
      const newFolder = await this.copyFolderRecursive(
        sourceFolder,
        targetProjectId,
        targetParentId,
        copyFiles,
        userId,
        manager,
      );

      // Update statistics for target parent
      if (targetParentId) {
        await this.statisticsService.propagateStatisticsToParent(
          targetParentId,
        );
      }

      return newFolder;
    });
  }

  /**
   * Recursively copy folder and its children
   *
   * @private
   */
  private async copyFolderRecursive(
    sourceFolder: ProjectFolder,
    targetProjectId: string,
    targetParentId: string | null,
    copyFiles: boolean,
    userId: string,
    manager: any,
  ): Promise<ProjectFolder> {
    // Create new folder
    const newFolder = new ProjectFolder();
    newFolder.projectId = targetProjectId;
    newFolder.parentId = targetParentId;
    newFolder.name = sourceFolder.name;
    newFolder.description = sourceFolder.description;
    newFolder.folderType = sourceFolder.folderType;
    newFolder.color = sourceFolder.color;
    newFolder.icon = sourceFolder.icon;
    newFolder.inheritPermissions = sourceFolder.inheritPermissions;
    newFolder.permissions = sourceFolder.permissions;
    newFolder.isPublic = sourceFolder.isPublic;
    newFolder.tags = sourceFolder.tags;
    newFolder.customFields = sourceFolder.customFields;
    newFolder.order = sourceFolder.order;
    newFolder.createdBy = userId;
    newFolder.updatedBy = userId;

    // Calculate path and level
    let targetParent: ProjectFolder | null = null;
    if (targetParentId) {
      targetParent = await manager.findOne(ProjectFolder, {
        where: { id: targetParentId },
      });
    }

    newFolder.level = this.validationService.calculateLevel(
      targetParent?.level || null,
    );
    newFolder.path = this.validationService.calculatePath(
      newFolder,
      targetParent || null,
    );

    await manager.save(ProjectFolder, newFolder);

    // Copy children recursively
    if (sourceFolder.children && sourceFolder.children.length > 0) {
      for (const child of sourceFolder.children) {
        await this.copyFolderRecursive(
          child,
          targetProjectId,
          newFolder.id,
          copyFiles,
          userId,
          manager,
        );
      }
    }

    // TODO: Copy files if copyFiles is true
    // This would require integration with a ProjectFile entity

    return newFolder;
  }

  /**
   * Duplicate folder in the same parent
   *
   * Creates a copy of the folder with " (Copy)" appended to the name.
   *
   * @param folderId - ID of folder to duplicate
   * @param userId - ID of user performing the operation
   * @returns New folder entity
   */
  async duplicateFolder(
    folderId: string,
    userId: string,
  ): Promise<ProjectFolder> {
    const sourceFolder = await this.folderRepository.findOne({
      where: { id: folderId },
    });

    if (!sourceFolder) {
      throw new NotFoundException('Folder not found');
    }

    // Generate unique name
    let newName = `${sourceFolder.name} (Copy)`;
    let counter = 1;

    while (true) {
      try {
        await this.validationService.validateFolderName(
          newName,
          sourceFolder.projectId,
          sourceFolder.parentId || null,
        );
        break;
      } catch {
        counter++;
        newName = `${sourceFolder.name} (Copy ${counter})`;
      }
    }

    // Copy folder with new name
    const newFolder = await this.copyFolder(
      folderId,
      sourceFolder.projectId,
      sourceFolder.parentId || null,
      false, // Don't copy files by default
      userId,
    );

    newFolder.name = newName;
    await this.folderRepository.save(newFolder);

    return newFolder;
  }

  /**
   * Move multiple folders to a new parent
   *
   * Bulk operation for moving multiple folders at once.
   *
   * @param folderIds - Array of folder IDs to move
   * @param newParentId - ID of new parent (null for root)
   * @param userId - ID of user performing the operation
   * @returns Array of updated folder entities
   */
  async bulkMove(
    folderIds: string[],
    newParentId: string | null,
    userId: string,
  ): Promise<ProjectFolder[]> {
    const movedFolders: ProjectFolder[] = [];

    for (const folderId of folderIds) {
      try {
        const folder = await this.moveFolder(folderId, newParentId, userId);
        movedFolders.push(folder);
      } catch (error) {
        // Log error but continue with other folders
        console.error(`Failed to move folder ${folderId}:`, error);
      }
    }

    return movedFolders;
  }

  /**
   * Update paths and levels for all descendant folders
   *
   * Recursively updates the path and level for all child folders
   * after a parent folder has been moved or renamed.
   *
   * @param folderId - Parent folder ID
   * @param manager - Transaction manager (optional)
   */
  async updateDescendantPaths(
    folderId: string,
    manager?: any,
  ): Promise<void> {
    const repo = manager
      ? manager.getRepository(ProjectFolder)
      : this.folderRepository;

    const children = await repo.find({
      where: { parentId: folderId },
    });

    const parent = await repo.findOne({
      where: { id: folderId },
    });

    if (!parent) {
      return;
    }

    for (const child of children) {
      child.level = parent.level + 1;
      child.path = this.validationService.calculatePath(child, parent);

      await repo.save(child);

      // Recursively update descendants
      await this.updateDescendantPaths(child.id, manager);
    }
  }

  /**
   * Update paths when a folder is renamed
   *
   * Updates the path for the folder and all its descendants.
   *
   * @param folderId - Folder ID
   * @param manager - Transaction manager (optional)
   */
  async updatePathsAfterRename(
    folderId: string,
    manager?: any,
  ): Promise<void> {
    const repo = manager
      ? manager.getRepository(ProjectFolder)
      : this.folderRepository;

    const folder = await repo.findOne({
      where: { id: folderId },
    });

    if (!folder) {
      return;
    }

    // Update this folder's path
    let parent: ProjectFolder | null = null;
    if (folder.parentId) {
      parent = await repo.findOne({
        where: { id: folder.parentId },
      });
    }

    folder.path = this.validationService.calculatePath(folder, parent || null);
    await repo.save(folder);

    // Update all descendants
    await this.updateDescendantPaths(folderId, manager);
  }
}
