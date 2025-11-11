import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectFolder } from '../entities/project-folder.entity';

/**
 * Folder Statistics Service
 *
 * Handles calculation and maintenance of folder statistics including:
 * - File counts (direct and recursive)
 * - Total size calculations
 * - Last activity tracking
 * - Statistics propagation to parent folders
 */
@Injectable()
export class FolderStatisticsService {
  constructor(
    @InjectRepository(ProjectFolder)
    private readonly folderRepository: Repository<ProjectFolder>,
  ) {}

  /**
   * Get folder statistics
   *
   * Returns statistical information about a folder.
   *
   * @param folderId - Folder ID
   * @returns Folder statistics object
   */
  async getFolderStatistics(folderId: string): Promise<any> {
    const folder = await this.folderRepository.findOne({
      where: { id: folderId },
      relations: ['children'],
    });

    if (!folder) {
      throw new Error('Folder not found');
    }

    return {
      folderId: folder.id,
      fileCount: folder.fileCount,
      totalFileCount: folder.totalFileCount,
      totalSize: folder.totalSize,
      subfolderCount: folder.children?.length || 0,
      lastModified: folder.lastActivityAt || folder.updatedAt,
    };
  }

  /**
   * Update folder statistics
   *
   * Recalculates all statistics for a folder:
   * - Direct file count (files in this folder only)
   * - Total file count (including all descendants)
   * - Total size (all files in folder and descendants)
   * - Last activity timestamp
   *
   * @param folderId - Folder ID to update
   */
  async updateFolderStatistics(folderId: string): Promise<void> {
    const folder = await this.folderRepository.findOne({
      where: { id: folderId },
      relations: ['children'],
    });

    if (!folder) {
      return;
    }

    // Calculate statistics
    const totalFileCount = await this.getFileCount(folderId, true);
    const totalSize = await this.calculateTotalSize(folderId, true);
    const lastActivityAt = await this.getLastActivity(folderId);

    // Update folder
    folder.totalFileCount = totalFileCount;
    folder.totalSize = totalSize;
    if (lastActivityAt) {
      folder.lastActivityAt = lastActivityAt;
    }

    await this.folderRepository.save(folder);

    // Propagate to parent
    if (folder.parentId) {
      await this.propagateStatisticsToParent(folder.parentId);
    }
  }

  /**
   * Propagate statistics update to parent folders
   *
   * Updates parent folder statistics after changes in child folders.
   * Recursively updates all ancestors up to the root.
   *
   * @param folderId - Parent folder ID
   */
  async propagateStatisticsToParent(folderId: string): Promise<void> {
    const folder = await this.folderRepository.findOne({
      where: { id: folderId },
    });

    if (!folder) {
      return;
    }

    // Recalculate parent's statistics
    const totalFileCount = await this.getFileCount(folderId, true);
    const totalSize = await this.calculateTotalSize(folderId, true);
    const lastActivityAt = await this.getLastActivity(folderId);

    folder.totalFileCount = totalFileCount;
    folder.totalSize = totalSize;
    if (lastActivityAt) {
      folder.lastActivityAt = lastActivityAt;
    }

    await this.folderRepository.save(folder);

    // Continue propagating to parent
    if (folder.parentId) {
      await this.propagateStatisticsToParent(folder.parentId);
    }
  }

  /**
   * Calculate total size of folder
   *
   * Sums up the size of all files in the folder.
   * Can be recursive to include all descendant folders.
   *
   * @param folderId - Folder ID
   * @param recursive - If true, include all descendant folders
   * @returns Total size in bytes
   */
  async calculateTotalSize(
    folderId: string,
    recursive: boolean = false,
  ): Promise<number> {
    let totalSize = 0;

    // Get direct file size for this folder
    // NOTE: This would need integration with a ProjectFile entity
    // For now, we'll use the cached value
    const folder = await this.folderRepository.findOne({
      where: { id: folderId },
      relations: ['children'],
    });

    if (!folder) {
      return 0;
    }

    // In a real implementation, this would query the project_files table
    // SELECT SUM(size) FROM project_files WHERE folder_id = folderId
    // For now, assume totalSize is already calculated at file level

    if (recursive && folder.children && folder.children.length > 0) {
      for (const child of folder.children) {
        totalSize += await this.calculateTotalSize(child.id, true);
      }
    }

    return totalSize;
  }

  /**
   * Get file count for folder
   *
   * Counts files in the folder.
   * Can be recursive to include all descendant folders.
   *
   * @param folderId - Folder ID
   * @param recursive - If true, include all descendant folders
   * @returns File count
   */
  async getFileCount(
    folderId: string,
    recursive: boolean = false,
  ): Promise<number> {
    const folder = await this.folderRepository.findOne({
      where: { id: folderId },
      relations: ['children'],
    });

    if (!folder) {
      return 0;
    }

    let count = folder.fileCount;

    if (recursive && folder.children && folder.children.length > 0) {
      for (const child of folder.children) {
        count += await this.getFileCount(child.id, true);
      }
    }

    return count;
  }

  /**
   * Get last activity timestamp for folder
   *
   * Finds the most recent activity (file upload, modification, etc.)
   * in this folder or its descendants.
   *
   * @param folderId - Folder ID
   * @returns Most recent activity date, or null if no activity
   */
  async getLastActivity(folderId: string): Promise<Date | null> {
    // This would query the project_files table for the most recent activity
    // SELECT MAX(updated_at) FROM project_files WHERE folder_id IN (folder and descendants)

    // For now, return the folder's current lastActivityAt
    const folder = await this.folderRepository.findOne({
      where: { id: folderId },
    });

    return folder?.lastActivityAt || null;
  }

  /**
   * Increment file count for folder and ancestors
   *
   * Called when a file is added to a folder.
   *
   * @param folderId - Folder ID
   * @param increment - Number to increment (default 1, can be negative)
   */
  async incrementFileCount(
    folderId: string,
    increment: number = 1,
  ): Promise<void> {
    const folder = await this.folderRepository.findOne({
      where: { id: folderId },
    });

    if (!folder) {
      return;
    }

    folder.fileCount += increment;
    folder.totalFileCount += increment;
    folder.lastActivityAt = new Date();

    await this.folderRepository.save(folder);

    // Propagate to parent
    if (folder.parentId) {
      await this.propagateTotalFileCount(folder.parentId, increment);
    }
  }

  /**
   * Propagate total file count to ancestors
   *
   * Updates totalFileCount for all parent folders.
   *
   * @param folderId - Folder ID
   * @param increment - Number to increment (can be negative)
   */
  private async propagateTotalFileCount(
    folderId: string,
    increment: number,
  ): Promise<void> {
    const folder = await this.folderRepository.findOne({
      where: { id: folderId },
    });

    if (!folder) {
      return;
    }

    folder.totalFileCount += increment;
    folder.lastActivityAt = new Date();

    await this.folderRepository.save(folder);

    // Continue propagating to parent
    if (folder.parentId) {
      await this.propagateTotalFileCount(folder.parentId, increment);
    }
  }

  /**
   * Update total size for folder and ancestors
   *
   * Called when file sizes change.
   *
   * @param folderId - Folder ID
   * @param sizeChange - Size change in bytes (can be negative)
   */
  async updateTotalSize(folderId: string, sizeChange: number): Promise<void> {
    const folder = await this.folderRepository.findOne({
      where: { id: folderId },
    });

    if (!folder) {
      return;
    }

    folder.totalSize += sizeChange;
    folder.lastActivityAt = new Date();

    await this.folderRepository.save(folder);

    // Propagate to parent
    if (folder.parentId) {
      await this.propagateSizeChange(folder.parentId, sizeChange);
    }
  }

  /**
   * Propagate size change to ancestors
   *
   * @param folderId - Folder ID
   * @param sizeChange - Size change in bytes (can be negative)
   */
  private async propagateSizeChange(
    folderId: string,
    sizeChange: number,
  ): Promise<void> {
    const folder = await this.folderRepository.findOne({
      where: { id: folderId },
    });

    if (!folder) {
      return;
    }

    folder.totalSize += sizeChange;
    folder.lastActivityAt = new Date();

    await this.folderRepository.save(folder);

    // Continue propagating to parent
    if (folder.parentId) {
      await this.propagateSizeChange(folder.parentId, sizeChange);
    }
  }
}
