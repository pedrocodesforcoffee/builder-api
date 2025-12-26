import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BulkOperationsService } from '../services/bulk-operations.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import {
  BulkAddMembersDto,
  BulkUpdateMembersDto,
  BulkRemoveMembersDto,
} from '../dto';

/**
 * Bulk Operations Controller
 *
 * Handles bulk operations for project memberships
 */
@Controller('projects/:projectId/members/bulk')
@UseGuards(JwtAuthGuard)
export class BulkOperationsController {
  constructor(private readonly bulkOperationsService: BulkOperationsService) {}

  /**
   * Bulk add members
   */
  @Post('add')
  async bulkAddMembers(
    @Param('projectId') projectId: string,
    @Body() dto: BulkAddMembersDto,
    @CurrentUser() user: User,
  ) {
    return this.bulkOperationsService.bulkAddMembers(projectId, dto, user.id);
  }

  /**
   * Bulk update members
   */
  @Patch('update')
  async bulkUpdateMembers(
    @Param('projectId') projectId: string,
    @Body() dto: BulkUpdateMembersDto,
    @CurrentUser() user: User,
  ) {
    return this.bulkOperationsService.bulkUpdateMembers(projectId, dto, user.id);
  }

  /**
   * Bulk remove members
   */
  @Delete('remove')
  @HttpCode(HttpStatus.OK)
  async bulkRemoveMembers(
    @Param('projectId') projectId: string,
    @Body() dto: BulkRemoveMembersDto,
    @CurrentUser() user: User,
  ) {
    return this.bulkOperationsService.bulkRemoveMembers(projectId, dto, user.id);
  }
}
