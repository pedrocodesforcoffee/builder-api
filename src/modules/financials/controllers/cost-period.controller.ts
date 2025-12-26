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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CostPeriodService } from '../services/cost-period.service';
import {
  CreateCostPeriodDto,
  UpdateCostPeriodDto,
  CostPeriodResponseDto,
  CostPeriodFilterDto,
  CostPeriodSummaryDto,
  CloseCostPeriodDto,
  LockCostPeriodDto,
} from '../dto';

/**
 * Cost Period Controller
 *
 * Handles HTTP requests for cost period management.
 * All endpoints require authentication and project access.
 *
 * Base URL: /api/v1/projects/:projectId/cost-periods
 */
@ApiTags('Cost Periods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/cost-periods')
export class CostPeriodController {
  constructor(private readonly costPeriodService: CostPeriodService) {}

  /**
   * Create a new cost period
   * POST /api/v1/projects/:projectId/cost-periods
   */
  @Post()
  @ApiOperation({ summary: 'Create a new cost period' })
  @ApiResponse({
    status: 201,
    description: 'Cost period created successfully',
    type: CostPeriodResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async create(
    @Param('projectId') projectId: string,
    @Body() createDto: CreateCostPeriodDto,
    @CurrentUser('id') userId: string,
  ): Promise<CostPeriodResponseDto> {
    const dto = { ...createDto, projectId };
    return this.costPeriodService.create(dto, userId);
  }

  /**
   * Get all cost periods for a project
   * GET /api/v1/projects/:projectId/cost-periods
   */
  @Get()
  @ApiOperation({ summary: 'Get all cost periods with filtering' })
  @ApiResponse({
    status: 200,
    description: 'Cost periods retrieved successfully',
    type: [CostPeriodResponseDto],
  })
  async findAll(
    @Param('projectId') projectId: string,
    @Query() filter: CostPeriodFilterDto,
  ) {
    return this.costPeriodService.findAll(filter);
  }

  /**
   * Get a cost period by ID
   * GET /api/v1/projects/:projectId/cost-periods/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a cost period by ID' })
  @ApiResponse({
    status: 200,
    description: 'Cost period retrieved successfully',
    type: CostPeriodResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Cost period not found' })
  async findOne(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ): Promise<CostPeriodResponseDto> {
    return this.costPeriodService.findOne(id);
  }

  /**
   * Update a cost period
   * PUT /api/v1/projects/:projectId/cost-periods/:id
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a cost period' })
  @ApiResponse({
    status: 200,
    description: 'Cost period updated successfully',
    type: CostPeriodResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Cost period not found' })
  async update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateCostPeriodDto,
    @CurrentUser('id') userId: string,
  ): Promise<CostPeriodResponseDto> {
    return this.costPeriodService.update(id, updateDto, userId);
  }

  /**
   * Delete a cost period
   * DELETE /api/v1/projects/:projectId/cost-periods/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a cost period' })
  @ApiResponse({ status: 204, description: 'Cost period deleted successfully' })
  @ApiResponse({ status: 404, description: 'Cost period not found' })
  async remove(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.costPeriodService.remove(id, userId);
  }

  /**
   * Get cost period summary
   * GET /api/v1/projects/:projectId/cost-periods/:id/summary
   */
  @Get(':id/summary')
  @ApiOperation({ summary: 'Get cost period summary' })
  @ApiResponse({
    status: 200,
    description: 'Cost period summary retrieved successfully',
    type: CostPeriodSummaryDto,
  })
  @ApiResponse({ status: 404, description: 'Cost period not found' })
  async getSummary(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ): Promise<CostPeriodSummaryDto> {
    return this.costPeriodService.getSummary(id);
  }

  /**
   * Close a cost period
   * POST /api/v1/projects/:projectId/cost-periods/:id/close
   */
  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close a cost period' })
  @ApiResponse({
    status: 200,
    description: 'Cost period closed successfully',
    type: CostPeriodResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Cost period not found' })
  async close(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() closeDto: CloseCostPeriodDto,
    @CurrentUser('id') userId: string,
  ): Promise<CostPeriodResponseDto> {
    return this.costPeriodService.close(id, userId);
  }

  /**
   * Lock a cost period
   * POST /api/v1/projects/:projectId/cost-periods/:id/lock
   */
  @Post(':id/lock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lock a cost period' })
  @ApiResponse({
    status: 200,
    description: 'Cost period locked successfully',
    type: CostPeriodResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Cost period not found' })
  async lock(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() lockDto: LockCostPeriodDto,
    @CurrentUser('id') userId: string,
  ): Promise<CostPeriodResponseDto> {
    return this.costPeriodService.lock(id, userId);
  }
}
