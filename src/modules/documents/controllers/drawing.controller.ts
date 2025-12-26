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
import { DrawingService } from '../services/drawing.service';
import {
  CreateDrawingDto,
  UpdateDrawingDto,
  AddDrawingRevisionDto,
  CreateCrossReferenceDto,
  DrawingResponseDto,
  ExportDrawingLogDto,
  DrawingLogExportResponseDto,
} from '../dto/drawing-management.dto';
import { DrawingRevision } from '../entities/drawing-revision.entity';
import { DrawingCrossReference } from '../entities/drawing-cross-reference.entity';

/**
 * Drawing Controller
 *
 * Manages construction drawings with industry-standard features.
 * Handles creation, updates, revisions, cross-references, and queries.
 */
@ApiTags('Drawings')
@Controller('api/projects/:projectId/drawings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DrawingController {
  constructor(private readonly drawingService: DrawingService) {}

  /**
   * ==================== DRAWING CRUD ====================
   */

  /**
   * Create a new drawing
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new drawing',
    description:
      'Creates a new drawing record with industry-standard sheet numbering and metadata.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiResponse({
    status: 201,
    description: 'Drawing created successfully',
    type: DrawingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input (e.g., invalid sheet number format)',
  })
  @ApiResponse({
    status: 409,
    description: 'Drawing with this sheet number already exists',
  })
  async create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateDrawingDto,
    @Request() req: any,
  ): Promise<DrawingResponseDto> {
    return this.drawingService.create(projectId, req.user.id, dto);
  }

  /**
   * Get all drawings for a project
   */
  @Get()
  @ApiOperation({
    summary: 'Get all drawings for a project',
    description:
      'Returns all drawings, optionally filtered by discipline, type, or set.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiQuery({
    name: 'discipline',
    required: false,
    description: 'Filter by discipline (A, S, M, E, P, etc.)',
  })
  @ApiQuery({
    name: 'drawingType',
    required: false,
    description: 'Filter by drawing type',
  })
  @ApiQuery({
    name: 'drawingSetId',
    required: false,
    description: 'Filter by drawing set',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by sheet number or title',
  })
  @ApiResponse({
    status: 200,
    description: 'Drawings retrieved successfully',
    type: [DrawingResponseDto],
  })
  async findAll(
    @Param('projectId') projectId: string,
    @Query('discipline') discipline?: string,
    @Query('drawingType') drawingType?: string,
    @Query('drawingSetId') drawingSetId?: string,
    @Query('search') search?: string,
  ): Promise<DrawingResponseDto[]> {
    return this.drawingService.findAll(projectId, {
      discipline,
      drawingType,
      drawingSetId,
      search,
    });
  }

  /**
   * Get a specific drawing
   */
  @Get(':drawingId')
  @ApiOperation({
    summary: 'Get a specific drawing',
    description: 'Returns details of a single drawing.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiParam({
    name: 'drawingId',
    description: 'Drawing ID',
  })
  @ApiQuery({
    name: 'includeRevisions',
    required: false,
    type: Boolean,
    description: 'Include full revision records',
  })
  @ApiQuery({
    name: 'includeCrossReferences',
    required: false,
    type: Boolean,
    description: 'Include cross-reference details',
  })
  @ApiResponse({
    status: 200,
    description: 'Drawing retrieved successfully',
    type: DrawingResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Drawing not found',
  })
  async findOne(
    @Param('projectId') projectId: string,
    @Param('drawingId') drawingId: string,
    @Query('includeRevisions') includeRevisions?: boolean,
    @Query('includeCrossReferences') includeCrossReferences?: boolean,
  ): Promise<any> {
    return this.drawingService.findOne(projectId, drawingId, {
      includeRevisions,
      includeCrossReferences,
    });
  }

  /**
   * Update a drawing
   */
  @Put(':drawingId')
  @ApiOperation({
    summary: 'Update a drawing',
    description: 'Updates drawing metadata.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiParam({
    name: 'drawingId',
    description: 'Drawing ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Drawing updated successfully',
    type: DrawingResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Drawing not found',
  })
  async update(
    @Param('projectId') projectId: string,
    @Param('drawingId') drawingId: string,
    @Body() dto: UpdateDrawingDto,
  ): Promise<DrawingResponseDto> {
    return this.drawingService.update(projectId, drawingId, dto);
  }

  /**
   * Delete a drawing
   */
  @Delete(':drawingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a drawing',
    description: 'Deletes a drawing and all associated revisions and cross-references.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiParam({
    name: 'drawingId',
    description: 'Drawing ID',
  })
  @ApiResponse({
    status: 204,
    description: 'Drawing deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Drawing not found',
  })
  async delete(
    @Param('projectId') projectId: string,
    @Param('drawingId') drawingId: string,
  ): Promise<void> {
    return this.drawingService.delete(projectId, drawingId);
  }

  /**
   * ==================== REVISIONS ====================
   */

  /**
   * Add a revision to a drawing
   */
  @Post(':drawingId/revisions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add a revision to a drawing',
    description:
      'Creates a new revision record for a drawing. Updates the drawing\'s current revision.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiParam({
    name: 'drawingId',
    description: 'Drawing ID',
  })
  @ApiResponse({
    status: 201,
    description: 'Revision added successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Drawing not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Revision marker already exists',
  })
  async addRevision(
    @Param('projectId') projectId: string,
    @Param('drawingId') drawingId: string,
    @Body() dto: AddDrawingRevisionDto,
    @Request() req: any,
  ): Promise<DrawingRevision> {
    return this.drawingService.addRevision(
      projectId,
      drawingId,
      req.user.id,
      dto,
    );
  }

  /**
   * Get revisions for a drawing
   */
  @Get(':drawingId/revisions')
  @ApiOperation({
    summary: 'Get revisions for a drawing',
    description: 'Returns all revisions for a drawing, ordered by sequence number.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiParam({
    name: 'drawingId',
    description: 'Drawing ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Revisions retrieved successfully',
    type: [DrawingRevision],
  })
  @ApiResponse({
    status: 404,
    description: 'Drawing not found',
  })
  async getRevisions(
    @Param('projectId') projectId: string,
    @Param('drawingId') drawingId: string,
  ): Promise<DrawingRevision[]> {
    return this.drawingService.getRevisions(projectId, drawingId);
  }

  /**
   * ==================== CROSS-REFERENCES ====================
   */

  /**
   * Create a cross-reference
   */
  @Post(':drawingId/cross-references')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a cross-reference between drawings',
    description:
      'Creates a reference from this drawing to another drawing (e.g., "See A-501 for detail").',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiParam({
    name: 'drawingId',
    description: 'Source drawing ID (the one making the reference)',
  })
  @ApiResponse({
    status: 201,
    description: 'Cross-reference created successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Drawing not found',
  })
  async createCrossReference(
    @Param('projectId') projectId: string,
    @Param('drawingId') drawingId: string,
    @Body() dto: CreateCrossReferenceDto,
    @Request() req: any,
  ): Promise<DrawingCrossReference> {
    return this.drawingService.createCrossReference(
      projectId,
      drawingId,
      req.user.id,
      dto,
    );
  }

  /**
   * Get cross-references for a drawing
   */
  @Get(':drawingId/cross-references')
  @ApiOperation({
    summary: 'Get cross-references for a drawing',
    description:
      'Returns all cross-references (both outgoing and incoming) for a drawing.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiParam({
    name: 'drawingId',
    description: 'Drawing ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Cross-references retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Drawing not found',
  })
  async getCrossReferences(
    @Param('projectId') projectId: string,
    @Param('drawingId') drawingId: string,
  ): Promise<{
    outgoing: DrawingCrossReference[];
    incoming: DrawingCrossReference[];
  }> {
    return this.drawingService.getCrossReferences(projectId, drawingId);
  }

  /**
   * Delete a cross-reference
   */
  @Delete('cross-references/:crossReferenceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a cross-reference',
    description: 'Deletes a cross-reference between drawings.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiParam({
    name: 'crossReferenceId',
    description: 'Cross-reference ID',
  })
  @ApiResponse({
    status: 204,
    description: 'Cross-reference deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Cross-reference not found',
  })
  async deleteCrossReference(
    @Param('projectId') projectId: string,
    @Param('crossReferenceId') crossReferenceId: string,
  ): Promise<void> {
    return this.drawingService.deleteCrossReference(
      projectId,
      crossReferenceId,
    );
  }
}
