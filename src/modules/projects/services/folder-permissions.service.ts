import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectFolder, PermissionRule } from '../entities/project-folder.entity';
import { AccessLevel } from '../enums/access-level.enum';

/**
 * Access level hierarchy for comparison
 * Higher number = more access
 */
const ACCESS_HIERARCHY: Record<AccessLevel, number> = {
  [AccessLevel.NO_ACCESS]: 0,
  [AccessLevel.READ_ONLY]: 1,
  [AccessLevel.READ_WRITE]: 2,
  [AccessLevel.ADMIN]: 3,
  [AccessLevel.OWNER]: 4,
};

/**
 * Folder Permissions Service
 *
 * Handles permission-related operations including:
 * - Effective permission calculation (with inheritance)
 * - Access checking for users
 * - Permission propagation to child folders
 * - Access level comparison
 */
@Injectable()
export class FolderPermissionsService {
  constructor(
    @InjectRepository(ProjectFolder)
    private readonly folderRepository: Repository<ProjectFolder>,
  ) {}

  /**
   * Get effective permissions for a folder
   *
   * Calculates the complete set of permissions including:
   * - Explicit permissions set on the folder
   * - Inherited permissions from parent folders (if inheritPermissions is true)
   *
   * @param folder - Folder entity with permissions loaded
   * @returns Combined array of effective permission rules
   */
  async getEffectivePermissions(
    folder: ProjectFolder,
  ): Promise<PermissionRule[]> {
    const effectivePermissions: PermissionRule[] = [...folder.permissions];

    // If folder inherits permissions, collect from parents
    if (folder.inheritPermissions && folder.parentId) {
      const parentPermissions = await this.getParentPermissions(
        folder.parentId,
      );

      // Merge parent permissions that should be inherited
      for (const parentPerm of parentPermissions) {
        if (parentPerm.inheritToChildren) {
          // Check if we already have a permission for this user/role
          const existingIndex = effectivePermissions.findIndex(
            (p) =>
              (p.userId && p.userId === parentPerm.userId) ||
              (p.roleId && p.roleId === parentPerm.roleId),
          );

          if (existingIndex === -1) {
            // Add inherited permission
            effectivePermissions.push(parentPerm);
          } else {
            // Use higher access level between explicit and inherited
            const existing = effectivePermissions[existingIndex];
            if (
              ACCESS_HIERARCHY[parentPerm.access] >
              ACCESS_HIERARCHY[existing.access]
            ) {
              effectivePermissions[existingIndex] = parentPerm;
            }
          }
        }
      }
    }

    return effectivePermissions;
  }

  /**
   * Get all permissions from parent folders recursively
   *
   * @param parentId - Parent folder ID
   * @returns Array of permission rules from ancestors
   */
  private async getParentPermissions(
    parentId: string,
  ): Promise<PermissionRule[]> {
    const parent = await this.folderRepository.findOne({
      where: { id: parentId },
    });

    if (!parent) {
      return [];
    }

    let permissions: PermissionRule[] = [...parent.permissions];

    // Recursively get parent's permissions if it inherits
    if (parent.inheritPermissions && parent.parentId) {
      const ancestorPermissions = await this.getParentPermissions(
        parent.parentId,
      );
      permissions = [...ancestorPermissions, ...permissions];
    }

    return permissions;
  }

  /**
   * Check if a user has required access to a folder
   *
   * Evaluates user's access level based on:
   * - Public folder status
   * - Explicit permissions
   * - Inherited permissions
   * - User roles
   *
   * @param folder - Folder entity
   * @param user - User object with id and roleIds
   * @param requiredLevel - Minimum required access level
   * @throws ForbiddenException if user doesn't have required access
   */
  async checkFolderAccess(
    folder: ProjectFolder,
    user: { id: string; roleIds?: string[] },
    requiredLevel: AccessLevel,
  ): Promise<void> {
    // Public folders with READ_ONLY requirement are accessible to all
    if (folder.isPublic && requiredLevel === AccessLevel.READ_ONLY) {
      return;
    }

    // Get effective permissions
    const effectivePermissions = await this.getEffectivePermissions(folder);

    // Check user-specific permissions
    const userPermission = effectivePermissions.find(
      (p) => p.userId === user.id,
    );
    if (userPermission && this.hasAccess(userPermission.access, requiredLevel)) {
      return;
    }

    // Check role-based permissions
    if (user.roleIds && user.roleIds.length > 0) {
      for (const roleId of user.roleIds) {
        const rolePermission = effectivePermissions.find(
          (p) => p.roleId === roleId,
        );
        if (
          rolePermission &&
          this.hasAccess(rolePermission.access, requiredLevel)
        ) {
          return;
        }
      }
    }

    throw new ForbiddenException(
      'You do not have sufficient permissions to access this folder',
    );
  }

  /**
   * Update folder permissions
   *
   * Updates a folder's permission rules and inheritance settings.
   *
   * @param folderId - Folder ID
   * @param permissions - New permission rules
   * @param inheritPermissions - Whether to inherit from parent
   * @returns Updated folder entity
   */
  async updatePermissions(
    folderId: string,
    permissions: PermissionRule[],
    inheritPermissions: boolean = true,
  ): Promise<ProjectFolder> {
    const folder = await this.folderRepository.findOne({
      where: { id: folderId },
    });

    if (!folder) {
      throw new Error('Folder not found');
    }

    folder.permissions = permissions;
    folder.inheritPermissions = inheritPermissions;

    return await this.folderRepository.save(folder);
  }

  /**
   * Apply permissions to all child folders recursively
   *
   * Propagates permissions down the folder hierarchy.
   * Used when permissions are updated and should affect all descendants.
   *
   * @param folderId - Parent folder ID
   * @param permissions - Permission rules to apply
   */
  async applyPermissionsToChildren(
    folderId: string,
    permissions: PermissionRule[],
  ): Promise<void> {
    const children = await this.folderRepository.find({
      where: { parentId: folderId },
    });

    for (const child of children) {
      // Update child's permissions
      child.permissions = permissions;
      await this.folderRepository.save(child);

      // Recursively apply to descendants
      await this.applyPermissionsToChildren(child.id, permissions);
    }
  }

  /**
   * Compare access levels
   *
   * Determines if a user's access level meets or exceeds the required level.
   *
   * @param userAccess - User's current access level
   * @param requiredLevel - Required access level
   * @returns true if user has sufficient access
   */
  hasAccess(userAccess: AccessLevel, requiredLevel: AccessLevel): boolean {
    return ACCESS_HIERARCHY[userAccess] >= ACCESS_HIERARCHY[requiredLevel];
  }

  /**
   * Get user's access level for a folder
   *
   * Returns the highest access level granted to a user through
   * either direct or role-based permissions.
   *
   * @param folder - Folder entity
   * @param user - User object with id and roleIds
   * @returns User's access level (NO_ACCESS if none found)
   */
  async getUserAccessLevel(
    folder: ProjectFolder,
    user: { id: string; roleIds?: string[] },
  ): Promise<AccessLevel> {
    // Public folders grant READ_ONLY to everyone
    if (folder.isPublic) {
      return AccessLevel.READ_ONLY;
    }

    const effectivePermissions = await this.getEffectivePermissions(folder);
    let highestAccess = AccessLevel.NO_ACCESS;

    // Check user-specific permissions
    const userPermission = effectivePermissions.find(
      (p) => p.userId === user.id,
    );
    if (userPermission) {
      highestAccess = userPermission.access;
    }

    // Check role-based permissions
    if (user.roleIds && user.roleIds.length > 0) {
      for (const roleId of user.roleIds) {
        const rolePermission = effectivePermissions.find(
          (p) => p.roleId === roleId,
        );
        if (
          rolePermission &&
          ACCESS_HIERARCHY[rolePermission.access] >
            ACCESS_HIERARCHY[highestAccess]
        ) {
          highestAccess = rolePermission.access;
        }
      }
    }

    return highestAccess;
  }
}
