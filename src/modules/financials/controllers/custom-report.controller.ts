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
  StreamableFile,
  Header,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiProduces,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CustomReportService } from '../services/custom-report.service';
import {
  CreateCustomReportDto,
  UpdateCustomReportDto,
  CustomReportQueryDto,
  CustomReportParamsDto,
  CustomReportResponseDto,
  CustomReportResultDto,
} from '../dto/custom-report';

/**
 * Custom Report Controller
 *
 * REST API endpoints for managing and executing custom reports.
 *
 * Features:
 * - Create, read, update, delete custom reports
 * - Execute custom reports with runtime parameters
 * - Export to Excel and PDF formats
 * - Public vs private report sharing
 * - Project-scoped access control
 *
 * Base Route: /api/v1/projects/:projectId/reports/custom
 */
@ApiTags('Custom Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/reports/custom')
export class CustomReportController {
  private readonly logger = new Logger(CustomReportController.name);

  constructor(private readonly customReportService: CustomReportService) {}

  /**
   * Create Custom Report
   *
   * Creates a new custom report with specified configuration.
   * Reports can be private (creator only) or public (all project members).
   *
   * POST /api/v1/projects/:projectId/reports/custom
   */
  @Post()
  @ApiOperation({ summary: 'Create a new custom report' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: 201,
    description: 'Custom report created successfully',
    type: CustomReportResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid configuration' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateCustomReportDto,
    @CurrentUser() user: any,
  ): Promise<CustomReportResponseDto> {
    this.logger.log(
      `User ${user.id} creating custom report '${dto.name}' for project ${projectId}`,
    );

    const report = await this.customReportService.create(projectId, dto, user.id);

    this.logger.log(`Custom report created: ${report.id}`);
    return report as CustomReportResponseDto;
  }

  /**
   * List Custom Reports
   *
   * Retrieves all custom reports accessible to the current user.
   * Includes public reports and user's private reports.
   *
   * GET /api/v1/projects/:projectId/reports/custom
   */
  @Get()
  @ApiOperation({ summary: 'List all custom reports for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'List of custom reports with count',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/CustomReportResponseDto' },
        },
        total: { type: 'number', example: 15 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findAll(
    @Param('projectId') projectId: string,
    @Query() query: CustomReportQueryDto,
    @CurrentUser() user: any,
  ): Promise<{ data: CustomReportResponseDto[]; total: number }> {
    this.logger.log(`User ${user.id} listing custom reports for project ${projectId}`);

    const [reports, total] = await this.customReportService.findAll(
      projectId,
      query,
      user.id,
    );

    return {
      data: reports as CustomReportResponseDto[],
      total,
    };
  }

  /**
   * Get Custom Report
   *
   * Retrieves a specific custom report by ID.
   *
   * GET /api/v1/projects/:projectId/reports/custom/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific custom report' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Custom report ID' })
  @ApiResponse({
    status: 200,
    description: 'Custom report details',
    type: CustomReportResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Custom report not found' })
  async findOne(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ): Promise<CustomReportResponseDto> {
    this.logger.log(`Getting custom report ${id} for project ${projectId}`);

    const report = await this.customReportService.findOne(id, projectId);
    return report as CustomReportResponseDto;
  }

  /**
   * Update Custom Report
   *
   * Updates an existing custom report.
   * Configuration changes are validated before saving.
   *
   * PUT /api/v1/projects/:projectId/reports/custom/:id
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a custom report' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Custom report ID' })
  @ApiResponse({
    status: 200,
    description: 'Custom report updated successfully',
    type: CustomReportResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid configuration' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Custom report not found' })
  async update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomReportDto,
  ): Promise<CustomReportResponseDto> {
    this.logger.log(`Updating custom report ${id} for project ${projectId}`);

    const report = await this.customReportService.update(id, projectId, dto);

    this.logger.log(`Custom report updated: ${report.id}`);
    return report as CustomReportResponseDto;
  }

  /**
   * Delete Custom Report
   *
   * Deletes a custom report permanently.
   *
   * DELETE /api/v1/projects/:projectId/reports/custom/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a custom report' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Custom report ID' })
  @ApiResponse({ status: 204, description: 'Custom report deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Custom report not found' })
  async delete(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ): Promise<void> {
    this.logger.log(`Deleting custom report ${id} for project ${projectId}`);

    await this.customReportService.delete(id, projectId);
    this.logger.log(`Custom report deleted: ${id}`);
  }

  /**
   * Run Custom Report
   *
   * Executes a custom report and returns the results as JSON.
   * Runtime parameters can be provided for parameterized filters.
   *
   * GET /api/v1/projects/:projectId/reports/custom/:id/run
   */
  @Get(':id/run')
  @ApiOperation({ summary: 'Execute a custom report and return results' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Custom report ID' })
  @ApiResponse({
    status: 200,
    description: 'Custom report execution results',
    type: CustomReportResultDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid parameters or execution error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Custom report not found' })
  async run(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Query() params: CustomReportParamsDto,
  ): Promise<CustomReportResultDto> {
    this.logger.log(`Executing custom report ${id} for project ${projectId}`);

    const result = await this.customReportService.run(id, projectId, params);

    this.logger.log(
      `Custom report ${id} executed successfully: ${result.reportInfo.rowCount} rows, ${result.reportInfo.executionTimeMs}ms`,
    );

    return result;
  }

  /**
   * Export Custom Report to Excel
   *
   * Executes a custom report and exports the results to Excel format.
   *
   * GET /api/v1/projects/:projectId/reports/custom/:id/export/excel
   */
  @Get(':id/export/excel')
  @ApiOperation({ summary: 'Export custom report to Excel' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Custom report ID' })
  @ApiResponse({
    status: 200,
    description: 'Excel file generated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid parameters or execution error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Custom report not found' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportExcel(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Query() params: CustomReportParamsDto,
  ): Promise<StreamableFile> {
    this.logger.log(`Exporting custom report ${id} to Excel for project ${projectId}`);

    const buffer = await this.customReportService.exportToExcel(id, projectId, params);
    const filename = `custom-report-${id}-${Date.now()}.xlsx`;

    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  /**
   * Export Custom Report to PDF
   *
   * Executes a custom report and exports the results to PDF format.
   *
   * GET /api/v1/projects/:projectId/reports/custom/:id/export/pdf
   */
  @Get(':id/export/pdf')
  @ApiOperation({ summary: 'Export custom report to PDF' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Custom report ID' })
  @ApiResponse({
    status: 200,
    description: 'PDF file generated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid parameters or execution error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Custom report not found' })
  @ApiProduces('application/pdf')
  @Header('Content-Type', 'application/pdf')
  async exportPdf(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Query() params: CustomReportParamsDto,
  ): Promise<StreamableFile> {
    this.logger.log(`Exporting custom report ${id} to PDF for project ${projectId}`);

    const buffer = await this.customReportService.exportToPdf(id, projectId, params);
    const filename = `custom-report-${id}-${new Date().toISOString().split('T')[0]}.pdf`;

    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
    });
  }
}
