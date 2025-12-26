import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { LienWaiverService } from '../services/lien-waiver.service';
import {
  CreateLienWaiverDto,
  LienWaiverResponseDto,
} from '../dto';

/**
 * Lien Waiver Controller
 *
 * Handles HTTP requests for lien waiver management.
 * All endpoints require authentication and project access.
 *
 * Base URL: /api/v1/projects/:projectId/lien-waivers
 */
@ApiTags('Lien Waivers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/lien-waivers')
export class LienWaiverController {
  constructor(private readonly lienWaiverService: LienWaiverService) {}

  /**
   * Create a new lien waiver
   * POST /api/v1/projects/:projectId/lien-waivers
   */
  @Post()
  @ApiOperation({ summary: 'Create a new lien waiver' })
  @ApiResponse({
    status: 201,
    description: 'Lien waiver created successfully',
    type: LienWaiverResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input or waiver already exists' })
  @ApiResponse({ status: 404, description: 'Payment application not found' })
  async create(
    @Param('projectId') projectId: string,
    @Body() createDto: CreateLienWaiverDto,
    @CurrentUser('id') userId: string,
  ): Promise<LienWaiverResponseDto> {
    return this.lienWaiverService.create(projectId, createDto, userId);
  }

  /**
   * Get all lien waivers for a project
   * GET /api/v1/projects/:projectId/lien-waivers
   */
  @Get()
  @ApiOperation({ summary: 'Get all lien waivers for a project' })
  @ApiResponse({
    status: 200,
    description: 'Lien waivers retrieved successfully',
    type: [LienWaiverResponseDto],
  })
  async findAll(
    @Param('projectId') projectId: string,
  ): Promise<LienWaiverResponseDto[]> {
    return this.lienWaiverService.findAll(projectId);
  }

  /**
   * Get a lien waiver by ID
   * GET /api/v1/projects/:projectId/lien-waivers/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a lien waiver by ID' })
  @ApiResponse({
    status: 200,
    description: 'Lien waiver retrieved successfully',
    type: LienWaiverResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Lien waiver not found' })
  async findOne(
    @Param('projectId') projectId: string,
    @Param('id') lienWaiverId: string,
  ): Promise<LienWaiverResponseDto> {
    return this.lienWaiverService.findOne(projectId, lienWaiverId);
  }

  /**
   * Get lien waivers by payment application ID
   * GET /api/v1/projects/:projectId/lien-waivers/payment-application/:paymentApplicationId
   */
  @Get('payment-application/:paymentApplicationId')
  @ApiOperation({ summary: 'Get lien waivers by payment application ID' })
  @ApiResponse({
    status: 200,
    description: 'Lien waivers retrieved successfully',
    type: [LienWaiverResponseDto],
  })
  async findByPaymentApplication(
    @Param('projectId') projectId: string,
    @Param('paymentApplicationId') paymentApplicationId: string,
  ): Promise<LienWaiverResponseDto[]> {
    return this.lienWaiverService.findByPaymentApplication(
      projectId,
      paymentApplicationId,
    );
  }

  /**
   * Get lien waivers by commitment ID
   * GET /api/v1/projects/:projectId/lien-waivers/commitment/:commitmentId
   */
  @Get('commitment/:commitmentId')
  @ApiOperation({ summary: 'Get lien waivers by commitment ID' })
  @ApiResponse({
    status: 200,
    description: 'Lien waivers retrieved successfully',
    type: [LienWaiverResponseDto],
  })
  async findByCommitment(
    @Param('projectId') projectId: string,
    @Param('commitmentId') commitmentId: string,
  ): Promise<LienWaiverResponseDto[]> {
    return this.lienWaiverService.findByCommitment(projectId, commitmentId);
  }

  /**
   * Delete a lien waiver
   * DELETE /api/v1/projects/:projectId/lien-waivers/:id
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a lien waiver' })
  @ApiResponse({
    status: 200,
    description: 'Lien waiver deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Lien waiver not found' })
  async delete(
    @Param('projectId') projectId: string,
    @Param('id') lienWaiverId: string,
  ): Promise<void> {
    return this.lienWaiverService.delete(projectId, lienWaiverId);
  }
}
