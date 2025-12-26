import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ChangeOrderApprovalService } from '../services/change-order-approval.service';
import {
  ApprovalThresholdResponseDto,
  UpdateThresholdsDto,
} from '../dto';

/**
 * Approval Threshold Controller
 *
 * Handles HTTP requests for change order approval threshold management.
 * Base URL: /api/v1/projects/:projectId/co-approval-thresholds
 */
@ApiTags('Change Order Approval Thresholds')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/co-approval-thresholds')
export class ApprovalThresholdController {
  constructor(private readonly approvalService: ChangeOrderApprovalService) {}

  @Get()
  @ApiOperation({ summary: 'Get project approval thresholds' })
  @ApiResponse({ status: 200, description: 'Approval thresholds retrieved successfully' })
  async getThresholds(
    @Param('projectId') projectId: string,
  ): Promise<ApprovalThresholdResponseDto[]> {
    const thresholds = await this.approvalService.getThresholds(projectId);
    return thresholds as any;
  }

  @Put()
  @ApiOperation({ summary: 'Update project approval thresholds' })
  @ApiResponse({ status: 200, description: 'Approval thresholds updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid threshold configuration' })
  async updateThresholds(
    @Param('projectId') projectId: string,
    @Body() dto: UpdateThresholdsDto,
  ): Promise<ApprovalThresholdResponseDto[]> {
    const thresholds = await this.approvalService.updateThresholds(projectId, dto);
    return thresholds as any;
  }
}
