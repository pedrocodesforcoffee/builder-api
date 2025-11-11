import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { MembershipHistoryService } from '../services/membership-history.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';

/**
 * Membership History Controller
 *
 * Handles history and statistics for project memberships
 */
@Controller('projects/:projectId/members')
@UseGuards(JwtAuthGuard)
export class MembershipHistoryController {
  constructor(
    private readonly membershipHistoryService: MembershipHistoryService,
  ) {}

  /**
   * Get member history
   */
  @Get(':userId/history')
  async getMemberHistory(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: User,
  ) {
    return this.membershipHistoryService.getMemberHistory(
      projectId,
      userId,
      user.id,
    );
  }

  /**
   * Get project statistics
   */
  @Get('statistics')
  async getProjectStatistics(
    @Param('projectId') projectId: string,
    @CurrentUser() user: User,
  ) {
    return this.membershipHistoryService.getProjectStatistics(
      projectId,
      user.id,
    );
  }

  /**
   * Get pending renewals
   */
  @Get('pending-renewals')
  async getPendingRenewals(
    @Param('projectId') projectId: string,
    @Query('daysAhead') daysAhead?: string,
    @CurrentUser() user?: User,
  ) {
    const days = daysAhead ? parseInt(daysAhead) : 30;
    return this.membershipHistoryService.getPendingRenewals(
      projectId,
      user?.id || '',
      days,
    );
  }
}
