import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SpecificationService } from '../services/specification.service';
import {
  CreateSpecificationDto,
  UpdateSpecificationDto,
  ListSpecificationsQuery,
  LinkDrawingDto,
  LinkRfiDto,
  AddProductDto,
  SpecificationResponseDto,
} from '../dto/specification-management.dto';

/**
 * Specification Controller
 *
 * Handles REST API endpoints for specification management.
 * Provides CRUD operations and linking functionality.
 */
@ApiTags('Specifications')
@ApiBearerAuth()
@Controller('projects/:projectId/specifications')
export class SpecificationController {
  constructor(private readonly specificationService: SpecificationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a specification section',
    description: 'Create a new CSI MasterFormat specification section',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'Specification created successfully' })
  async create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateSpecificationDto,
  ): Promise<SpecificationResponseDto> {
    // TODO: Get user ID from auth context
    const userId = 'temp-user-id';
    return this.specificationService.create(projectId, dto, userId);
  }

  @Get()
  @ApiOperation({
    summary: 'List specifications',
    description: 'Get all specifications for a project with filtering',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  async findAll(
    @Param('projectId') projectId: string,
    @Query() query: ListSpecificationsQuery,
  ) {
    return this.specificationService.findAll(projectId, query);
  }

  @Get(':specId')
  @ApiOperation({
    summary: 'Get a specification',
    description: 'Get details of a single specification section',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'specId', description: 'Specification ID' })
  async findOne(
    @Param('projectId') projectId: string,
    @Param('specId') specId: string,
  ): Promise<SpecificationResponseDto> {
    return this.specificationService.findOne(projectId, specId);
  }

  @Put(':specId')
  @ApiOperation({
    summary: 'Update a specification',
    description: 'Update specification section details',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'specId', description: 'Specification ID' })
  async update(
    @Param('projectId') projectId: string,
    @Param('specId') specId: string,
    @Body() dto: UpdateSpecificationDto,
  ): Promise<SpecificationResponseDto> {
    return this.specificationService.update(projectId, specId, dto);
  }

  @Delete(':specId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a specification',
    description: 'Remove a specification section',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'specId', description: 'Specification ID' })
  async delete(
    @Param('projectId') projectId: string,
    @Param('specId') specId: string,
  ): Promise<void> {
    return this.specificationService.delete(projectId, specId);
  }

  @Post(':specId/products')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add a product reference',
    description: 'Add a product/manufacturer reference to a specification',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'specId', description: 'Specification ID' })
  async addProduct(
    @Param('projectId') projectId: string,
    @Param('specId') specId: string,
    @Body() dto: AddProductDto,
  ): Promise<void> {
    return this.specificationService.addProduct(projectId, specId, dto);
  }

  @Post(':specId/link-drawing')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Link a drawing',
    description: 'Link a drawing to a specification section',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'specId', description: 'Specification ID' })
  async linkDrawing(
    @Param('projectId') projectId: string,
    @Param('specId') specId: string,
    @Body() dto: LinkDrawingDto,
  ): Promise<void> {
    // TODO: Get user ID from auth context
    const userId = 'temp-user-id';
    return this.specificationService.linkDrawing(projectId, specId, dto, userId);
  }

  @Post(':specId/link-rfi')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Link an RFI',
    description: 'Link an RFI to a specification section',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'specId', description: 'Specification ID' })
  async linkRfi(
    @Param('projectId') projectId: string,
    @Param('specId') specId: string,
    @Body() dto: LinkRfiDto,
  ): Promise<void> {
    // TODO: Get user ID from auth context
    const userId = 'temp-user-id';
    return this.specificationService.linkRfi(projectId, specId, dto, userId);
  }
}
