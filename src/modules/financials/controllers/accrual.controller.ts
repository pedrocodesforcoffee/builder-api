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
import { AccrualService } from '../services/accrual.service';
import {
  CreateAccrualDto,
  UpdateAccrualDto,
  AccrualResponseDto,
  AccrualFilterDto,
  ReverseAccrualDto,
  ConvertAccrualDto,
} from '../dto';

/**
 * Accrual Controller
 *
 * Handles HTTP requests for accrual management.
 * All endpoints require authentication and project access.
 *
 * Base URL: /api/v1/projects/:projectId/accruals
 */
@ApiTags('Accruals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/accruals')
export class AccrualController {
  constructor(private readonly accrualService: AccrualService) {}

  /**
   * Create a new accrual
   * POST /api/v1/projects/:projectId/accruals
   */
  @Post()
  @ApiOperation({ summary: 'Create a new accrual' })
  @ApiResponse({
    status: 201,
    description: 'Accrual created successfully',
    type: AccrualResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async create(
    @Param('projectId') projectId: string,
    @Body() createDto: CreateAccrualDto,
    @CurrentUser('id') userId: string,
  ): Promise<AccrualResponseDto> {
    const dto = { ...createDto, projectId };
    return this.accrualService.create(dto, userId);
  }

  /**
   * Get all accruals for a project
   * GET /api/v1/projects/:projectId/accruals
   */
  @Get()
  @ApiOperation({ summary: 'Get all accruals with filtering' })
  @ApiResponse({
    status: 200,
    description: 'Accruals retrieved successfully',
    type: [AccrualResponseDto],
  })
  async findAll(
    @Param('projectId') projectId: string,
    @Query() filter: AccrualFilterDto,
  ) {
    return this.accrualService.findAll(filter);
  }

  /**
   * Get an accrual by ID
   * GET /api/v1/projects/:projectId/accruals/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get an accrual by ID' })
  @ApiResponse({
    status: 200,
    description: 'Accrual retrieved successfully',
    type: AccrualResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Accrual not found' })
  async findOne(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ): Promise<AccrualResponseDto> {
    return this.accrualService.findOne(id);
  }

  /**
   * Update an accrual
   * PUT /api/v1/projects/:projectId/accruals/:id
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update an accrual' })
  @ApiResponse({
    status: 200,
    description: 'Accrual updated successfully',
    type: AccrualResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Accrual not found' })
  async update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateAccrualDto,
    @CurrentUser('id') userId: string,
  ): Promise<AccrualResponseDto> {
    return this.accrualService.update(id, updateDto, userId);
  }

  /**
   * Delete an accrual
   * DELETE /api/v1/projects/:projectId/accruals/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an accrual' })
  @ApiResponse({ status: 204, description: 'Accrual deleted successfully' })
  @ApiResponse({ status: 404, description: 'Accrual not found' })
  async remove(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.accrualService.remove(id, userId);
  }

  /**
   * Reverse an accrual
   * POST /api/v1/projects/:projectId/accruals/:id/reverse
   */
  @Post(':id/reverse')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reverse an accrual' })
  @ApiResponse({
    status: 200,
    description: 'Accrual reversed successfully',
    type: AccrualResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Accrual not found' })
  async reverse(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() reverseDto: ReverseAccrualDto,
    @CurrentUser('id') userId: string,
  ): Promise<AccrualResponseDto> {
    return this.accrualService.reverse(id, reverseDto, userId);
  }

  /**
   * Convert an accrual to actual cost
   * POST /api/v1/projects/:projectId/accruals/:id/convert
   */
  @Post(':id/convert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Convert an accrual to actual cost' })
  @ApiResponse({
    status: 200,
    description: 'Accrual converted successfully',
    type: AccrualResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Accrual not found' })
  async convert(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() convertDto: ConvertAccrualDto,
    @CurrentUser('id') userId: string,
  ): Promise<AccrualResponseDto> {
    return this.accrualService.convert(id, convertDto, userId);
  }
}
