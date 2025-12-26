import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ParseBoolPipe,
  ParseEnumPipe,
  DefaultValuePipe,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { ProjectFolderService } from '../services/project-folder.service';
import { FolderOperationsService } from '../services/folder-operations.service';
import { FolderPermissionsService } from '../services/folder-permissions.service';
import { FolderStatisticsService } from '../services/folder-statistics.service';
import { FolderTemplateService } from '../services/folder-template.service';
import { DocumentService } from '../../documents/services/document.service';
import { CreateFolderDto } from '../dto/folders/create-folder.dto';
import { UpdateFolderDto } from '../dto/folders/update-folder.dto';
import { MoveFolderDto } from '../dto/folders/move-folder.dto';
import { CopyFolderDto } from '../dto/folders/copy-folder.dto';
import { FolderPermissionsDto } from '../dto/folders/folder-permissions.dto';
import { ApplyTemplateDto } from '../dto/folders/apply-template.dto';
import { FolderType } from '../enums/folder-type.enum';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProjectFolder } from '../entities/project-folder.entity';

/**
 * Bulk Move DTO
 * Data transfer object for moving multiple folders at once
 */
class BulkMoveFolderDto {
  folderIds!: string[];
  newParentId!: string | null;
}

/**
 * Project Folder Controller
 *
 * Handles all folder-related HTTP endpoints including:
 * - CRUD operations for folders
 * - Folder hierarchy and tree navigation
 * - Folder operations (move, copy, duplicate)
 * - Bulk operations
 * - Permissions management
 * - Template application
 * - Statistics and search
 * - Breadcrumb navigation
 *
 * All endpoints require JWT authentication.
 */
@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectFolderController {
  constructor(
    private readonly projectFolderService: ProjectFolderService,
    private readonly folderOperationsService: FolderOperationsService,
    private readonly folderPermissionsService: FolderPermissionsService,
    private readonly folderStatisticsService: FolderStatisticsService,
    private readonly folderTemplateService: FolderTemplateService,
    private readonly documentService: DocumentService,
  ) {}

  /**
   * Get folders (Document Management System consistency)
   *
   * GET /api/projects/:projectId/documents/folders
   *
   * Returns folders for the sidebar navigation tree.
   * This endpoint provides consistency with the Document Management System API pattern.
   *
   * @param projectId - Project ID
   * @param parentId - Optional parent folder ID to filter by
   * @returns Array of folders
   */
  @Get(':projectId/documents/folders')
  @HttpCode(HttpStatus.OK)
  async getFoldersForDMS(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('parentId') parentId?: string,
  ): Promise<ProjectFolder[]> {
    console.log('[getFoldersForDMS] projectId:', projectId, 'parentId:', parentId);
    const folders = await this.projectFolderService.findAll(projectId, {
      parentId: parentId || undefined,
      flat: true,
    });
    console.log('[getFoldersForDMS] found folders:', folders.length);
    console.log('[getFoldersForDMS] folder details:', folders.map(f => ({
      id: f.id,
      name: f.name,
      parentId: f.parentId,
    })));
    return folders;
  }

  /**
   * Create a new folder
   *
   * POST /api/projects/:projectId/folders
   *
   * Creates a new folder within a project with optional parent folder.
   * Validates name uniqueness and handles permissions.
   *
   * @param projectId - Project ID
   * @param createDto - Folder creation data
   * @param req - Request with authenticated user
   * @returns Created folder entity
   *
   * @example
   * Request:
   * ```json
   * {
   *   "name": "Structural Drawings",
   *   "description": "All structural engineering drawings",
   *   "parentId": "uuid",
   *   "folderType": "DRAWINGS",
   *   "color": "#3B82F6",
   *   "icon": "folder-drawing"
   * }
   * ```
   *
   * Success Response (201):
   * ```json
   * {
   *   "id": "uuid",
   *   "projectId": "uuid",
   *   "name": "Structural Drawings",
   *   "folderType": "DRAWINGS",
   *   "path": "/Structural Drawings",
   *   "createdAt": "2024-01-01T00:00:00.000Z"
   * }
   * ```
   */
  @Post(':projectId/folders')
  @HttpCode(HttpStatus.CREATED)
  async createFolder(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() createDto: CreateFolderDto,
    @Req() req: Request,
  ): Promise<ProjectFolder> {
    const userId = (req as any).user.sub || (req as any).user.id;
    return this.projectFolderService.create(projectId, createDto, userId);
  }

  /**
   * Create a new folder (Document Management System consistency)
   *
   * POST /api/projects/:projectId/documents/folders
   *
   * Creates a new folder within a project with optional parent folder.
   * This endpoint provides consistency with the Document Management System API pattern.
   *
   * @param projectId - Project ID
   * @param createDto - Folder creation data
   * @param req - Request with authenticated user
   * @returns Created folder entity
   */
  @Post(':projectId/documents/folders')
  @HttpCode(HttpStatus.CREATED)
  async createFolderForDMS(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() createDto: CreateFolderDto,
    @Req() req: Request,
  ): Promise<ProjectFolder> {
    const userId = (req as any).user.sub || (req as any).user.id;
    return this.projectFolderService.create(projectId, createDto, userId);
  }

  /**
   * Get folder tree structure
   *
   * GET /api/projects/:projectId/folders
   *
   * Returns the complete folder hierarchy as a tree structure.
   * This is the primary endpoint for loading the folder navigation.
   *
   * @param projectId - Project ID
   * @returns Folder tree structure
   *
   * @example
   * Request:
   * ```
   * GET /api/projects/uuid/folders
   * ```
   *
   * Success Response (200):
   * ```json
   * {
   *   "folders": [
   *     {
   *       "id": "uuid",
   *       "name": "Drawings",
   *       "children": [
   *         {
   *           "id": "uuid2",
   *           "name": "Structural",
   *           "children": []
   *         }
   *       ]
   *     }
   *   ]
   * }
   * ```
   */
  @Get(':projectId/folders')
  @HttpCode(HttpStatus.OK)
  async getFolderStructure(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<{ folders: any[] }> {
    const folders = await this.projectFolderService.getFolderTree(projectId);
    return { folders };
  }

  /**
   * Get root folder contents
   *
   * GET /api/projects/:projectId/files
   *
   * Returns all folders and files in the root directory (no parent folder).
   * Used for displaying the main files view.
   *
   * @param projectId - Project ID
   * @param sortBy - Sort field (name, size, updatedAt)
   * @param sortOrder - Sort direction (asc, desc)
   * @returns Root folder contents with items
   *
   * @example
   * Request:
   * ```
   * GET /api/projects/uuid/files?sortBy=name&sortOrder=asc
   * ```
   *
   * Success Response (200):
   * ```json
   * {
   *   "folder": {
   *     "name": "Files",
   *     "breadcrumbs": []
   *   },
   *   "items": [
   *     {
   *       "id": "uuid",
   *       "name": "Drawings",
   *       "type": "folder",
   *       "size": 0,
   *       "createdAt": "2024-01-01T00:00:00.000Z",
   *       "updatedAt": "2024-01-01T00:00:00.000Z"
   *     },
   *     {
   *       "id": "uuid2",
   *       "name": "document.pdf",
   *       "type": "file",
   *       "size": 1048576,
   *       "mimeType": "application/pdf",
   *       "createdAt": "2024-01-01T00:00:00.000Z",
   *       "updatedAt": "2024-01-01T00:00:00.000Z"
   *     }
   *   ]
   * }
   * ```
   */
  @Get(':projectId/files')
  @HttpCode(HttpStatus.OK)
  async getRootContents(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Req() req: Request,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('search') search?: string,
  ): Promise<any> {
    // Get root folders
    const folders = await this.projectFolderService.findAll(projectId, {
      parentId: null,
      flat: true,
    });

    // Get root-level documents from Document Management System
    const documents = await this.documentService.getProjectDocuments(
      projectId,
      {
        sortBy: sortBy || 'name',
        sortOrder: sortOrder || 'asc',
        limit: 1000, // Large limit for now
        offset: 0,
        folderId: null, // Root level documents
      }
    );

    // Format folder and document items
    let items: any[] = [
      ...folders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        type: 'folder' as const,
        size: 0,
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
        folderType: folder.folderType,
        description: folder.description,
        color: folder.color,
        icon: folder.icon,
      })),
      ...documents.map((doc) => ({
        id: doc.id,
        name: doc.name,
        type: 'file' as const,
        size: doc.currentVersion?.fileSize || 0,
        mimeType: doc.currentVersion?.mimeType || 'application/octet-stream',
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      })),
    ];

    // Apply search filter if provided
    if (search && search.trim()) {
      const searchLower = search.trim().toLowerCase();
      items = items.filter(item =>
        item.name.toLowerCase().includes(searchLower)
      );
    }

    // Sort items
    if (sortBy) {
      items.sort((a, b) => {
        const aVal = a[sortBy as keyof typeof a];
        const bVal = b[sortBy as keyof typeof b];
        const order = sortOrder === 'desc' ? -1 : 1;

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return aVal.localeCompare(bVal) * order;
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return (aVal - bVal) * order;
        }
        if (aVal instanceof Date && bVal instanceof Date) {
          return (aVal.getTime() - bVal.getTime()) * order;
        }
        return 0;
      });
    }

    return {
      folder: {
        id: null,
        name: 'Documents',
        description: null,
        breadcrumbs: [],
      },
      items,
    };
  }

  /**
   * Bulk operations on files and folders
   *
   * POST /api/projects/:projectId/files/bulk
   *
   * Handles bulk operations like move and delete on multiple files and folders.
   *
   * @param projectId - Project ID
   * @param body - Bulk operation data
   * @returns Success message
   */
  @Post(':projectId/files/bulk')
  @HttpCode(HttpStatus.OK)
  async bulkOperations(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() body: { action: string; items: Array<{ type: string; id: string }>; destinationFolderId?: string; permanent?: boolean },
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const { action, items, destinationFolderId } = body;
    const userId = (req as any).user?.sub || (req as any).user?.id;

    console.log('[BulkOperations] Received request:', {
      action,
      itemCount: items.length,
      items,
      destinationFolderId
    });

    if (action === 'move') {
      // Handle bulk move - folders only
      // Note: File operations should use Document Management System
      for (const item of items) {
        console.log('[BulkOperations] Moving item:', { type: item.type, id: item.id, destinationFolderId });
        if (item.type === 'folder') {
          await this.folderOperationsService.moveFolder(
            item.id,
            destinationFolderId || null,
            userId
          );
        } else if (item.type === 'file') {
          throw new BadRequestException('File operations should use Document Management System endpoints');
        }
      }
      console.log('[BulkOperations] Move completed successfully');
      return { message: 'Items moved successfully' };
    } else if (action === 'delete') {
      // Handle bulk delete (soft delete) - folders only
      // Note: File operations should use Document Management System
      for (const item of items) {
        if (item.type === 'folder') {
          await this.projectFolderService.remove(item.id);
        } else if (item.type === 'file') {
          throw new BadRequestException('File operations should use Document Management System endpoints');
        }
      }
      return { message: 'Items deleted successfully' };
    } else {
      throw new BadRequestException(`Unknown action: ${action}`);
    }
  }

  /**
   * Get folder contents
   *
   * GET /api/projects/:projectId/folders/:folderId
   *
   * Returns all folders and files inside a specific folder.
   *
   * @param projectId - Project ID
   * @param folderId - Folder ID
   * @param sortBy - Sort field (name, size, updatedAt)
   * @param sortOrder - Sort direction (asc, desc)
   * @returns Folder contents with items and breadcrumb navigation
   *
   * @example
   * Request:
   * ```
   * GET /api/projects/uuid/folders/folder-uuid?sortBy=name&sortOrder=asc
   * ```
   *
   * Success Response (200):
   * ```json
   * {
   *   "folder": {
   *     "id": "folder-uuid",
   *     "name": "Drawings",
   *     "breadcrumbs": [
   *       { "id": "parent-uuid", "name": "Documents" },
   *       { "id": "folder-uuid", "name": "Drawings" }
   *     ]
   *   },
   *   "items": [
   *     {
   *       "id": "uuid",
   *       "name": "Structural",
   *       "type": "folder",
   *       "size": 0
   *     },
   *     {
   *       "id": "uuid2",
   *       "name": "floor-plan.pdf",
   *       "type": "file",
   *       "size": 2048576
   *     }
   *   ]
   * }
   * ```
   */
  @Get(':projectId/folders/:folderId')
  @HttpCode(HttpStatus.OK)
  async getFolderContents(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Req() req: Request,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('search') search?: string,
  ): Promise<any> {
    // Get the current folder
    const currentFolder = await this.projectFolderService.findOne(folderId);

    // Get breadcrumb path
    const breadcrumbs = await this.projectFolderService.getBreadcrumb(folderId);

    // Get child folders
    const folders = await this.projectFolderService.findAll(projectId, {
      parentId: folderId,
      flat: true,
    });

    // Get documents in this folder from Document Management System
    const documents = await this.documentService.getProjectDocuments(
      projectId,
      {
        sortBy: sortBy || 'name',
        sortOrder: sortOrder || 'asc',
        limit: 1000, // Large limit for now
        offset: 0,
        folderId: folderId,
      }
    );

    // Format folder items
    let items: any[] = [
      ...folders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        type: 'folder' as const,
        size: 0,
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
        folderType: folder.folderType,
        description: folder.description,
        color: folder.color,
        icon: folder.icon,
      })),
      ...documents.map((doc) => ({
        id: doc.id,
        name: doc.name,
        type: 'file' as const,
        size: doc.currentVersion?.fileSize || 0,
        mimeType: doc.currentVersion?.mimeType || 'application/octet-stream',
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      })),
    ];

    // Apply search filter if provided
    if (search && search.trim()) {
      const searchLower = search.trim().toLowerCase();
      items = items.filter(item =>
        item.name.toLowerCase().includes(searchLower)
      );
    }

    // Sort items
    if (sortBy) {
      items.sort((a, b) => {
        const aVal = a[sortBy as keyof typeof a];
        const bVal = b[sortBy as keyof typeof b];
        const order = sortOrder === 'desc' ? -1 : 1;

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return aVal.localeCompare(bVal) * order;
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return (aVal - bVal) * order;
        }
        if (aVal instanceof Date && bVal instanceof Date) {
          return (aVal.getTime() - bVal.getTime()) * order;
        }
        return 0;
      });
    }

    return {
      folder: {
        id: currentFolder.id,
        name: currentFolder.name,
        description: currentFolder.description,
        breadcrumbs: breadcrumbs.map((f) => ({
          id: f.id,
          name: f.name,
        })),
      },
      items,
    };
  }

  /**
   * Get single folder
   *
   * GET /api/folders/:id
   *
   * Returns detailed information about a specific folder.
   *
   * @param id - Folder ID
   * @returns Folder entity
   *
   * @example
   * Request:
   * ```
   * GET /api/folders/uuid
   * ```
   *
   * Success Response (200):
   * ```json
   * {
   *   "id": "uuid",
   *   "projectId": "uuid",
   *   "name": "Structural Drawings",
   *   "description": "All structural engineering drawings",
   *   "folderType": "DRAWINGS",
   *   "path": "/Structural Drawings",
   *   "createdAt": "2024-01-01T00:00:00.000Z"
   * }
   * ```
   */
  @Get('folders/:id')
  @HttpCode(HttpStatus.OK)
  async getFolder(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProjectFolder> {
    return this.projectFolderService.findOne(id);
  }

  /**
   * Update folder
   *
   * PUT /api/folders/:id
   *
   * Updates folder information.
   * Cannot update parentId (use move endpoint instead).
   *
   * @param id - Folder ID
   * @param updateDto - Update data
   * @returns Updated folder entity
   *
   * @example
   * Request:
   * ```json
   * {
   *   "name": "Structural Drawings - Updated",
   *   "description": "Updated description",
   *   "color": "#FF5733"
   * }
   * ```
   *
   * Success Response (200):
   * ```json
   * {
   *   "id": "uuid",
   *   "name": "Structural Drawings - Updated",
   *   "updatedAt": "2024-01-02T00:00:00.000Z"
   * }
   * ```
   */
  @Put('folders/:id')
  @HttpCode(HttpStatus.OK)
  async updateFolder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateFolderDto,
    @Req() req: Request,
  ): Promise<ProjectFolder> {
    const userId = (req as any).user.sub || (req as any).user.id;
    return this.projectFolderService.update(id, updateDto, userId);
  }

  /**
   * Update folder (PATCH - for Document Management System consistency)
   *
   * PATCH /api/projects/:projectId/documents/folders/:id
   *
   * Updates folder information, primarily for moving folders via parentId.
   * This endpoint provides consistency with the Document Management System API pattern.
   *
   * @param projectId - Project ID
   * @param id - Folder ID
   * @param updateDto - Update data (supports parentId for moves)
   * @returns Updated folder entity
   */
  @Patch(':projectId/documents/folders/:id')
  @HttpCode(HttpStatus.OK)
  async patchFolder(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: { parentId?: string | null; name?: string },
    @Req() req: Request,
  ): Promise<ProjectFolder> {
    const userId = (req as any).user.sub || (req as any).user.id;

    // Handle move operation if parentId is provided
    if (updateDto.parentId !== undefined) {
      return this.folderOperationsService.moveFolder(
        id,
        updateDto.parentId,
        userId,
      );
    }

    // Handle name update
    if (updateDto.name) {
      return this.projectFolderService.update(id, { name: updateDto.name }, userId);
    }

    // If no updates, just return the folder
    return this.projectFolderService.findOne(id);
  }

  /**
   * Delete folder
   *
   * DELETE /api/folders/:id
   *
   * Soft-deletes a folder. Can be restored later.
   * Optionally deletes all child folders.
   *
   * @param id - Folder ID
   *
   * @example
   * Request:
   * ```
   * DELETE /api/folders/uuid
   * ```
   *
   * Success Response (204):
   * No content
   */
  @Delete('folders/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFolder(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.projectFolderService.remove(id);
  }

  /**
   * Delete folder (Document Management System consistency)
   *
   * DELETE /api/projects/:projectId/documents/folders/:id
   *
   * Soft-deletes a folder. Provides consistency with Document Management System API pattern.
   *
   * @param projectId - Project ID
   * @param id - Folder ID
   */
  @Delete(':projectId/documents/folders/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFolderAlt(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.projectFolderService.remove(id);
  }

  /**
   * Restore deleted folder
   *
   * POST /api/folders/:id/restore
   *
   * Restores a soft-deleted folder and optionally its children.
   *
   * @param id - Folder ID
   * @returns Restored folder entity
   *
   * @example
   * Request:
   * ```
   * POST /api/folders/uuid/restore
   * ```
   *
   * Success Response (200):
   * ```json
   * {
   *   "id": "uuid",
   *   "name": "Restored Folder",
   *   "deletedAt": null
   * }
   * ```
   */
  @Post('folders/:id/restore')
  @HttpCode(HttpStatus.OK)
  async restoreFolder(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProjectFolder> {
    return this.projectFolderService.restore(id);
  }

  /**
   * Move folder
   *
   * POST /api/folders/:id/move
   *
   * Moves a folder to a new parent location.
   * Updates paths for all descendants.
   *
   * @param id - Folder ID to move
   * @param moveDto - Move operation data
   * @param req - Request with authenticated user
   * @returns Updated folder entity
   *
   * @example
   * Request:
   * ```json
   * {
   *   "newParentId": "uuid"
   * }
   * ```
   *
   * Success Response (200):
   * ```json
   * {
   *   "id": "uuid",
   *   "parentId": "new-parent-uuid",
   *   "path": "/New Parent/Folder Name",
   *   "updatedAt": "2024-01-02T00:00:00.000Z"
   * }
   * ```
   */
  @Post('folders/:id/move')
  @HttpCode(HttpStatus.OK)
  async moveFolder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() moveDto: MoveFolderDto,
    @Req() req: Request,
  ): Promise<ProjectFolder> {
    const userId = (req as any).user.sub || (req as any).user.id;
    return this.folderOperationsService.moveFolder(
      id,
      moveDto.newParentId,
      userId,
    );
  }

  /**
   * Copy folder
   *
   * POST /api/folders/:id/copy
   *
   * Copies a folder (and optionally its contents) to another location or project.
   *
   * @param id - Folder ID to copy
   * @param copyDto - Copy operation data
   * @param req - Request with authenticated user
   * @returns Created copy of the folder
   *
   * @example
   * Request:
   * ```json
   * {
   *   "targetProjectId": "uuid",
   *   "targetParentId": "uuid",
   *   "copyFiles": true
   * }
   * ```
   *
   * Success Response (200):
   * ```json
   * {
   *   "id": "new-uuid",
   *   "projectId": "target-project-uuid",
   *   "name": "Folder Name (Copy)",
   *   "createdAt": "2024-01-02T00:00:00.000Z"
   * }
   * ```
   */
  @Post('folders/:id/copy')
  @HttpCode(HttpStatus.OK)
  async copyFolder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() copyDto: CopyFolderDto,
    @Req() req: Request,
  ): Promise<ProjectFolder> {
    const userId = (req as any).user.sub || (req as any).user.id;
    return this.folderOperationsService.copyFolder(
      id,
      copyDto.targetProjectId,
      copyDto.targetParentId || null,
      copyDto.copyFiles || false,
      userId,
    );
  }

  /**
   * Duplicate folder
   *
   * POST /api/folders/:id/duplicate
   *
   * Duplicates a folder within the same parent location.
   * Creates a copy with " (Copy)" appended to the name.
   *
   * @param id - Folder ID to duplicate
   * @param req - Request with authenticated user
   * @returns Duplicated folder entity
   *
   * @example
   * Request:
   * ```
   * POST /api/folders/uuid/duplicate
   * ```
   *
   * Success Response (200):
   * ```json
   * {
   *   "id": "new-uuid",
   *   "name": "Folder Name (Copy)",
   *   "parentId": "same-parent-uuid",
   *   "createdAt": "2024-01-02T00:00:00.000Z"
   * }
   * ```
   */
  @Post('folders/:id/duplicate')
  @HttpCode(HttpStatus.OK)
  async duplicateFolder(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ): Promise<ProjectFolder> {
    const userId = (req as any).user.sub || (req as any).user.id;
    return this.folderOperationsService.duplicateFolder(id, userId);
  }

  /**
   * Bulk move folders
   *
   * POST /api/folders/bulk-move
   *
   * Moves multiple folders to a new parent location in a single operation.
   *
   * @param bulkMoveDto - Bulk move data
   * @param req - Request with authenticated user
   * @returns Array of updated folders
   *
   * @example
   * Request:
   * ```json
   * {
   *   "folderIds": ["uuid1", "uuid2", "uuid3"],
   *   "newParentId": "target-parent-uuid"
   * }
   * ```
   *
   * Success Response (200):
   * ```json
   * [
   *   {
   *     "id": "uuid1",
   *     "parentId": "target-parent-uuid",
   *     "path": "/New Parent/Folder 1"
   *   },
   *   {
   *     "id": "uuid2",
   *     "parentId": "target-parent-uuid",
   *     "path": "/New Parent/Folder 2"
   *   }
   * ]
   * ```
   */
  @Post('folders/bulk-move')
  @HttpCode(HttpStatus.OK)
  async bulkMoveFolder(
    @Body() bulkMoveDto: BulkMoveFolderDto,
    @Req() req: Request,
  ): Promise<ProjectFolder[]> {
    const userId = (req as any).user.sub || (req as any).user.id;
    return this.folderOperationsService.bulkMove(
      bulkMoveDto.folderIds,
      bulkMoveDto.newParentId,
      userId,
    );
  }

  /**
   * Apply folder template
   *
   * POST /api/projects/:projectId/folders/from-template
   *
   * Creates a folder structure from a predefined or custom template.
   *
   * @param projectId - Project ID
   * @param applyTemplateDto - Template application data
   * @param req - Request with authenticated user
   * @returns Array of created folders
   *
   * @example
   * Request:
   * ```json
   * {
   *   "templateName": "Commercial Construction Standard"
   * }
   * ```
   *
   * Success Response (200):
   * ```json
   * [
   *   {
   *     "id": "uuid1",
   *     "name": "Drawings",
   *     "folderType": "DRAWINGS"
   *   },
   *   {
   *     "id": "uuid2",
   *     "name": "Specifications",
   *     "folderType": "DOCUMENTS"
   *   }
   * ]
   * ```
   */
  @Post(':projectId/folders/from-template')
  @HttpCode(HttpStatus.OK)
  async applyTemplate(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() applyTemplateDto: ApplyTemplateDto,
    @Req() req: Request,
  ): Promise<ProjectFolder[]> {
    const userId = (req as any).user.sub || (req as any).user.id;
    return this.folderTemplateService.applyTemplate(
      projectId,
      applyTemplateDto.templateName,
      userId,
    );
  }

  /**
   * Get folder permissions
   *
   * GET /api/folders/:id/permissions
   *
   * Returns effective permissions for a folder including inherited permissions.
   *
   * @param id - Folder ID
   * @returns Effective permissions for the folder
   *
   * @example
   * Request:
   * ```
   * GET /api/folders/uuid/permissions
   * ```
   *
   * Success Response (200):
   * ```json
   * {
   *   "folderId": "uuid",
   *   "inheritPermissions": true,
   *   "effectivePermissions": [
   *     {
   *       "userId": "uuid",
   *       "access": "READ_WRITE",
   *       "source": "parent"
   *     }
   *   ]
   * }
   * ```
   */
  @Get('folders/:id/permissions')
  @HttpCode(HttpStatus.OK)
  async getFolderPermissions(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<any> {
    const folder = await this.projectFolderService.findOne(id);
    return this.folderPermissionsService.getEffectivePermissions(folder);
  }

  /**
   * Update folder permissions
   *
   * PUT /api/folders/:id/permissions
   *
   * Updates folder permissions with option to apply to children.
   *
   * @param id - Folder ID
   * @param permissionsDto - Permissions update data
   * @returns Updated folder with new permissions
   *
   * @example
   * Request:
   * ```json
   * {
   *   "permissions": [
   *     {
   *       "userId": "uuid",
   *       "access": "READ_WRITE",
   *       "inheritToChildren": true
   *     }
   *   ],
   *   "inheritPermissions": false,
   *   "applyToChildren": true
   * }
   * ```
   *
   * Success Response (200):
   * ```json
   * {
   *   "id": "uuid",
   *   "inheritPermissions": false,
   *   "permissions": [...]
   * }
   * ```
   */
  @Put('folders/:id/permissions')
  @HttpCode(HttpStatus.OK)
  async updateFolderPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() permissionsDto: FolderPermissionsDto,
  ): Promise<ProjectFolder> {
    const folder = await this.folderPermissionsService.updatePermissions(
      id,
      permissionsDto.permissions,
      permissionsDto.inheritPermissions,
    );

    // Apply to children if requested
    if (permissionsDto.applyToChildren) {
      await this.folderPermissionsService.applyPermissionsToChildren(
        id,
        permissionsDto.permissions,
      );
    }

    return folder;
  }

  /**
   * Reset permissions to inherit
   *
   * POST /api/folders/:id/permissions/inherit
   *
   * Resets folder to inherit permissions from parent by clearing explicit permissions.
   *
   * @param id - Folder ID
   * @returns Updated folder with inheritance enabled
   *
   * @example
   * Request:
   * ```
   * POST /api/folders/uuid/permissions/inherit
   * ```
   *
   * Success Response (200):
   * ```json
   * {
   *   "id": "uuid",
   *   "inheritPermissions": true,
   *   "permissions": []
   * }
   * ```
   */
  @Post('folders/:id/permissions/inherit')
  @HttpCode(HttpStatus.OK)
  async resetToInherit(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProjectFolder> {
    return this.folderPermissionsService.updatePermissions(id, [], true);
  }

  /**
   * Get folder statistics
   *
   * GET /api/folders/:id/statistics
   *
   * Returns statistical information about a folder including file counts, sizes, etc.
   *
   * @param id - Folder ID
   * @returns Folder statistics
   *
   * @example
   * Request:
   * ```
   * GET /api/folders/uuid/statistics
   * ```
   *
   * Success Response (200):
   * ```json
   * {
   *   "folderId": "uuid",
   *   "fileCount": 25,
   *   "totalSize": 1048576,
   *   "subfolderCount": 3,
   *   "lastModified": "2024-01-02T00:00:00.000Z"
   * }
   * ```
   */
  @Get('folders/:id/statistics')
  @HttpCode(HttpStatus.OK)
  async getFolderStatistics(@Param('id', ParseUUIDPipe) id: string): Promise<any> {
    return this.folderStatisticsService.getFolderStatistics(id);
  }

  /**
   * Search folders
   *
   * GET /api/projects/:projectId/folders/search
   *
   * Searches folders by name, type, and tags within a project.
   *
   * @param projectId - Project ID
   * @param query - Search query string
   * @param folderType - Filter by folder type
   * @param tags - Filter by tags (comma-separated)
   * @returns Array of matching folders
   *
   * @example
   * Request:
   * ```
   * GET /api/projects/uuid/folders/search?query=structural&folderType=DRAWINGS&tags=important,client
   * ```
   *
   * Success Response (200):
   * ```json
   * [
   *   {
   *     "id": "uuid",
   *     "name": "Structural Drawings",
   *     "folderType": "DRAWINGS",
   *     "tags": ["important", "client"],
   *     "path": "/Drawings/Structural"
   *   }
   * ]
   * ```
   */
  @Get(':projectId/folders/search')
  @HttpCode(HttpStatus.OK)
  async searchFolders(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('query') query?: string,
    @Query(
      'folderType',
      new DefaultValuePipe(undefined),
      new ParseEnumPipe(FolderType, { optional: true }),
    )
    folderType?: FolderType,
    @Query('tags') tags?: string,
  ): Promise<ProjectFolder[]> {
    const tagArray = tags ? tags.split(',').map((t) => t.trim()) : undefined;
    return this.projectFolderService.searchFolders(projectId, query || '', {
      folderType,
      tags: tagArray,
    });
  }

  /**
   * Get folder breadcrumb
   *
   * GET /api/folders/:id/breadcrumb
   *
   * Returns the path from root to the specified folder for navigation.
   *
   * @param id - Folder ID
   * @returns Array of folders from root to current
   *
   * @example
   * Request:
   * ```
   * GET /api/folders/uuid/breadcrumb
   * ```
   *
   * Success Response (200):
   * ```json
   * [
   *   {
   *     "id": "uuid1",
   *     "name": "Drawings",
   *     "path": "/Drawings"
   *   },
   *   {
   *     "id": "uuid2",
   *     "name": "Structural",
   *     "path": "/Drawings/Structural"
   *   },
   *   {
   *     "id": "uuid3",
   *     "name": "Foundation",
   *     "path": "/Drawings/Structural/Foundation"
   *   }
   * ]
   * ```
   */
  @Get('folders/:id/breadcrumb')
  @HttpCode(HttpStatus.OK)
  async getFolderBreadcrumb(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProjectFolder[]> {
    return this.projectFolderService.getBreadcrumb(id);
  }
}
