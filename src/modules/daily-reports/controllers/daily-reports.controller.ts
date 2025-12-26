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
  Req,
  Res,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { Response, Request } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { DailyReportsService } from '../services/daily-reports.service';
import { WeatherService } from '../services/weather.service';
import { PdfService } from '../services/pdf.service';
import { CreateDailyReportDto } from '../dto/create-daily-report.dto';
import { UpdateDailyReportDto } from '../dto/update-daily-report.dto';
import { QueryDailyReportsDto } from '../dto/query-daily-reports.dto';
import { SubmitDailyReportDto } from '../dto/submit-daily-report.dto';
import { ReviewDailyReportDto } from '../dto/review-daily-report.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

/**
 * Daily Reports Controller
 * Handles all HTTP endpoints for daily construction reports
 */
@ApiTags('Daily Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('daily-reports')
export class DailyReportsController {
  constructor(
    private readonly dailyReportsService: DailyReportsService,
    private readonly weatherService: WeatherService,
    private readonly pdfService: PdfService,
  ) {}

  /**
   * Create a new daily report
   */
  @Post()
  @ApiOperation({ summary: 'Create a new daily report' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Daily report created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Report already exists for this date or validation failed',
  })
  async create(
    @Body() createDto: CreateDailyReportDto,
    @CurrentUser() user: any,
  ) {
    return this.dailyReportsService.create(createDto, user);
  }

  /**
   * Get all daily reports with filtering and pagination
   */
  @Get()
  @ApiOperation({ summary: 'Get all daily reports for a project' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reports retrieved successfully' })
  async findAll(@Query() query: QueryDailyReportsDto) {
    return this.dailyReportsService.findAll(query);
  }

  /**
   * Get a report by project and date
   */
  @Get('by-date')
  @ApiOperation({ summary: 'Get report by project and date' })
  @ApiQuery({ name: 'projectId', type: String })
  @ApiQuery({ name: 'date', type: String, description: 'Date in YYYY-MM-DD format' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Report found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'No report found for this date' })
  async findByDate(
    @Query('projectId', ParseUUIDPipe) projectId: string,
    @Query('date') date: string,
  ) {
    return this.dailyReportsService.findByDate(projectId, date);
  }

  /**
   * Get a single daily report by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a single daily report by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Report ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Report retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Report not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.dailyReportsService.findOne(id);
  }

  /**
   * Update a daily report
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a daily report' })
  @ApiParam({ name: 'id', type: String, description: 'Report ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Report updated successfully' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cannot edit an approved report',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateDailyReportDto,
    @CurrentUser() user: any,
  ) {
    return this.dailyReportsService.update(id, updateDto, user);
  }

  /**
   * Submit a report for approval
   */
  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit a daily report for approval' })
  @ApiParam({ name: 'id', type: String, description: 'Report ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Report submitted successfully' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Report validation failed or already submitted',
  })
  async submit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() submitDto: SubmitDailyReportDto,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return this.dailyReportsService.submit(id, submitDto, user, ip);
  }

  /**
   * Approve or reject a submitted report
   */
  @Post(':id/review')
  @ApiOperation({ summary: 'Approve or reject a submitted report' })
  @ApiParam({ name: 'id', type: String, description: 'Report ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Report reviewed successfully' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Only submitted reports can be reviewed',
  })
  async review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() reviewDto: ReviewDailyReportDto,
    @CurrentUser() user: any,
  ) {
    return this.dailyReportsService.review(id, reviewDto, user);
  }

  /**
   * Copy manpower and equipment from previous report
   */
  @Post('copy-from-previous')
  @ApiOperation({
    summary: 'Create a new report by copying data from the most recent previous report',
  })
  @ApiQuery({ name: 'projectId', type: String })
  @ApiQuery({ name: 'targetDate', type: String, description: 'Date for new report (YYYY-MM-DD)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Report created from previous' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'No previous report found' })
  async copyFromPrevious(
    @Query('projectId', ParseUUIDPipe) projectId: string,
    @Query('targetDate') targetDate: string,
    @CurrentUser() user: any,
  ) {
    return this.dailyReportsService.copyFromPrevious(projectId, targetDate, user);
  }

  /**
   * Fetch weather data for a project location and date
   */
  @Get('weather/:projectId')
  @ApiOperation({ summary: 'Fetch weather data from OpenWeatherMap API' })
  @ApiParam({ name: 'projectId', type: String, description: 'Project ID' })
  @ApiQuery({ name: 'date', type: String, description: 'Date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'lat', type: Number, description: 'Latitude' })
  @ApiQuery({ name: 'lon', type: Number, description: 'Longitude' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Weather data retrieved' })
  async fetchWeather(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('date') date: string,
    @Query('lat') lat: number,
    @Query('lon') lon: number,
  ) {
    // In a real implementation, you'd fetch project lat/lon from the project entity
    return this.weatherService.getWeatherData(
      Number(lat),
      Number(lon),
      date,
    );
  }

  /**
   * Generate and download PDF for a report
   */
  @Get(':id/pdf')
  @ApiOperation({ summary: 'Generate and download PDF for a daily report' })
  @ApiParam({ name: 'id', type: String, description: 'Report ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'PDF generated successfully',
    content: { 'application/pdf': {} },
  })
  async generatePdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const report = await this.dailyReportsService.findOne(id);
    const pdfBuffer = await this.pdfService.generateDailyReportPdf(report);

    const filename = `daily-report-${new Date(report.reportDate).toISOString().split('T')[0]}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });

    res.status(HttpStatus.OK).send(pdfBuffer);
  }

  /**
   * Soft delete a daily report
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a daily report' })
  @ApiParam({ name: 'id', type: String, description: 'Report ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Report deleted successfully' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cannot delete an approved report',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    await this.dailyReportsService.softDelete(id, user);
  }
}
