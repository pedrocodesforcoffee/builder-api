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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { BudgetService } from '../services/budget.service';
import { BudgetImportService } from '../services/budget-import.service';
import {
  CreateBudgetDto,
  UpdateBudgetDto,
  BudgetResponseDto,
  BudgetQueryDto,
  CloneBudgetDto,
  CreateSnapshotDto,
  SnapshotResponseDto,
  LockBudgetDto,
  UnlockBudgetDto,
  ActivateBudgetDto,
  BudgetSummaryDto,
  BudgetComparisonDto,
  VarianceAnalysisDto,
  ContingencyStatusDto,
  BudgetExportDto,
  BudgetImportDto,
  BudgetImportResultDto,
  BudgetSnapshotComparisonDto,
} from '../dto';

/**
 * Budget Controller
 *
 * Handles HTTP requests for budget management.
 * All endpoints require authentication and project access.
 *
 * Base URL: /api/projects/:projectId/budgets
 */
@ApiTags('Budgets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/budgets')
export class BudgetController {
  constructor(
    private readonly budgetService: BudgetService,
    private readonly importService: BudgetImportService,
  ) {}

  /**
   * Import budget from Excel or CSV file
   * POST /api/v1/projects/:projectId/budgets/import
   */
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import budget from Excel or CSV file' })
  @ApiResponse({
    status: 201,
    description: 'Budget imported successfully',
    type: BudgetImportResultDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file or data' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async importFromFile(
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() importDto: BudgetImportDto,
    @CurrentUser('id') userId: string,
  ): Promise<BudgetImportResultDto> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const fileExtension = file.originalname.split('.').pop()?.toLowerCase();

    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      return this.importService.importFromExcel(
        file.buffer,
        projectId,
        importDto.budgetName,
        userId,
      );
    } else if (fileExtension === 'csv') {
      return this.importService.importFromCSV(
        file.buffer,
        projectId,
        importDto.budgetName,
        userId,
      );
    } else {
      throw new BadRequestException(
        'Invalid file format. Only .xlsx, .xls, and .csv files are supported.',
      );
    }
  }

  /**
   * Create a new budget
   * POST /api/v1/projects/:projectId/budgets
   */
  @Post()
  @ApiOperation({ summary: 'Create a new budget' })
  @ApiResponse({
    status: 201,
    description: 'Budget created successfully',
    type: BudgetResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async create(
    @Param('projectId') projectId: string,
    @Body() createDto: CreateBudgetDto,
    @CurrentUser('id') userId: string,
  ): Promise<BudgetResponseDto> {
    // Ensure projectId matches the route parameter
    const dto = { ...createDto, projectId };
    return this.budgetService.create(dto, userId);
  }

  /**
   * Get all budgets for a project
   * GET /api/v1/projects/:projectId/budgets
   */
  @Get()
  @ApiOperation({ summary: 'Get all budgets for a project' })
  @ApiResponse({
    status: 200,
    description: 'Budgets retrieved successfully',
    type: [BudgetResponseDto],
  })
  async findAll(
    @Param('projectId') projectId: string,
    @Query() query: BudgetQueryDto,
  ): Promise<BudgetResponseDto[]> {
    return this.budgetService.findAllByProject(projectId, query);
  }

  /**
   * Get a budget by ID
   * GET /api/v1/projects/:projectId/budgets/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a budget by ID' })
  @ApiResponse({
    status: 200,
    description: 'Budget retrieved successfully',
    type: BudgetResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Budget not found' })
  async findOne(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ): Promise<BudgetResponseDto> {
    return this.budgetService.findOne(id, projectId);
  }

  /**
   * Update a budget
   * PUT /api/v1/projects/:projectId/budgets/:id
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a budget' })
  @ApiResponse({
    status: 200,
    description: 'Budget updated successfully',
    type: BudgetResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Budget not found' })
  async update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateBudgetDto,
    @CurrentUser('id') userId: string,
  ): Promise<BudgetResponseDto> {
    return this.budgetService.update(id, updateDto, userId, projectId);
  }

  /**
   * Delete a budget
   * DELETE /api/v1/projects/:projectId/budgets/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a budget' })
  @ApiResponse({ status: 204, description: 'Budget deleted successfully' })
  @ApiResponse({ status: 404, description: 'Budget not found' })
  async remove(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.budgetService.remove(id, projectId);
  }

  /**
   * Clone a budget
   * POST /api/v1/projects/:projectId/budgets/:id/clone
   */
  @Post(':id/clone')
  @ApiOperation({ summary: 'Clone an existing budget' })
  @ApiResponse({
    status: 201,
    description: 'Budget cloned successfully',
    type: BudgetResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Budget not found' })
  async clone(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() cloneDto: CloneBudgetDto,
    @CurrentUser('id') userId: string,
  ): Promise<BudgetResponseDto> {
    return this.budgetService.clone(id, cloneDto, userId, projectId);
  }

  /**
   * Lock a budget
   * POST /api/v1/projects/:projectId/budgets/:id/lock
   */
  @Post(':id/lock')
  @ApiOperation({ summary: 'Lock a budget' })
  @ApiResponse({
    status: 200,
    description: 'Budget locked successfully',
    type: BudgetResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Budget not found' })
  @ApiResponse({ status: 409, description: 'Budget already locked' })
  async lock(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() lockDto: LockBudgetDto,
    @CurrentUser('id') userId: string,
  ): Promise<BudgetResponseDto> {
    return this.budgetService.lock(id, lockDto, userId, projectId);
  }

  /**
   * Unlock a budget
   * POST /api/v1/projects/:projectId/budgets/:id/unlock
   */
  @Post(':id/unlock')
  @ApiOperation({ summary: 'Unlock a budget' })
  @ApiResponse({
    status: 200,
    description: 'Budget unlocked successfully',
    type: BudgetResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Budget not found' })
  async unlock(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() unlockDto: UnlockBudgetDto,
    @CurrentUser('id') userId: string,
  ): Promise<BudgetResponseDto> {
    return this.budgetService.unlock(id, unlockDto, userId, projectId);
  }

  /**
   * Activate a budget
   * POST /api/v1/projects/:projectId/budgets/:id/activate
   */
  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate a budget' })
  @ApiResponse({
    status: 200,
    description: 'Budget activated successfully',
    type: BudgetResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Budget not found' })
  async activate(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() activateDto: ActivateBudgetDto,
    @CurrentUser('id') userId: string,
  ): Promise<BudgetResponseDto> {
    return this.budgetService.activate(id, activateDto, userId, projectId);
  }

  /**
   * Archive a budget
   * POST /api/v1/projects/:projectId/budgets/:id/archive
   */
  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive a budget' })
  @ApiResponse({
    status: 200,
    description: 'Budget archived successfully',
    type: BudgetResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Budget not found' })
  async archive(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<BudgetResponseDto> {
    return this.budgetService.archive(id, userId, projectId);
  }

  /**
   * Create a budget snapshot
   * POST /api/v1/projects/:projectId/budgets/:id/snapshots
   */
  @Post(':id/snapshots')
  @ApiOperation({ summary: 'Create a budget snapshot' })
  @ApiResponse({
    status: 201,
    description: 'Snapshot created successfully',
    type: SnapshotResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Budget not found' })
  async createSnapshot(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() snapshotDto: CreateSnapshotDto,
    @CurrentUser('id') userId: string,
  ): Promise<SnapshotResponseDto> {
    return this.budgetService.createSnapshot(id, snapshotDto, userId, projectId);
  }

  /**
   * Get all snapshots for a budget
   * GET /api/v1/projects/:projectId/budgets/:id/snapshots
   */
  @Get(':id/snapshots')
  @ApiOperation({ summary: 'Get all snapshots for a budget' })
  @ApiResponse({
    status: 200,
    description: 'Snapshots retrieved successfully',
    type: [SnapshotResponseDto],
  })
  async getSnapshots(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ): Promise<SnapshotResponseDto[]> {
    return this.budgetService.getSnapshots(id, projectId);
  }

  /**
   * Get a specific snapshot
   * GET /api/v1/projects/:projectId/budgets/:id/snapshots/:snapshotId
   */
  @Get(':id/snapshots/:snapshotId')
  @ApiOperation({ summary: 'Get a specific snapshot' })
  @ApiResponse({
    status: 200,
    description: 'Snapshot retrieved successfully',
    type: SnapshotResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Snapshot not found' })
  async getSnapshot(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Param('snapshotId') snapshotId: string,
  ): Promise<SnapshotResponseDto> {
    return this.budgetService.getSnapshot(id, snapshotId, projectId);
  }

  /**
   * Get budget summary
   * GET /api/v1/projects/:projectId/budgets/:id/summary
   */
  @Get(':id/summary')
  @ApiOperation({ summary: 'Get budget summary' })
  @ApiResponse({
    status: 200,
    description: 'Budget summary retrieved successfully',
    type: BudgetSummaryDto,
  })
  @ApiResponse({ status: 404, description: 'Budget not found' })
  async getSummary(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ): Promise<BudgetSummaryDto> {
    return this.budgetService.getSummary(id, projectId);
  }

  /**
   * Compare two budgets
   * GET /api/v1/projects/:projectId/budgets/:id/compare/:compareBudgetId
   */
  @Get(':id/compare/:compareBudgetId')
  @ApiOperation({ summary: 'Compare two budgets' })
  @ApiResponse({
    status: 200,
    description: 'Budget comparison retrieved successfully',
    type: BudgetComparisonDto,
  })
  @ApiResponse({ status: 404, description: 'Budget not found' })
  async compare(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Param('compareBudgetId') compareBudgetId: string,
  ): Promise<BudgetComparisonDto> {
    return this.budgetService.compare(id, compareBudgetId, projectId);
  }

  /**
   * Compare snapshot to current budget
   * GET /api/v1/projects/:projectId/budgets/:id/compare-snapshot/:snapshotId
   */
  @Get(':id/compare-snapshot/:snapshotId')
  @ApiOperation({
    summary: 'Compare budget snapshot to current budget',
    description:
      'Compares a historical snapshot to the current budget state, providing detailed line-by-line variance analysis',
  })
  @ApiResponse({
    status: 200,
    description: 'Snapshot comparison retrieved successfully',
    type: BudgetSnapshotComparisonDto,
  })
  @ApiResponse({ status: 404, description: 'Budget or snapshot not found' })
  async compareToSnapshot(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Param('snapshotId') snapshotId: string,
  ): Promise<BudgetSnapshotComparisonDto> {
    return this.budgetService.compareToSnapshot(id, snapshotId, projectId);
  }

  /**
   * Get variance analysis
   * GET /api/v1/projects/:projectId/budgets/:id/variance
   */
  @Get(':id/variance')
  @ApiOperation({ summary: 'Get variance analysis' })
  @ApiResponse({
    status: 200,
    description: 'Variance analysis retrieved successfully',
    type: VarianceAnalysisDto,
  })
  @ApiResponse({ status: 404, description: 'Budget not found' })
  async getVarianceAnalysis(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ): Promise<VarianceAnalysisDto> {
    return this.budgetService.getVarianceAnalysis(id, projectId);
  }

  /**
   * Get contingency status
   * GET /api/v1/projects/:projectId/budgets/:id/contingency
   */
  @Get(':id/contingency')
  @ApiOperation({ summary: 'Get contingency status' })
  @ApiResponse({
    status: 200,
    description: 'Contingency status retrieved successfully',
    type: ContingencyStatusDto,
  })
  @ApiResponse({ status: 404, description: 'Budget not found' })
  async getContingencyStatus(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ): Promise<ContingencyStatusDto> {
    return this.budgetService.getContingencyStatus(id, projectId);
  }

  /**
   * Export budget
   * GET /api/v1/projects/:projectId/budgets/:id/export
   */
  @Get(':id/export')
  @ApiOperation({ summary: 'Export budget to Excel or CSV' })
  @ApiResponse({
    status: 200,
    description: 'Budget exported successfully',
  })
  @ApiResponse({ status: 404, description: 'Budget not found' })
  async export(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Query() exportDto: BudgetExportDto,
  ): Promise<Buffer> {
    return this.budgetService.export(id, exportDto, projectId);
  }
}
