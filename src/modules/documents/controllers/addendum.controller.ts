import {
  Controller,
  Get,
  Post,
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
import { AddendumService } from '../services/addendum.service';
import {
  CreateAddendumDto,
  AddendumResponseDto,
  ListAddendaQuery,
} from '../dto/specification-management.dto';

/**
 * Addendum Controller
 *
 * Handles REST API endpoints for addendum management.
 * Addenda are post-issuance changes to specifications.
 */
@ApiTags('Addenda')
@ApiBearerAuth()
@Controller('projects/:projectId/addenda')
export class AddendumController {
  constructor(private readonly addendumService: AddendumService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create an addendum',
    description: 'Create a new addendum that modifies specifications',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'Addendum created successfully' })
  async create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateAddendumDto,
  ): Promise<AddendumResponseDto> {
    // TODO: Get user ID from auth context
    const userId = 'temp-user-id';
    return this.addendumService.create(projectId, dto, userId);
  }

  @Get()
  @ApiOperation({
    summary: 'List addenda',
    description: 'Get all addenda for a project with filtering',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  async findAll(
    @Param('projectId') projectId: string,
    @Query() query: ListAddendaQuery,
  ) {
    return this.addendumService.findAll(projectId, query);
  }

  @Get(':addendumId')
  @ApiOperation({
    summary: 'Get an addendum',
    description: 'Get details of a single addendum',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'addendumId', description: 'Addendum ID' })
  async findOne(
    @Param('projectId') projectId: string,
    @Param('addendumId') addendumId: string,
  ): Promise<AddendumResponseDto> {
    return this.addendumService.findOne(projectId, addendumId);
  }

  @Get('specifications/:specId/history')
  @ApiOperation({
    summary: 'Get addendum history for a specification',
    description: 'Get all addenda that have affected a specific specification',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'specId', description: 'Specification ID' })
  async getSpecificationHistory(
    @Param('projectId') projectId: string,
    @Param('specId') specId: string,
  ) {
    return this.addendumService.getSpecificationHistory(projectId, specId);
  }

  @Delete(':addendumId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete an addendum',
    description: 'Remove an addendum (soft delete)',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'addendumId', description: 'Addendum ID' })
  async delete(
    @Param('projectId') projectId: string,
    @Param('addendumId') addendumId: string,
  ): Promise<void> {
    return this.addendumService.delete(projectId, addendumId);
  }
}
