import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CommitmentItemService } from '../services/commitment-item.service';
import {
  CreateCommitmentItemDto,
  UpdateCommitmentItemDto,
  CommitmentItemResponseDto,
} from '../dto';

/**
 * CommitmentItem Controller
 *
 * Handles HTTP requests for commitment line item management.
 * All endpoints require authentication and project access.
 *
 * Base URL: /api/v1/projects/:projectId/commitments/:commitmentId/items
 */
@ApiTags('Commitment Items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/commitments/:commitmentId/items')
export class CommitmentItemController {
  constructor(private readonly itemService: CommitmentItemService) {}

  /**
   * Create a new commitment line item
   * POST /api/v1/projects/:projectId/commitments/:commitmentId/items
   */
  @Post()
  @ApiOperation({ summary: 'Create a new commitment line item' })
  @ApiResponse({
    status: 201,
    description: 'Commitment item created successfully',
    type: CommitmentItemResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Commitment or cost code not found' })
  async create(
    @Param('commitmentId') commitmentId: string,
    @Body() createDto: CreateCommitmentItemDto,
  ): Promise<CommitmentItemResponseDto> {
    // Ensure commitmentId matches the route parameter
    const dto = { ...createDto, commitmentId };
    return this.itemService.create(dto);
  }

  /**
   * Get all line items for a commitment
   * GET /api/v1/projects/:projectId/commitments/:commitmentId/items
   */
  @Get()
  @ApiOperation({ summary: 'Get all line items for a commitment' })
  @ApiResponse({
    status: 200,
    description: 'Commitment items retrieved successfully',
    type: [CommitmentItemResponseDto],
  })
  async findAll(
    @Param('commitmentId') commitmentId: string,
  ): Promise<CommitmentItemResponseDto[]> {
    return this.itemService.findAll(commitmentId);
  }

  /**
   * Get a commitment line item by ID
   * GET /api/v1/projects/:projectId/commitments/:commitmentId/items/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a commitment line item by ID' })
  @ApiResponse({
    status: 200,
    description: 'Commitment item retrieved successfully',
    type: CommitmentItemResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Commitment item not found' })
  async findOne(@Param('id') id: string): Promise<CommitmentItemResponseDto> {
    return this.itemService.findOne(id);
  }

  /**
   * Update a commitment line item
   * PUT /api/v1/projects/:projectId/commitments/:commitmentId/items/:id
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a commitment line item' })
  @ApiResponse({
    status: 200,
    description: 'Commitment item updated successfully',
    type: CommitmentItemResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Commitment item not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCommitmentItemDto,
  ): Promise<CommitmentItemResponseDto> {
    return this.itemService.update(id, updateDto);
  }

  /**
   * Delete a commitment line item
   * DELETE /api/v1/projects/:projectId/commitments/:commitmentId/items/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a commitment line item' })
  @ApiResponse({ status: 204, description: 'Commitment item deleted successfully' })
  @ApiResponse({ status: 404, description: 'Commitment item not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.itemService.remove(id);
  }
}
