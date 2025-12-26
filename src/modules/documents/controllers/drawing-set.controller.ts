import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DrawingSetService } from '../services/drawing-set.service';
import {
  CreateDrawingSetDto,
  UpdateDrawingSetDto,
  IssueDrawingSetDto,
  SupersedeDrawingSetDto,
  DrawingSetResponseDto,
} from '../dto/drawing-management.dto';

/**
 * Drawing Set Controller
 *
 * Manages groups of drawings organized by phase or purpose.
 * Handles creation, updates, issuing, and lifecycle management of drawing sets.
 */
@ApiTags('Drawing Sets')
@Controller('api/projects/:projectId/drawing-sets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DrawingSetController {
  constructor(private readonly drawingSetService: DrawingSetService) {}

  /**
   * Create a new drawing set
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new drawing set',
    description:
      'Creates a new drawing set for organizing drawings by phase, purpose, or distribution.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiResponse({
    status: 201,
    description: 'Drawing set created successfully',
    type: DrawingSetResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input',
  })
  async create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateDrawingSetDto,
    @Request() req: any,
  ): Promise<DrawingSetResponseDto> {
    return this.drawingSetService.create(projectId, req.user.id, dto);
  }

  /**
   * Get all drawing sets for a project
   */
  @Get()
  @ApiOperation({
    summary: 'Get all drawing sets for a project',
    description: 'Returns all drawing sets, optionally filtered by type or status.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiQuery({
    name: 'setType',
    required: false,
    description: 'Filter by set type (SD, DD, CD, BID, PERMIT, IFC, AS_BUILT, OTHER)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status (draft, issued, superseded, archived)',
  })
  @ApiQuery({
    name: 'isCurrent',
    required: false,
    type: Boolean,
    description: 'Filter by current flag',
  })
  @ApiResponse({
    status: 200,
    description: 'Drawing sets retrieved successfully',
    type: [DrawingSetResponseDto],
  })
  async findAll(
    @Param('projectId') projectId: string,
    @Query('setType') setType?: string,
    @Query('status') status?: string,
    @Query('isCurrent') isCurrent?: boolean,
  ): Promise<DrawingSetResponseDto[]> {
    return this.drawingSetService.findAll(projectId, {
      setType,
      status,
      isCurrent,
    });
  }

  /**
   * Get a specific drawing set
   */
  @Get(':setId')
  @ApiOperation({
    summary: 'Get a specific drawing set',
    description: 'Returns details of a single drawing set.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiParam({
    name: 'setId',
    description: 'Drawing set ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Drawing set retrieved successfully',
    type: DrawingSetResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Drawing set not found',
  })
  async findOne(
    @Param('projectId') projectId: string,
    @Param('setId') setId: string,
  ): Promise<DrawingSetResponseDto> {
    return this.drawingSetService.findOne(projectId, setId);
  }

  /**
   * Update a drawing set
   */
  @Put(':setId')
  @ApiOperation({
    summary: 'Update a drawing set',
    description: 'Updates a drawing set. Only draft sets can be updated freely.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiParam({
    name: 'setId',
    description: 'Drawing set ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Drawing set updated successfully',
    type: DrawingSetResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot update set in current status',
  })
  @ApiResponse({
    status: 404,
    description: 'Drawing set not found',
  })
  async update(
    @Param('projectId') projectId: string,
    @Param('setId') setId: string,
    @Body() dto: UpdateDrawingSetDto,
  ): Promise<DrawingSetResponseDto> {
    return this.drawingSetService.update(projectId, setId, dto);
  }

  /**
   * Issue a drawing set
   */
  @Post(':setId/issue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Issue a drawing set',
    description:
      'Marks a drawing set as issued/published. Changes status from draft to issued.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiParam({
    name: 'setId',
    description: 'Drawing set ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Drawing set issued successfully',
    type: DrawingSetResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Can only issue draft drawing sets',
  })
  @ApiResponse({
    status: 404,
    description: 'Drawing set not found',
  })
  async issue(
    @Param('projectId') projectId: string,
    @Param('setId') setId: string,
    @Body() dto: IssueDrawingSetDto,
  ): Promise<DrawingSetResponseDto> {
    return this.drawingSetService.issue(projectId, setId, dto);
  }

  /**
   * Mark a drawing set as current
   */
  @Post(':setId/mark-current')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark drawing set as current',
    description:
      'Marks this drawing set as the current/active set for the project. Unmarks any previous current set.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiParam({
    name: 'setId',
    description: 'Drawing set ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Drawing set marked as current',
    type: DrawingSetResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Only issued sets can be marked as current',
  })
  @ApiResponse({
    status: 404,
    description: 'Drawing set not found',
  })
  async markAsCurrent(
    @Param('projectId') projectId: string,
    @Param('setId') setId: string,
  ): Promise<DrawingSetResponseDto> {
    return this.drawingSetService.markAsCurrent(projectId, setId);
  }

  /**
   * Supersede a drawing set
   */
  @Post(':setId/supersede')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Supersede a drawing set',
    description:
      'Marks a drawing set as superseded by a newer set. Changes status to superseded.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiParam({
    name: 'setId',
    description: 'Drawing set ID to supersede',
  })
  @ApiResponse({
    status: 200,
    description: 'Drawing set superseded successfully',
    type: DrawingSetResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Superseding set must be issued',
  })
  @ApiResponse({
    status: 404,
    description: 'Drawing set not found',
  })
  async supersede(
    @Param('projectId') projectId: string,
    @Param('setId') setId: string,
    @Body() dto: SupersedeDrawingSetDto,
  ): Promise<DrawingSetResponseDto> {
    return this.drawingSetService.supersede(projectId, setId, dto);
  }

  /**
   * Archive a drawing set
   */
  @Delete(':setId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Archive a drawing set',
    description:
      'Archives (soft deletes) a drawing set. Cannot archive the current set.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiParam({
    name: 'setId',
    description: 'Drawing set ID',
  })
  @ApiResponse({
    status: 204,
    description: 'Drawing set archived successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot archive the current drawing set',
  })
  @ApiResponse({
    status: 404,
    description: 'Drawing set not found',
  })
  async archive(
    @Param('projectId') projectId: string,
    @Param('setId') setId: string,
  ): Promise<void> {
    return this.drawingSetService.archive(projectId, setId);
  }

  /**
   * Add drawings to a set
   */
  @Post(':setId/drawings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Add drawings to a set',
    description: 'Adds one or more drawings to this drawing set.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiParam({
    name: 'setId',
    description: 'Drawing set ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Drawings added successfully',
    type: DrawingSetResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Drawing set not found',
  })
  async addDrawings(
    @Param('projectId') projectId: string,
    @Param('setId') setId: string,
    @Body() body: { drawingIds: string[] },
  ): Promise<DrawingSetResponseDto> {
    return this.drawingSetService.addDrawings(
      projectId,
      setId,
      body.drawingIds,
    );
  }

  /**
   * Remove drawings from a set
   */
  @Delete(':setId/drawings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove drawings from a set',
    description: 'Removes one or more drawings from this drawing set.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiParam({
    name: 'setId',
    description: 'Drawing set ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Drawings removed successfully',
    type: DrawingSetResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Drawing set not found',
  })
  async removeDrawings(
    @Param('projectId') projectId: string,
    @Param('setId') setId: string,
    @Body() body: { drawingIds: string[] },
  ): Promise<DrawingSetResponseDto> {
    return this.drawingSetService.removeDrawings(
      projectId,
      setId,
      body.drawingIds,
    );
  }

  /**
   * Get drawings in a set
   */
  @Get(':setId/drawings')
  @ApiOperation({
    summary: 'Get drawings in a set',
    description: 'Returns all drawings in this drawing set.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiParam({
    name: 'setId',
    description: 'Drawing set ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Drawings retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Drawing set not found',
  })
  async getDrawings(
    @Param('projectId') projectId: string,
    @Param('setId') setId: string,
  ): Promise<any[]> {
    return this.drawingSetService.getDrawings(projectId, setId);
  }

  /**
   * Get current drawing set
   */
  @Get('current')
  @ApiOperation({
    summary: 'Get current drawing set',
    description: 'Returns the current/active drawing set for this project.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Current drawing set retrieved successfully',
    type: DrawingSetResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'No current drawing set found',
  })
  async getCurrent(
    @Param('projectId') projectId: string,
  ): Promise<DrawingSetResponseDto | null> {
    return this.drawingSetService.getCurrent(projectId);
  }
}
