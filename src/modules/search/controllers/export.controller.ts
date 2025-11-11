import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  Res,
  StreamableFile,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProjectExportService } from '../services/project-export.service';
import { ExportRequestDto } from '../dto/export-request.dto';
import { ExportJob } from '../entities/export-job.entity';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Export Controller
 *
 * Handles export requests for search results
 */
@Controller('api/projects/search/export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private readonly exportService: ProjectExportService) {}

  /**
   * Create an export job
   */
  @Post()
  async exportSearch(
    @Body() dto: ExportRequestDto,
    @Req() req: Request,
  ): Promise<ExportJob> {
    const userId = (req as any).user?.sub || (req as any).user?.id;
    const organizationId = (req as any).user?.organizationId;

    return this.exportService.exportSearch(
      dto.criteria,
      dto.format,
      {
        columns: dto.columns,
        includeCustomFields: dto.includeCustomFields,
        maxRecords: dto.maxRecords,
      },
      userId,
      organizationId,
    );
  }

  /**
   * Get export job status
   */
  @Get(':id')
  async getExportJob(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<ExportJob> {
    const userId = (req as any).user?.sub || (req as any).user?.id;

    return this.exportService.getExportJob(id, userId);
  }

  /**
   * Download exported file
   */
  @Get(':id/download')
  async downloadExport(
    @Param('id') id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const userId = (req as any).user?.sub || (req as any).user?.id;

    // Get export job
    const job = await this.exportService.getExportJob(id, userId);

    if (!job || !job.downloadUrl) {
      throw new NotFoundException('Export file not found');
    }

    // Get file path
    const filePath = await this.exportService.getExportFilePath(id);

    if (!filePath || !fs.existsSync(filePath)) {
      throw new NotFoundException('Export file not found');
    }

    // Set headers based on format
    const fileName = path.basename(filePath);
    const mimeTypes: Record<string, string> = {
      csv: 'text/csv',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      json: 'application/json',
      pdf: 'application/pdf',
    };

    const extension = path.extname(fileName).slice(1);
    const mimeType = mimeTypes[extension] || 'application/octet-stream';

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });

    // Stream file
    const fileStream = fs.createReadStream(filePath);
    return new StreamableFile(fileStream);
  }
}