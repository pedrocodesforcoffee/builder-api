import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectFolder, PermissionRule } from '../entities/project-folder.entity';
import { AccessLevel } from '../enums/access-level.enum';

/**
 * Folder Validation Service
 *
 * Handles validation logic for folder operations including:
 * - Circular reference prevention
 * - Duplicate name checking
 * - Permission validation
 * - Path and level calculation
 */
@Injectable()
export class FolderValidationService {
  constructor(
    @InjectRepository(ProjectFolder)
    private readonly folderRepository: Repository<ProjectFolder>,
  ) {}

  /**
   * Validate folder move operation
   *
   * Ensures that moving a folder to a new parent won't create circular references
   * or invalid hierarchies.
   *
   * @param folderId - ID of folder being moved
   * @param newParentId - ID of new parent folder (null for root)
   * @throws BadRequestException if move would create circular reference
   */
  async validateMove(
    folderId: string,
    newParentId: string | null,
  ): Promise<void> {
    // Moving to root is always valid
    if (!newParentId) {
      return;
    }

    // Cannot move folder to itself
    if (folderId === newParentId) {
      throw new BadRequestException('Cannot move folder to itself');
    }

    // Check if new parent is a descendant of the folder being moved
    const isDescendant = await this.isDescendantOf(newParentId, folderId);
    if (isDescendant) {
      throw new BadRequestException(
        'Cannot move folder to one of its descendants (would create circular reference)',
      );
    }

    // Verify new parent exists
    const newParent = await this.folderRepository.findOne({
      where: { id: newParentId },
    });

    if (!newParent) {
      throw new BadRequestException('New parent folder not found');
    }
  }

  /**
   * Check if a folder is a descendant of another folder
   *
   * @param potentialDescendantId - ID of potential descendant
   * @param ancestorId - ID of potential ancestor
   * @returns true if potentialDescendantId is a descendant of ancestorId
   */
  private async isDescendantOf(
    potentialDescendantId: string,
    ancestorId: string,
  ): Promise<boolean> {
    let currentFolder = await this.folderRepository.findOne({
      where: { id: potentialDescendantId },
      relations: ['parent'],
    });

    while (currentFolder?.parentId) {
      if (currentFolder.parentId === ancestorId) {
        return true;
      }

      currentFolder = await this.folderRepository.findOne({
        where: { id: currentFolder.parentId },
        relations: ['parent'],
      });
    }

    return false;
  }

  /**
   * Validate folder name uniqueness
   *
   * Ensures no duplicate folder names exist within the same parent folder.
   *
   * @param name - Folder name to validate
   * @param projectId - Project ID
   * @param parentId - Parent folder ID (null for root)
   * @param excludeFolderId - Folder ID to exclude from check (for updates)
   * @throws BadRequestException if duplicate name exists
   */
  async validateFolderName(
    name: string,
    projectId: string,
    parentId: string | null,
    excludeFolderId?: string,
  ): Promise<void> {
    const queryBuilder = this.folderRepository
      .createQueryBuilder('folder')
      .where('folder.projectId = :projectId', { projectId })
      .andWhere('LOWER(folder.name) = LOWER(:name)', { name });

    // Handle null parent (root level)
    if (parentId === null) {
      queryBuilder.andWhere('folder.parentId IS NULL');
    } else {
      queryBuilder.andWhere('folder.parentId = :parentId', { parentId });
    }

    // Exclude current folder when updating
    if (excludeFolderId) {
      queryBuilder.andWhere('folder.id != :excludeFolderId', {
        excludeFolderId,
      });
    }

    const existingFolder = await queryBuilder.getOne();

    if (existingFolder) {
      throw new BadRequestException(
        `A folder named "${name}" already exists in this location`,
      );
    }
  }

  /**
   * Validate permission rules
   *
   * Ensures permission rules are valid and have either roleId or userId.
   *
   * @param permissions - Array of permission rules to validate
   * @throws BadRequestException if permissions are invalid
   */
  validatePermissions(permissions: PermissionRule[]): void {
    if (!permissions || permissions.length === 0) {
      return;
    }

    for (const permission of permissions) {
      // Each permission must have either roleId or userId, but not both
      if (!permission.roleId && !permission.userId) {
        throw new BadRequestException(
          'Each permission must have either roleId or userId',
        );
      }

      if (permission.roleId && permission.userId) {
        throw new BadRequestException(
          'Permission cannot have both roleId and userId',
        );
      }

      // Validate access level
      if (!Object.values(AccessLevel).includes(permission.access)) {
        throw new BadRequestException(
          `Invalid access level: ${permission.access}`,
        );
      }
    }
  }

  /**
   * Calculate full path for a folder
   *
   * Generates the complete path from root to folder (e.g., /Parent/Child/Folder)
   *
   * @param folder - Folder entity (partial with name)
   * @param parent - Parent folder entity (null for root)
   * @returns Full path string
   */
  calculatePath(
    folder: { name: string },
    parent: { path?: string; name: string } | null,
  ): string {
    if (!parent) {
      return `/${folder.name}`;
    }

    const parentPath = parent.path || `/${parent.name}`;
    return `${parentPath}/${folder.name}`;
  }

  /**
   * Calculate hierarchy level for a folder
   *
   * Determines the depth level in the folder tree (root = 0)
   *
   * @param parentLevel - Parent folder's level (null for root)
   * @returns Calculated level
   */
  calculateLevel(parentLevel: number | null): number {
    return parentLevel === null ? 0 : parentLevel + 1;
  }

  /**
   * Validate folder depth limit
   *
   * Ensures folder hierarchy doesn't exceed maximum depth
   *
   * @param level - Proposed folder level
   * @param maxDepth - Maximum allowed depth (default 10)
   * @throws BadRequestException if depth exceeds limit
   */
  validateDepth(level: number, maxDepth: number = 10): void {
    if (level >= maxDepth) {
      throw new BadRequestException(
        `Folder hierarchy cannot exceed ${maxDepth} levels`,
      );
    }
  }
}
