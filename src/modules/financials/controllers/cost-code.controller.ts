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
import { CostCodeService } from '../services/cost-code.service';
import {
  CreateCostCodeDto,
  UpdateCostCodeDto,
  CostCodeResponseDto,
  CostCodeQueryDto,
  CostCodeTreeDto,
} from '../dto';

/**
 * CostCode Controller
 *
 * Handles HTTP requests for cost code management.
 * All endpoints require authentication and project access.
 *
 * Base URL: /api/v1/projects/:projectId/cost-codes
 */
@ApiTags('Cost Codes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/cost-codes')
export class CostCodeController {
  constructor(private readonly costCodeService: CostCodeService) {}

  /**
   * Create a new cost code
   * POST /api/v1/projects/:projectId/cost-codes
   */
  @Post()
  @ApiOperation({ summary: 'Create a new cost code' })
  @ApiResponse({
    status: 201,
    description: 'Cost code created successfully',
    type: CostCodeResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Project or parent cost code not found' })
  @ApiResponse({ status: 409, description: 'Cost code already exists' })
  async create(
    @Param('projectId') projectId: string,
    @Body() createDto: CreateCostCodeDto,
  ): Promise<CostCodeResponseDto> {
    // Ensure projectId matches the route parameter
    const dto = { ...createDto, projectId };
    return this.costCodeService.create(dto);
  }

  /**
   * Get all cost codes for a project
   * GET /api/v1/projects/:projectId/cost-codes
   */
  @Get()
  @ApiOperation({ summary: 'Get all cost codes for a project' })
  @ApiResponse({
    status: 200,
    description: 'Cost codes retrieved successfully',
    type: [CostCodeResponseDto],
  })
  async findAll(
    @Param('projectId') projectId: string,
    @Query() query: CostCodeQueryDto,
  ): Promise<CostCodeResponseDto[]> {
    return this.costCodeService.findAll(
      projectId,
      undefined, // division
      query.activeOnly !== undefined ? query.activeOnly : true,
      query.parentId,
    );
  }

  /**
   * Get cost code tree (hierarchical structure)
   * GET /api/v1/projects/:projectId/cost-codes/tree
   */
  @Get('tree')
  @ApiOperation({ summary: 'Get cost code tree (hierarchical structure)' })
  @ApiResponse({
    status: 200,
    description: 'Cost code tree retrieved successfully',
    type: [CostCodeResponseDto],
  })
  async getTree(
    @Param('projectId') projectId: string,
    @Query('isActive') isActive?: boolean,
  ): Promise<CostCodeResponseDto[]> {
    return this.costCodeService.getTree(
      projectId,
      isActive !== undefined ? isActive : true,
    );
  }

  /**
   * Get a cost code by ID
   * GET /api/v1/projects/:projectId/cost-codes/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a cost code by ID' })
  @ApiResponse({
    status: 200,
    description: 'Cost code retrieved successfully',
    type: CostCodeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Cost code not found' })
  async findOne(@Param('id') id: string): Promise<CostCodeResponseDto> {
    return this.costCodeService.findOne(id);
  }

  /**
   * Update a cost code
   * PUT /api/v1/projects/:projectId/cost-codes/:id
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a cost code' })
  @ApiResponse({
    status: 200,
    description: 'Cost code updated successfully',
    type: CostCodeResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Cost code not found' })
  @ApiResponse({ status: 409, description: 'Cost code already exists' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCostCodeDto,
  ): Promise<CostCodeResponseDto> {
    return this.costCodeService.update(id, updateDto);
  }

  /**
   * Delete a cost code
   * DELETE /api/v1/projects/:projectId/cost-codes/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a cost code' })
  @ApiResponse({ status: 204, description: 'Cost code deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete cost code with children' })
  @ApiResponse({ status: 404, description: 'Cost code not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.costCodeService.remove(id);
  }

  /**
   * Import CSI MasterFormat template
   * POST /api/v1/projects/:projectId/cost-codes/import-template
   */
  @Post('import-template')
  @ApiOperation({ summary: 'Import CSI MasterFormat template' })
  @ApiResponse({
    status: 201,
    description: 'Cost codes imported successfully',
    type: [CostCodeResponseDto],
  })
  @ApiResponse({ status: 400, description: 'Invalid template' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async importTemplate(
    @Param('projectId') projectId: string,
    @Body('template') template: string,
    @CurrentUser('id') userId: string,
  ): Promise<CostCodeResponseDto[]> {
    return this.costCodeService.importTemplate(projectId, template, userId);
  }
}
