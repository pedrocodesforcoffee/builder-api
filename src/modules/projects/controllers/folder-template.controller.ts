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
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { FolderTemplateService } from '../services/folder-template.service';
import { FolderTemplate } from '../entities/folder-template.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

/**
 * Create Template DTO
 * Data transfer object for creating custom folder templates
 */
class CreateTemplateDto {
  name!: string;
  description?: string;
  category?: string;
  organizationId?: string;
  folderStructure!: any[];
}

/**
 * Update Template DTO
 * Data transfer object for updating existing folder templates
 */
class UpdateTemplateDto {
  name?: string;
  description?: string;
  category?: string;
  folderStructure?: any[];
  isActive?: boolean;
}

/**
 * Folder Template Controller
 *
 * Handles folder template management endpoints including:
 * - Listing available templates (standard and custom)
 * - Getting template details
 * - Creating custom templates
 * - Updating custom templates
 * - Deleting custom templates (system templates cannot be deleted)
 *
 * Templates define reusable folder structures that can be applied to projects
 * to create standardized hierarchies for different project types.
 *
 * All endpoints require JWT authentication.
 */
@Controller('api/folder-templates')
@UseGuards(JwtAuthGuard)
export class FolderTemplateController {
  constructor(
    private readonly folderTemplateService: FolderTemplateService,
  ) {}

  /**
   * List available templates
   *
   * GET /api/folder-templates
   *
   * Returns all available folder templates including standard system templates
   * and organization-specific custom templates.
   *
   * @param organizationId - Optional filter by organization ID
   * @returns Array of folder templates
   *
   * @example
   * Request:
   * ```
   * GET /api/folder-templates?organizationId=uuid
   * ```
   *
   * Success Response (200):
   * ```json
   * [
   *   {
   *     "id": "uuid",
   *     "name": "Commercial Construction Standard",
   *     "description": "Standard folder structure for commercial projects",
   *     "category": "STANDARD",
   *     "isSystem": true,
   *     "isActive": true,
   *     "folderStructure": [...]
   *   },
   *   {
   *     "id": "uuid2",
   *     "name": "Custom Template",
   *     "description": "Organization-specific template",
   *     "category": "CUSTOM",
   *     "isSystem": false,
   *     "organizationId": "uuid",
   *     "isActive": true,
   *     "folderStructure": [...]
   *   }
   * ]
   * ```
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async listTemplates(
    @Query('organizationId') organizationId?: string,
  ): Promise<FolderTemplate[]> {
    return this.folderTemplateService.getTemplates(organizationId);
  }

  /**
   * Get single template
   *
   * GET /api/folder-templates/:id
   *
   * Returns detailed information about a specific template including
   * its complete folder structure definition.
   *
   * @param id - Template ID
   * @returns Template entity with full structure
   *
   * @example
   * Request:
   * ```
   * GET /api/folder-templates/uuid
   * ```
   *
   * Success Response (200):
   * ```json
   * {
   *   "id": "uuid",
   *   "name": "Commercial Construction Standard",
   *   "description": "Standard folder structure for commercial construction projects",
   *   "category": "STANDARD",
   *   "isSystem": true,
   *   "isActive": true,
   *   "folderStructure": [
   *     {
   *       "name": "Drawings",
   *       "folderType": "DRAWINGS",
   *       "description": "All project drawings",
   *       "children": [
   *         {
   *           "name": "Architectural",
   *           "folderType": "DRAWINGS",
   *           "children": []
   *         },
   *         {
   *           "name": "Structural",
   *           "folderType": "DRAWINGS",
   *           "children": []
   *         }
   *       ]
   *     },
   *     {
   *       "name": "Specifications",
   *       "folderType": "DOCUMENTS",
   *       "children": []
   *     }
   *   ],
   *   "createdAt": "2024-01-01T00:00:00.000Z",
   *   "updatedAt": "2024-01-01T00:00:00.000Z"
   * }
   * ```
   *
   * Error Response (404):
   * ```json
   * {
   *   "statusCode": 404,
   *   "message": "Template not found",
   *   "error": "Not Found"
   * }
   * ```
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getTemplate(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FolderTemplate> {
    return this.folderTemplateService.findOne(id);
  }

  /**
   * Create custom template
   *
   * POST /api/folder-templates
   *
   * Creates a new custom folder template for an organization.
   * Custom templates can be used alongside system templates.
   *
   * @param createDto - Template creation data
   * @param req - Request with authenticated user
   * @returns Created template entity
   *
   * @example
   * Request:
   * ```json
   * {
   *   "name": "Residential Construction",
   *   "description": "Custom template for residential projects",
   *   "category": "RESIDENTIAL",
   *   "organizationId": "uuid",
   *   "folderStructure": [
   *     {
   *       "name": "Plans",
   *       "folderType": "DRAWINGS",
   *       "description": "Floor plans and elevations",
   *       "children": [
   *         {
   *           "name": "Floor Plans",
   *           "folderType": "DRAWINGS",
   *           "children": []
   *         },
   *         {
   *           "name": "Elevations",
   *           "folderType": "DRAWINGS",
   *           "children": []
   *         }
   *       ]
   *     },
   *     {
   *       "name": "Permits",
   *       "folderType": "DOCUMENTS",
   *       "children": []
   *     }
   *   ]
   * }
   * ```
   *
   * Success Response (201):
   * ```json
   * {
   *   "id": "uuid",
   *   "name": "Residential Construction",
   *   "description": "Custom template for residential projects",
   *   "category": "RESIDENTIAL",
   *   "organizationId": "uuid",
   *   "isSystem": false,
   *   "isActive": true,
   *   "folderStructure": [...],
   *   "createdAt": "2024-01-02T00:00:00.000Z"
   * }
   * ```
   *
   * Error Response (400):
   * ```json
   * {
   *   "statusCode": 400,
   *   "message": "Template with this name already exists",
   *   "error": "Bad Request"
   * }
   * ```
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTemplate(
    @Body() createDto: CreateTemplateDto,
    @Req() req: Request,
  ): Promise<FolderTemplate> {
    const userId = (req as any).user.sub || (req as any).user.id;
    return this.folderTemplateService.createTemplate(
      {
        name: createDto.name,
        description: createDto.description,
        projectType: createDto.category,
        folderStructure: createDto.folderStructure,
        organizationId: createDto.organizationId,
      },
      userId,
    );
  }

  /**
   * Update template
   *
   * PUT /api/folder-templates/:id
   *
   * Updates an existing custom template.
   * System templates cannot be modified.
   *
   * @param id - Template ID
   * @param updateDto - Update data
   * @returns Updated template entity
   *
   * @example
   * Request:
   * ```json
   * {
   *   "name": "Residential Construction - Updated",
   *   "description": "Updated custom template",
   *   "isActive": true,
   *   "folderStructure": [...]
   * }
   * ```
   *
   * Success Response (200):
   * ```json
   * {
   *   "id": "uuid",
   *   "name": "Residential Construction - Updated",
   *   "description": "Updated custom template",
   *   "isActive": true,
   *   "updatedAt": "2024-01-03T00:00:00.000Z"
   * }
   * ```
   *
   * Error Response (403):
   * ```json
   * {
   *   "statusCode": 403,
   *   "message": "System templates cannot be modified",
   *   "error": "Forbidden"
   * }
   * ```
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateTemplateDto,
  ): Promise<FolderTemplate> {
    return this.folderTemplateService.update(id, {
      name: updateDto.name,
      description: updateDto.description,
      projectType: updateDto.category,
      folderStructure: updateDto.folderStructure,
      isActive: updateDto.isActive,
    });
  }

  /**
   * Delete template
   *
   * DELETE /api/folder-templates/:id
   *
   * Deletes a custom template.
   * System templates cannot be deleted.
   * Deletion is permanent and cannot be undone.
   *
   * @param id - Template ID
   *
   * @example
   * Request:
   * ```
   * DELETE /api/folder-templates/uuid
   * ```
   *
   * Success Response (204):
   * No content
   *
   * Error Response (403):
   * ```json
   * {
   *   "statusCode": 403,
   *   "message": "System templates cannot be deleted",
   *   "error": "Forbidden"
   * }
   * ```
   *
   * Error Response (404):
   * ```json
   * {
   *   "statusCode": 404,
   *   "message": "Template not found",
   *   "error": "Not Found"
   * }
   * ```
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTemplate(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    // Get the template to check if it's a system template
    const template = await this.folderTemplateService.findOne(id);

    if (template.isSystem) {
      throw new BadRequestException('System templates cannot be deleted');
    }

    await this.folderTemplateService.remove(id);
  }
}
