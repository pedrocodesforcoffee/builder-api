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
import { PotentialChangeOrderService } from '../services/potential-change-order.service';
import {
  CreatePotentialChangeOrderDto,
  UpdatePotentialChangeOrderDto,
  PotentialChangeOrderResponseDto,
  ConvertPcoToOcoDto,
  SubmitPcoDto,
  ApprovePcoDto,
  RejectPcoDto,
} from '../dto';
import { PcoStatus } from '../enums/pco-status.enum';

/**
 * Potential Change Order Controller
 *
 * Handles HTTP requests for PCO management.
 * Base URL: /api/v1/projects/:projectId/pcos
 */
@ApiTags('Potential Change Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/pcos')
export class PotentialChangeOrderController {
  constructor(private readonly pcoService: PotentialChangeOrderService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new PCO' })
  @ApiResponse({ status: 201, description: 'PCO created successfully' })
  async create(
    @Param('projectId') projectId: string,
    @Body() createDto: CreatePotentialChangeOrderDto,
    @CurrentUser('id') userId: string,
  ): Promise<PotentialChangeOrderResponseDto> {
    const dto = { ...createDto, projectId, createdById: userId };
    return this.pcoService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all PCOs for a project' })
  @ApiResponse({ status: 200, description: 'PCOs retrieved successfully' })
  async findAll(
    @Param('projectId') projectId: string,
    @Query('status') status?: PcoStatus,
  ): Promise<PotentialChangeOrderResponseDto[]> {
    return this.pcoService.findAll(projectId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a PCO by ID' })
  @ApiResponse({ status: 200, description: 'PCO retrieved successfully' })
  @ApiResponse({ status: 404, description: 'PCO not found' })
  async findOne(
    @Param('id') id: string,
  ): Promise<PotentialChangeOrderResponseDto> {
    return this.pcoService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a PCO' })
  @ApiResponse({ status: 200, description: 'PCO updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePotentialChangeOrderDto,
  ): Promise<PotentialChangeOrderResponseDto> {
    return this.pcoService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a PCO' })
  @ApiResponse({ status: 204, description: 'PCO deleted successfully' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.pcoService.remove(id);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit PCO for review' })
  @ApiResponse({ status: 200, description: 'PCO submitted successfully' })
  async submit(
    @Param('id') id: string,
    @Body() submitDto: SubmitPcoDto,
    @CurrentUser('id') userId: string,
  ): Promise<PotentialChangeOrderResponseDto> {
    return this.pcoService.submit(id, userId);
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Mark PCO as under review' })
  @ApiResponse({ status: 200, description: 'PCO marked as under review' })
  async markUnderReview(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<PotentialChangeOrderResponseDto> {
    return this.pcoService.markUnderReview(id, userId);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a PCO' })
  @ApiResponse({ status: 200, description: 'PCO approved successfully' })
  async approve(
    @Param('id') id: string,
    @Body() approveDto: ApprovePcoDto,
    @CurrentUser('id') userId: string,
  ): Promise<PotentialChangeOrderResponseDto> {
    return this.pcoService.approve(id, userId);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a PCO' })
  @ApiResponse({ status: 200, description: 'PCO rejected successfully' })
  async reject(
    @Param('id') id: string,
    @Body() rejectDto: RejectPcoDto,
    @CurrentUser('id') userId: string,
  ): Promise<PotentialChangeOrderResponseDto> {
    return this.pcoService.reject(id, userId, rejectDto.reason);
  }

  @Post(':id/convert-to-oco')
  @ApiOperation({ summary: 'Convert PCO to OCO' })
  @ApiResponse({ status: 201, description: 'PCO converted to OCO successfully' })
  async convertToOco(
    @Param('id') id: string,
    @Body() convertDto: ConvertPcoToOcoDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.pcoService.convertToOco(id, convertDto, userId);
  }

  @Post(':id/recalculate')
  @ApiOperation({ summary: 'Recalculate PCO totals from cost tiers' })
  @ApiResponse({ status: 200, description: 'PCO totals recalculated' })
  async recalculateTotals(
    @Param('id') id: string,
  ): Promise<PotentialChangeOrderResponseDto> {
    return this.pcoService.recalculateTotals(id);
  }
}
