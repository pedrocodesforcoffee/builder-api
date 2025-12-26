import {
  Controller,
  Get,
  Post,
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
  DefaultValuePipe,
  Req,
} from '@nestjs/common';
import { OrganizationService } from '../services/organization.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationResponseDto,
} from '../dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Request } from 'express';

/**
 * Organization Controller
 *
 * Handles all organization-related HTTP endpoints:
 * - Create new organizations
 * - List organizations (all or user-specific)
 * - Get organization details
 * - Update organization information
 * - Delete/deactivate organizations
 *
 * All endpoints require authentication (JwtAuthGuard)
 * RBAC permissions will be added in a subsequent step
 */
@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  /**
   * Create a new organization
   *
   * POST /organizations
   *
   * Creates a new organization and automatically adds the creator as OWNER.
   *
   * @param createDto - Organization creation data
   * @param req - Request with authenticated user
   * @returns Created organization
   *
   * @example
   * Request:
   * ```json
   * {
   *   "name": "Acme Construction",
   *   "slug": "acme-construction",
   *   "type": "General Contractor",
   *   "email": "info@acme.com",
   *   "phone": "+1-555-123-4567"
   * }
   * ```
   *
   * Success Response (201):
   * ```json
   * {
   *   "id": "uuid",
   *   "name": "Acme Construction",
   *   "slug": "acme-construction",
   *   "isActive": true,
   *   "createdAt": "2024-01-01T00:00:00.000Z"
   * }
   * ```
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateOrganizationDto,
    @Req() req: Request,
  ): Promise<OrganizationResponseDto> {
    const userId = (req as any).user.id;
    return this.organizationService.create(createDto, userId);
  }

  /**
   * List all organizations
   *
   * GET /organizations
   *
   * Returns all organizations the user has access to.
   * System admins can see all organizations.
   *
   * @param myOrgs - If true, only return organizations the user is a member of
   * @param includeInactive - If true, include inactive organizations
   * @param req - Request with authenticated user
   * @returns Array of organizations
   *
   * @example
   * Request:
   * ```
   * GET /organizations?myOrgs=true&includeInactive=false
   * ```
   *
   * Success Response (200):
   * ```json
   * [
   *   {
   *     "id": "uuid",
   *     "name": "Acme Construction",
   *     "slug": "acme-construction",
   *     "memberCount": 5,
   *     "isActive": true
   *   }
   * ]
   * ```
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('myOrgs', new DefaultValuePipe(true), ParseBoolPipe)
    myOrgs: boolean,
    @Query('includeInactive', new DefaultValuePipe(false), ParseBoolPipe)
    includeInactive: boolean,
    @Req() req: Request,
  ): Promise<OrganizationResponseDto[]> {
    const userId = myOrgs ? (req as any).user.id : undefined;
    return this.organizationService.findAll(userId, includeInactive);
  }

  /**
   * Get organization by ID
   *
   * GET /organizations/:id
   *
   * Returns detailed information about a specific organization.
   *
   * @param id - Organization ID
   * @param includeCounts - Whether to include member/project counts
   * @returns Organization details
   *
   * @example
   * Request:
   * ```
   * GET /organizations/uuid?includeCounts=true
   * ```
   *
   * Success Response (200):
   * ```json
   * {
   *   "id": "uuid",
   *   "name": "Acme Construction",
   *   "slug": "acme-construction",
   *   "type": "General Contractor",
   *   "email": "info@acme.com",
   *   "memberCount": 5,
   *   "projectCount": 3,
   *   "isActive": true
   * }
   * ```
   *
   * Error Response (404):
   * ```json
   * {
   *   "statusCode": 404,
   *   "message": "Organization with ID uuid not found",
   *   "error": "Not Found"
   * }
   * ```
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeCounts', new DefaultValuePipe(false), ParseBoolPipe)
    includeCounts: boolean,
  ): Promise<OrganizationResponseDto> {
    return this.organizationService.findOne(id, includeCounts);
  }

  /**
   * Update organization
   *
   * PATCH /organizations/:id
   *
   * Updates an existing organization's information.
   * Requires OWNER or ORG_ADMIN role.
   *
   * @param id - Organization ID
   * @param updateDto - Update data
   * @returns Updated organization
   *
   * @example
   * Request:
   * ```json
   * {
   *   "name": "Acme Construction Co.",
   *   "email": "contact@acme.com",
   *   "phone": "+1-555-999-8888"
   * }
   * ```
   *
   * Success Response (200):
   * ```json
   * {
   *   "id": "uuid",
   *   "name": "Acme Construction Co.",
   *   "email": "contact@acme.com",
   *   "updatedAt": "2024-01-02T00:00:00.000Z"
   * }
   * ```
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    return this.organizationService.update(id, updateDto);
  }

  /**
   * Delete organization
   *
   * DELETE /organizations/:id
   *
   * Soft-deletes an organization by setting isActive to false.
   * Hard delete is only available to system admins.
   * Requires OWNER role.
   *
   * @param id - Organization ID
   * @param hardDelete - Whether to permanently delete (requires system admin)
   *
   * @example
   * Request:
   * ```
   * DELETE /organizations/uuid?hardDelete=false
   * ```
   *
   * Success Response (204):
   * No content
   *
   * Error Response (403):
   * ```json
   * {
   *   "statusCode": 403,
   *   "message": "Only organization owners can delete the organization",
   *   "error": "Forbidden"
   * }
   * ```
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('hardDelete', new DefaultValuePipe(false), ParseBoolPipe)
    hardDelete: boolean,
  ): Promise<void> {
    await this.organizationService.remove(id, hardDelete);
  }
}
