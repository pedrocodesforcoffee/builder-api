/**
 * User Cascade Controller
 *
 * Handles user deletion and restoration with cascading effects
 */

import {
  Controller,
  Delete,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { UserCascadeService } from '../services/user-cascade.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { DeleteUserDto, RestoreUserDto } from '../dto';

/**
 * User Cascade Controller
 *
 * Provides endpoints for cascading user operations:
 * - DELETE /users/:userId - Delete user with cascade
 * - POST /users/:userId/restore - Restore soft-deleted user
 * - GET /users/:userId/deletion-impact - Preview deletion impact
 * - GET /users/:userId/validate-deletion - Validate if user can be deleted
 */
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserCascadeController {
  constructor(private readonly userCascadeService: UserCascadeService) {}

  /**
   * Get deletion impact preview
   *
   * Shows what would be affected if user is deleted
   */
  @Get(':userId/deletion-impact')
  async getDeletionImpact(@Param('userId') userId: string) {
    return this.userCascadeService.getDeleteionImpact(userId);
  }

  /**
   * Validate if user can be deleted
   *
   * Checks for blockers (e.g., sole ownership)
   */
  @Get(':userId/validate-deletion')
  async validateDeletion(@Param('userId') userId: string) {
    return this.userCascadeService.validateDeletion(userId);
  }

  /**
   * Delete user with cascading effects
   *
   * Removes user from all organizations and projects
   * Can soft delete (mark as inactive) or hard delete (permanent removal)
   *
   * @throws BadRequestException if user is sole owner of any organization
   * @throws NotFoundException if user not found
   */
  @Delete(':userId')
  @HttpCode(HttpStatus.OK)
  async deleteUser(
    @Param('userId') userId: string,
    @Body() dto: DeleteUserDto,
    @CurrentUser() user: User,
  ) {
    // Validate deletion first
    const validation = await this.userCascadeService.validateDeletion(userId);

    if (!validation.canDelete) {
      throw new BadRequestException({
        message: 'Cannot delete user',
        reason: validation.reason,
        blockers: validation.blockers,
      });
    }

    // Perform deletion
    const result = await this.userCascadeService.deleteUser(userId, {
      deletedBy: user.id,
      reason: dto.reason,
      softDelete: dto.softDelete ?? true, // Default to soft delete
    });

    return {
      message: 'User deleted successfully',
      ...result,
    };
  }

  /**
   * Restore a soft-deleted user
   *
   * @throws BadRequestException if user is not deleted or email cannot be restored
   * @throws NotFoundException if user not found
   */
  @Post(':userId/restore')
  @HttpCode(HttpStatus.OK)
  async restoreUser(
    @Param('userId') userId: string,
    @Body() dto: RestoreUserDto,
    @CurrentUser() user: User,
  ) {
    await this.userCascadeService.restoreUser(userId, {
      restoredBy: user.id,
      reason: dto.reason,
    });

    return {
      message: 'User restored successfully',
      userId,
    };
  }
}
