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
import { CommitmentService } from '../services/commitment.service';
import {
  CreateCommitmentDto,
  UpdateCommitmentDto,
  CommitmentResponseDto,
  CommitmentQueryDto,
  CommitmentSummaryDto,
  SubmitCommitmentDto,
  ApproveCommitmentDto,
  RejectCommitmentDto,
  ActivateCommitmentDto,
  CompleteCommitmentDto,
  CloseCommitmentDto,
  VoidCommitmentDto,
} from '../dto';

/**
 * Commitment Controller
 *
 * Handles HTTP requests for commitment/contract management.
 * All endpoints require authentication and project access.
 *
 * Base URL: /api/v1/projects/:projectId/commitments
 */
@ApiTags('Commitments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/commitments')
export class CommitmentController {
  constructor(private readonly commitmentService: CommitmentService) {}

  /**
   * Create a new commitment
   * POST /api/v1/projects/:projectId/commitments
   */
  @Post()
  @ApiOperation({ summary: 'Create a new commitment' })
  @ApiResponse({
    status: 201,
    description: 'Commitment created successfully',
    type: CommitmentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async create(
    @Param('projectId') projectId: string,
    @Body() createDto: CreateCommitmentDto,
    @CurrentUser('id') userId: string,
  ): Promise<CommitmentResponseDto> {
    // Ensure projectId matches the route parameter
    const dto = { ...createDto, projectId };
    return this.commitmentService.create(dto);
  }

  /**
   * Get all commitments for a project
   * GET /api/v1/projects/:projectId/commitments
   */
  @Get()
  @ApiOperation({ summary: 'Get all commitments for a project' })
  @ApiResponse({
    status: 200,
    description: 'Commitments retrieved successfully',
    type: [CommitmentResponseDto],
  })
  async findAll(
    @Param('projectId') projectId: string,
    @Query() query: CommitmentQueryDto,
  ): Promise<{ data: CommitmentResponseDto[]; total: number; skip: number; take: number }> {
    const commitments = await this.commitmentService.findAll(projectId, query.type, query.status);
    return {
      data: commitments,
      total: commitments.length,
      skip: 0,
      take: commitments.length,
    };
  }

  /**
   * Get a commitment by ID
   * GET /api/v1/projects/:projectId/commitments/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a commitment by ID' })
  @ApiResponse({
    status: 200,
    description: 'Commitment retrieved successfully',
    type: CommitmentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Commitment not found' })
  async findOne(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ): Promise<CommitmentResponseDto> {
    return this.commitmentService.findOne(id, true);
  }

  /**
   * Update a commitment
   * PUT /api/v1/projects/:projectId/commitments/:id
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a commitment' })
  @ApiResponse({
    status: 200,
    description: 'Commitment updated successfully',
    type: CommitmentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Commitment not found' })
  async update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateCommitmentDto,
    @CurrentUser('id') userId: string,
  ): Promise<CommitmentResponseDto> {
    return this.commitmentService.update(id, updateDto);
  }

  /**
   * Delete a commitment
   * DELETE /api/v1/projects/:projectId/commitments/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a commitment' })
  @ApiResponse({ status: 204, description: 'Commitment deleted successfully' })
  @ApiResponse({ status: 404, description: 'Commitment not found' })
  async remove(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.commitmentService.remove(id);
  }

  /**
   * Get commitment summary with financial metrics
   * GET /api/v1/projects/:projectId/commitments/:id/summary
   *
   * TODO: Implement getSummary method in CommitmentService
   */
  // @Get(':id/summary')
  // @ApiOperation({ summary: 'Get commitment summary with financial metrics' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Commitment summary retrieved successfully',
  //   type: CommitmentSummaryDto,
  // })
  // @ApiResponse({ status: 404, description: 'Commitment not found' })
  // async getSummary(
  //   @Param('projectId') projectId: string,
  //   @Param('id') id: string,
  // ): Promise<CommitmentSummaryDto> {
  //   return this.commitmentService.getSummary(id, projectId);
  // }

  /**
   * Submit commitment for approval
   * POST /api/v1/projects/:projectId/commitments/:id/submit
   */
  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit commitment for approval' })
  @ApiResponse({
    status: 200,
    description: 'Commitment submitted successfully',
    type: CommitmentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Commitment not found' })
  async submit(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() submitDto: SubmitCommitmentDto,
    @CurrentUser('id') userId: string,
  ): Promise<CommitmentResponseDto> {
    return this.commitmentService.submit(id, userId);
  }

  /**
   * Approve a commitment
   * POST /api/v1/projects/:projectId/commitments/:id/approve
   */
  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a commitment' })
  @ApiResponse({
    status: 200,
    description: 'Commitment approved successfully',
    type: CommitmentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Commitment not found' })
  async approve(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() approveDto: ApproveCommitmentDto,
    @CurrentUser('id') userId: string,
  ): Promise<CommitmentResponseDto> {
    return this.commitmentService.approve(id, userId);
  }

  /**
   * Reject a commitment
   * POST /api/v1/projects/:projectId/commitments/:id/reject
   */
  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a commitment' })
  @ApiResponse({
    status: 200,
    description: 'Commitment rejected successfully',
    type: CommitmentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition or missing reason' })
  @ApiResponse({ status: 404, description: 'Commitment not found' })
  async reject(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() rejectDto: RejectCommitmentDto,
    @CurrentUser('id') userId: string,
  ): Promise<CommitmentResponseDto> {
    return this.commitmentService.reject(id, userId, rejectDto.reason);
  }

  /**
   * Activate a commitment
   * POST /api/v1/projects/:projectId/commitments/:id/activate
   */
  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate a commitment' })
  @ApiResponse({
    status: 200,
    description: 'Commitment activated successfully',
    type: CommitmentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Commitment not found' })
  async activate(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() activateDto: ActivateCommitmentDto,
    @CurrentUser('id') userId: string,
  ): Promise<CommitmentResponseDto> {
    return this.commitmentService.activate(id, userId);
  }

  /**
   * Mark commitment as complete
   * POST /api/v1/projects/:projectId/commitments/:id/complete
   */
  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark commitment as complete' })
  @ApiResponse({
    status: 200,
    description: 'Commitment marked as complete successfully',
    type: CommitmentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Commitment not found' })
  async complete(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() completeDto: CompleteCommitmentDto,
    @CurrentUser('id') userId: string,
  ): Promise<CommitmentResponseDto> {
    return this.commitmentService.complete(id, userId);
  }

  /**
   * Close a commitment
   * POST /api/v1/projects/:projectId/commitments/:id/close
   */
  @Post(':id/close')
  @ApiOperation({ summary: 'Close a commitment' })
  @ApiResponse({
    status: 200,
    description: 'Commitment closed successfully',
    type: CommitmentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Commitment not found' })
  async close(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() closeDto: CloseCommitmentDto,
    @CurrentUser('id') userId: string,
  ): Promise<CommitmentResponseDto> {
    return this.commitmentService.close(id, userId);
  }

  /**
   * Void a commitment
   * POST /api/v1/projects/:projectId/commitments/:id/void
   */
  @Post(':id/void')
  @ApiOperation({ summary: 'Void a commitment' })
  @ApiResponse({
    status: 200,
    description: 'Commitment voided successfully',
    type: CommitmentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition or missing reason' })
  @ApiResponse({ status: 404, description: 'Commitment not found' })
  async void(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() voidDto: VoidCommitmentDto,
    @CurrentUser('id') userId: string,
  ): Promise<CommitmentResponseDto> {
    return this.commitmentService.void(id, userId, voidDto.reason);
  }
}
