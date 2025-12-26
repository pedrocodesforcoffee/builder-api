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
import { CostEntryService } from '../services/cost-entry.service';
import {
  CreateCostEntryDto,
  UpdateCostEntryDto,
  CostEntryResponseDto,
  CostEntryFilterDto,
  PostCostEntryDto,
  VoidCostEntryDto,
} from '../dto';

/**
 * Cost Entry Controller
 *
 * Handles HTTP requests for cost entry management.
 * All endpoints require authentication and project access.
 *
 * Base URL: /api/v1/projects/:projectId/cost-entries
 */
@ApiTags('Cost Entries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/cost-entries')
export class CostEntryController {
  constructor(private readonly costEntryService: CostEntryService) {}

  /**
   * Create a new cost entry
   * POST /api/v1/projects/:projectId/cost-entries
   */
  @Post()
  @ApiOperation({ summary: 'Create a new cost entry' })
  @ApiResponse({
    status: 201,
    description: 'Cost entry created successfully',
    type: CostEntryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async create(
    @Param('projectId') projectId: string,
    @Body() createDto: CreateCostEntryDto,
    @CurrentUser('id') userId: string,
  ): Promise<CostEntryResponseDto> {
    const dto = { ...createDto, projectId };
    return this.costEntryService.create(dto, userId);
  }

  /**
   * Get all cost entries for a project
   * GET /api/v1/projects/:projectId/cost-entries
   */
  @Get()
  @ApiOperation({ summary: 'Get all cost entries with filtering' })
  @ApiResponse({
    status: 200,
    description: 'Cost entries retrieved successfully',
    type: [CostEntryResponseDto],
  })
  async findAll(
    @Param('projectId') projectId: string,
    @Query() filter: CostEntryFilterDto,
  ) {
    return this.costEntryService.findAll(filter);
  }

  /**
   * Get a cost entry by ID
   * GET /api/v1/projects/:projectId/cost-entries/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a cost entry by ID' })
  @ApiResponse({
    status: 200,
    description: 'Cost entry retrieved successfully',
    type: CostEntryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Cost entry not found' })
  async findOne(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ): Promise<CostEntryResponseDto> {
    return this.costEntryService.findOne(id);
  }

  /**
   * Update a cost entry
   * PUT /api/v1/projects/:projectId/cost-entries/:id
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a cost entry' })
  @ApiResponse({
    status: 200,
    description: 'Cost entry updated successfully',
    type: CostEntryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Cost entry not found' })
  async update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateCostEntryDto,
    @CurrentUser('id') userId: string,
  ): Promise<CostEntryResponseDto> {
    return this.costEntryService.update(id, updateDto, userId);
  }

  /**
   * Delete a cost entry
   * DELETE /api/v1/projects/:projectId/cost-entries/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a cost entry' })
  @ApiResponse({ status: 204, description: 'Cost entry deleted successfully' })
  @ApiResponse({ status: 404, description: 'Cost entry not found' })
  async remove(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.costEntryService.remove(id, userId);
  }

  /**
   * Post a cost entry
   * POST /api/v1/projects/:projectId/cost-entries/:id/post
   */
  @Post(':id/post')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Post a cost entry' })
  @ApiResponse({
    status: 200,
    description: 'Cost entry posted successfully',
    type: CostEntryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Cost entry not found' })
  async post(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() postDto: PostCostEntryDto,
    @CurrentUser('id') userId: string,
  ): Promise<CostEntryResponseDto> {
    return this.costEntryService.post(id, userId);
  }

  /**
   * Void a cost entry
   * POST /api/v1/projects/:projectId/cost-entries/:id/void
   */
  @Post(':id/void')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Void a cost entry' })
  @ApiResponse({
    status: 200,
    description: 'Cost entry voided successfully',
    type: CostEntryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition or missing reason' })
  @ApiResponse({ status: 404, description: 'Cost entry not found' })
  async void(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() voidDto: VoidCostEntryDto,
    @CurrentUser('id') userId: string,
  ): Promise<CostEntryResponseDto> {
    return this.costEntryService.void(id, voidDto, userId);
  }
}
