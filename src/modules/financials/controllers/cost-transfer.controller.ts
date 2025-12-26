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
import { CostTransferService } from '../services/cost-transfer.service';
import {
  CreateCostTransferDto,
  UpdateCostTransferDto,
  CostTransferResponseDto,
  CostTransferFilterDto,
  SubmitCostTransferDto,
  ApproveCostTransferDto,
  RejectCostTransferDto,
  VoidCostTransferDto,
} from '../dto';

/**
 * Cost Transfer Controller
 *
 * Handles HTTP requests for cost transfer management.
 * All endpoints require authentication and project access.
 *
 * Base URL: /api/v1/projects/:projectId/cost-transfers
 */
@ApiTags('Cost Transfers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/cost-transfers')
export class CostTransferController {
  constructor(private readonly costTransferService: CostTransferService) {}

  /**
   * Create a new cost transfer
   * POST /api/v1/projects/:projectId/cost-transfers
   */
  @Post()
  @ApiOperation({ summary: 'Create a new cost transfer' })
  @ApiResponse({
    status: 201,
    description: 'Cost transfer created successfully',
    type: CostTransferResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async create(
    @Param('projectId') projectId: string,
    @Body() createDto: CreateCostTransferDto,
    @CurrentUser('id') userId: string,
  ): Promise<CostTransferResponseDto> {
    const dto = { ...createDto, projectId };
    return this.costTransferService.create(dto, userId);
  }

  /**
   * Get all cost transfers for a project
   * GET /api/v1/projects/:projectId/cost-transfers
   */
  @Get()
  @ApiOperation({ summary: 'Get all cost transfers with filtering' })
  @ApiResponse({
    status: 200,
    description: 'Cost transfers retrieved successfully',
    type: [CostTransferResponseDto],
  })
  async findAll(
    @Param('projectId') projectId: string,
    @Query() filter: CostTransferFilterDto,
  ) {
    return this.costTransferService.findAll(filter);
  }

  /**
   * Get a cost transfer by ID
   * GET /api/v1/projects/:projectId/cost-transfers/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a cost transfer by ID' })
  @ApiResponse({
    status: 200,
    description: 'Cost transfer retrieved successfully',
    type: CostTransferResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Cost transfer not found' })
  async findOne(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ): Promise<CostTransferResponseDto> {
    return this.costTransferService.findOne(id);
  }

  /**
   * Update a cost transfer
   * PUT /api/v1/projects/:projectId/cost-transfers/:id
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a cost transfer' })
  @ApiResponse({
    status: 200,
    description: 'Cost transfer updated successfully',
    type: CostTransferResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Cost transfer not found' })
  async update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateCostTransferDto,
    @CurrentUser('id') userId: string,
  ): Promise<CostTransferResponseDto> {
    return this.costTransferService.update(id, updateDto, userId);
  }

  /**
   * Delete a cost transfer
   * DELETE /api/v1/projects/:projectId/cost-transfers/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a cost transfer' })
  @ApiResponse({ status: 204, description: 'Cost transfer deleted successfully' })
  @ApiResponse({ status: 404, description: 'Cost transfer not found' })
  async remove(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.costTransferService.remove(id, userId);
  }

  /**
   * Submit cost transfer for approval
   * POST /api/v1/projects/:projectId/cost-transfers/:id/submit
   */
  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit cost transfer for approval' })
  @ApiResponse({
    status: 200,
    description: 'Cost transfer submitted successfully',
    type: CostTransferResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Cost transfer not found' })
  async submit(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() submitDto: SubmitCostTransferDto,
    @CurrentUser('id') userId: string,
  ): Promise<CostTransferResponseDto> {
    return this.costTransferService.submit(id, userId);
  }

  /**
   * Approve a cost transfer
   * POST /api/v1/projects/:projectId/cost-transfers/:id/approve
   */
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a cost transfer' })
  @ApiResponse({
    status: 200,
    description: 'Cost transfer approved successfully',
    type: CostTransferResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Cost transfer not found' })
  async approve(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() approveDto: ApproveCostTransferDto,
    @CurrentUser('id') userId: string,
  ): Promise<CostTransferResponseDto> {
    return this.costTransferService.approve(id, userId);
  }

  /**
   * Reject a cost transfer
   * POST /api/v1/projects/:projectId/cost-transfers/:id/reject
   */
  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a cost transfer' })
  @ApiResponse({
    status: 200,
    description: 'Cost transfer rejected successfully',
    type: CostTransferResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition or missing reason' })
  @ApiResponse({ status: 404, description: 'Cost transfer not found' })
  async reject(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() rejectDto: RejectCostTransferDto,
    @CurrentUser('id') userId: string,
  ): Promise<CostTransferResponseDto> {
    return this.costTransferService.reject(id, rejectDto, userId);
  }

  /**
   * Void a cost transfer
   * POST /api/v1/projects/:projectId/cost-transfers/:id/void
   */
  @Post(':id/void')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Void a cost transfer' })
  @ApiResponse({
    status: 200,
    description: 'Cost transfer voided successfully',
    type: CostTransferResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition or missing reason' })
  @ApiResponse({ status: 404, description: 'Cost transfer not found' })
  async void(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() voidDto: VoidCostTransferDto,
    @CurrentUser('id') userId: string,
  ): Promise<CostTransferResponseDto> {
    return this.costTransferService.void(id, voidDto, userId);
  }
}
