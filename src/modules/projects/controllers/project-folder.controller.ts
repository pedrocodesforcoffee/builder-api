import {
  Controller,
  Get,
  Post,
  Put,
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
} from '@nestjs/common';
import { Request } from 'express';
import { ProjectFolderService } from '../services/project-folder.service';
import { FolderOperationsService } from '../services/folder-operations.service';
import { FolderPermissionsService } from '../services/folder-permissions.service';
import { FolderStatisticsService } from '../services/folder-statistics.service';
import { FolderTemplateService } from '../services/folder-template.service';
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
@Controller('api')
@UseGuards(JwtAuthGuard)
export class ProjectFolderController {
  constructor(
    private readonly projectFolderService: ProjectFolderService,
    private readonly folderOperationsService: FolderOperationsService,
    private readonly folderPermissionsService: FolderPermissionsService,
    private readonly folderStatisticsService: FolderStatisticsService,
    private readonly folderTemplateService: FolderTemplateService,
  ) {}

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
  @Post('projects/:projectId/folders')
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
   * List folders in a project
   *
   * GET /api/projects/:projectId/folders
   *
   * Returns folders with optional filtering and hierarchy options.
   * Supports flat or hierarchical views.
   *
   * @param projectId - Project ID
   * @param parentId - Filter by parent folder (null for root folders)
   * @param folderType - Filter by folder type
   * @param includeChildren - Include child folders in results
   * @param flat - Return flat list instead of tree structure
   * @returns Array of folders or folder tree
   *
   * @example
   * Request:
   * ```
   * GET /api/projects/uuid/folders?parentId=null&folderType=DRAWINGS&includeChildren=true&flat=false
   * ```
   *
   * Success Response (200):
   * ```json
   * [
   *   {
   *     "id": "uuid",
   *     "name": "Structural Drawings",
   *     "folderType": "DRAWINGS",
   *     "path": "/Structural Drawings",
   *     "childCount": 3
   *   }
   * ]
   * ```
   */
  @Get('projects/:projectId/folders')
  @HttpCode(HttpStatus.OK)
  async listFolders(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('parentId') parentId?: string,
    @Query(
      'folderType',
      new DefaultValuePipe(undefined),
      new ParseEnumPipe(FolderType, { optional: true }),
    )
    folderType?: FolderType,
    @Query('includeChildren', new DefaultValuePipe(false), ParseBoolPipe)
    includeChildren?: boolean,
    @Query('flat', new DefaultValuePipe(true), ParseBoolPipe)
    flat?: boolean,
  ): Promise<ProjectFolder[]> {
    return this.projectFolderService.findAll(projectId, {
      parentId: parentId === 'null' ? null : parentId,
      folderType,
      includeChildren,
      flat,
    });
  }

  /**
   * Get folder tree
   *
   * GET /api/projects/:projectId/folders/tree
   *
   * Returns complete folder hierarchy as a tree structure.
   * Useful for displaying folder navigation.
   *
   * @param projectId - Project ID
   * @returns Hierarchical folder tree
   *
   * @example
   * Request:
   * ```
   * GET /api/projects/uuid/folders/tree
   * ```
   *
   * Success Response (200):
   * ```json
   * [
   *   {
   *     "id": "uuid",
   *     "name": "Drawings",
   *     "children": [
   *       {
   *         "id": "uuid2",
   *         "name": "Structural",
   *         "children": []
   *       }
   *     ]
   *   }
   * ]
   * ```
   */
  @Get('projects/:projectId/folders/tree')
  @HttpCode(HttpStatus.OK)
  async getFolderTree(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<any> {
    return this.projectFolderService.getFolderTree(projectId);
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
  @Post('projects/:projectId/folders/from-template')
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
  @Get('projects/:projectId/folders/search')
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
