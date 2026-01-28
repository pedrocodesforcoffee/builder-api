import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { UserPinnedProjectsService } from '../services/user-pinned-projects.service';
import { PinnedProjectsResponseDto } from '../dto/pinned-projects-response.dto';
import { UpdatePinnedProjectsDto } from '../dto/update-pinned-projects.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Request } from 'express';

/**
 * User Pinned Projects Controller
 *
 * Handles endpoints for managing user's pinned projects on their dashboard.
 *
 * All endpoints require authentication (JwtAuthGuard)
 */
@Controller('users/me/pinned-projects')
@UseGuards(JwtAuthGuard)
export class UserPinnedProjectsController {
  constructor(
    private readonly userPinnedProjectsService: UserPinnedProjectsService,
  ) {}

  /**
   * Get user's pinned projects
   *
   * GET /users/me/pinned-projects
   *
   * Returns the list of project IDs the current user has pinned.
   *
   * @param req - Request with authenticated user
   * @returns Array of pinned project IDs
   *
   * @example
   * Request:
   * ```
   * GET /users/me/pinned-projects
   * Authorization: Bearer <token>
   * ```
   *
   * Success Response (200):
   * ```json
   * {
   *   "projectIds": [
   *     "uuid-1",
   *     "uuid-2",
   *     "uuid-3"
   *   ]
   * }
   * ```
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getPinnedProjects(
    @Req() req: Request,
  ): Promise<PinnedProjectsResponseDto> {
    const userId = (req as any).user.id;
    return this.userPinnedProjectsService.getPinnedProjects(userId);
  }

  /**
   * Update user's pinned projects
   *
   * PUT /users/me/pinned-projects
   *
   * Replaces the user's pinned projects list with a new list.
   * Maximum 10 projects can be pinned.
   * User must have access to all projects in the list.
   *
   * @param req - Request with authenticated user
   * @param updateDto - Update data with project IDs
   * @returns Updated pinned projects
   *
   * @example
   * Request:
   * ```json
   * PUT /users/me/pinned-projects
   * Authorization: Bearer <token>
   * Content-Type: application/json
   *
   * {
   *   "projectIds": ["uuid-1", "uuid-2", "uuid-3"]
   * }
   * ```
   *
   * Success Response (200):
   * ```json
   * {
   *   "projectIds": ["uuid-1", "uuid-2", "uuid-3"]
   * }
   * ```
   *
   * Error Response (400) - Too many projects:
   * ```json
   * {
   *   "statusCode": 400,
   *   "message": ["Cannot pin more than 10 projects"],
   *   "error": "Bad Request"
   * }
   * ```
   *
   * Error Response (404) - Invalid project ID:
   * ```json
   * {
   *   "statusCode": 404,
   *   "message": "One or more project IDs are invalid: uuid-99",
   *   "error": "Not Found"
   * }
   * ```
   *
   * Error Response (403) - No access to project:
   * ```json
   * {
   *   "statusCode": 403,
   *   "message": "You don't have access to one or more projects: uuid-99",
   *   "error": "Forbidden"
   * }
   * ```
   */
  @Put()
  @HttpCode(HttpStatus.OK)
  async updatePinnedProjects(
    @Req() req: Request,
    @Body() updateDto: UpdatePinnedProjectsDto,
  ): Promise<PinnedProjectsResponseDto> {
    const userId = (req as any).user.id;
    return this.userPinnedProjectsService.updatePinnedProjects(userId, updateDto);
  }
}
