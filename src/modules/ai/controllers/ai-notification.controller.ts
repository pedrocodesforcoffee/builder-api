/**
 * AI Notification Controller
 * Manages AI-related notifications for users
 */

import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AiNotificationService } from '../services/ai-notification.service';
import { AiNotification } from '../entities/ai-notification.entity';

@ApiTags('AI Notifications')
@Controller('ai/notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiNotificationController {
  constructor(private aiNotificationService: AiNotificationService) {}

  /**
   * Get user's AI notifications
   */
  @Get()
  @ApiOperation({
    summary: 'Get user AI notifications',
    description: 'Returns AI notifications for the authenticated user',
  })
  @ApiQuery({
    name: 'unreadOnly',
    required: false,
    type: Boolean,
    description: 'Return only unread notifications',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of notifications to return (default: 50)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notifications retrieved successfully',
  })
  async getUserNotifications(
    @Request() req: any,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
  ): Promise<AiNotification[]> {
    const userId = req.user.userId;
    const unreadOnlyBool = unreadOnly === 'true';
    const limitNum = limit ? parseInt(limit, 10) : 50;

    return this.aiNotificationService.getUserNotifications(
      userId,
      unreadOnlyBool,
      limitNum,
    );
  }

  /**
   * Get unread notification count
   */
  @Get('unread-count')
  @ApiOperation({
    summary: 'Get unread notification count',
    description: 'Returns the number of unread AI notifications for the authenticated user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Count retrieved successfully',
  })
  async getUnreadCount(@Request() req: any): Promise<{ count: number }> {
    const userId = req.user.userId;
    const count = await this.aiNotificationService.getUnreadCount(userId);
    return { count };
  }

  /**
   * Mark notification as read
   */
  @Patch(':id/read')
  @ApiOperation({
    summary: 'Mark notification as read',
    description: 'Marks a specific AI notification as read',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification marked as read',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Notification not found',
  })
  async markAsRead(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    const userId = req.user.userId;
    await this.aiNotificationService.markAsRead(id, userId);
    return { message: 'Notification marked as read' };
  }
}
