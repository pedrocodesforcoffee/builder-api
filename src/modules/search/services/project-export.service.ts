import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExportJob } from '../entities/export-job.entity';
import { ExportFormat } from '../enums/export-format.enum';
import { ExportStatus } from '../enums/export-status.enum';
import { ProjectSearchService } from './project-search.service';
import { Project } from '../../projects/entities/project.entity';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Project Export Service
 *
 * Handles exporting search results in various formats
 */
@Injectable()
export class ProjectExportService {
  private readonly logger = new Logger(ProjectExportService.name);
  private readonly exportDir = path.join(process.cwd(), 'exports');

  constructor(
    @InjectRepository(ExportJob)
    private readonly exportJobRepository: Repository<ExportJob>,
    private readonly projectSearchService: ProjectSearchService,
  ) {
    // Ensure export directory exists
    this.ensureExportDirectory();
  }

  /**
   * Create and queue an export job
   */
  async exportSearch(
    criteria: Record<string, any>,
    format: ExportFormat,
    options: {
      columns: string[];
      includeCustomFields?: boolean;
      maxRecords?: number;
    },
    userId: string,
    organizationId: string,
  ): Promise<ExportJob> {
    // Create export job
    const exportJob = this.exportJobRepository.create({
      userId,
      organizationId,
      format,
      criteria,
      columns: options.columns,
      includeCustomFields: options.includeCustomFields || false,
      maxRecords: options.maxRecords || 10000,
      status: ExportStatus.PENDING,
      estimatedCompletion: new Date(Date.now() + 60000), // 1 minute estimate
    });

    await this.exportJobRepository.save(exportJob);

    // If small export (< 1000 records), process immediately
    // Otherwise, it will be picked up by the background job
    if (options.maxRecords && options.maxRecords <= 1000) {
      setImmediate(() => this.processExport(exportJob.id));
    }

    return exportJob;
  }

  /**
   * Process an export job
   */
  async processExport(jobId: string): Promise<ExportJob> {
    const job = await this.exportJobRepository.findOne({ where: { id: jobId } });

    if (!job) {
      throw new Error(`Export job ${jobId} not found`);
    }

    try {
      // Update status to processing
      job.status = ExportStatus.PROCESSING;
      await this.exportJobRepository.save(job);

      // Get all results
      const results = await this.projectSearchService.searchAll(
        job.criteria,
        job.maxRecords,
      );

      // Generate file based on format
      let fileBuffer: Buffer;
      let fileExtension: string;

      switch (job.format) {
        case ExportFormat.CSV:
          fileBuffer = await this.generateCSV(results, job);
          fileExtension = 'csv';
          break;
        case ExportFormat.XLSX:
          fileBuffer = await this.generateExcel(results, job);
          fileExtension = 'xlsx';
          break;
        case ExportFormat.JSON:
          fileBuffer = await this.generateJSON(results, job);
          fileExtension = 'json';
          break;
        case ExportFormat.PDF:
          fileBuffer = await this.generatePDF(results, job);
          fileExtension = 'pdf';
          break;
        default:
          throw new Error(`Unsupported export format: ${job.format}`);
      }

      // Save file
      const fileName = `export_${jobId}.${fileExtension}`;
      const filePath = path.join(this.exportDir, fileName);
      await fs.writeFile(filePath, fileBuffer);

      // Update job with results
      job.status = ExportStatus.COMPLETED;
      job.recordCount = results.length;
      job.fileSize = fileBuffer.length;
      job.downloadUrl = `/api/projects/search/export/${jobId}/download`;
      job.completedAt = new Date();
      job.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await this.exportJobRepository.save(job);

      return job;
    } catch (error) {
      this.logger.error(`Export job ${jobId} failed: ${(error as Error).message}`, (error as Error).stack);

      job.status = ExportStatus.FAILED;
      job.error = (error as Error).message;
      await this.exportJobRepository.save(job);

      throw error;
    }
  }

  /**
   * Generate CSV export
   */
  async generateCSV(
    results: Project[],
    options: ExportJob,
  ): Promise<Buffer> {
    const rows: string[] = [];

    // Header row
    rows.push(options.columns.join(','));

    // Data rows
    for (const project of results) {
      const row = options.columns.map(column => {
        let value = this.getNestedProperty(project, column);

        // Handle special formatting
        if (value === null || value === undefined) {
          return '';
        }
        if (typeof value === 'object') {
          value = JSON.stringify(value);
        }
        // Escape CSV values
        if (String(value).includes(',') || String(value).includes('"')) {
          return `"${String(value).replace(/"/g, '""')}"`;
        }
        return String(value);
      });

      rows.push(row.join(','));
    }

    return Buffer.from(rows.join('\n'), 'utf-8');
  }

  /**
   * Generate Excel export
   */
  async generateExcel(
    results: Project[],
    options: ExportJob,
  ): Promise<Buffer> {
    // For now, return CSV format as Excel can open it
    // In production, use a library like 'exceljs'
    return this.generateCSV(results, options);
  }

  /**
   * Generate JSON export
   */
  async generateJSON(
    results: Project[],
    options: ExportJob,
  ): Promise<Buffer> {
    const exportData = results.map(project => {
      const item: any = {};

      for (const column of options.columns) {
        item[column] = this.getNestedProperty(project, column);
      }

      if (options.includeCustomFields && project.customFields) {
        item.customFields = project.customFields;
      }

      return item;
    });

    return Buffer.from(JSON.stringify(exportData, null, 2), 'utf-8');
  }

  /**
   * Generate PDF export
   */
  async generatePDF(
    results: Project[],
    options: ExportJob,
  ): Promise<Buffer> {
    // For now, return a simple text representation
    // In production, use a library like 'pdfmake' or 'puppeteer'
    const lines: string[] = [];

    lines.push('Project Export Report');
    lines.push('=' .repeat(50));
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push(`Total Records: ${results.length}`);
    lines.push('');

    for (const [index, project] of results.entries()) {
      lines.push(`Project ${index + 1}:`);
      lines.push('-'.repeat(30));

      for (const column of options.columns) {
        const value = this.getNestedProperty(project, column);
        lines.push(`${column}: ${value || 'N/A'}`);
      }

      lines.push('');
    }

    return Buffer.from(lines.join('\n'), 'utf-8');
  }

  /**
   * Get export job status
   */
  async getExportJob(jobId: string, userId: string): Promise<ExportJob> {
    const job = await this.exportJobRepository.findOne({
      where: { id: jobId, userId },
    });

    if (!job) {
      throw new Error(`Export job ${jobId} not found`);
    }

    return job;
  }

  /**
   * Update export job
   */
  async updateExportJob(
    jobId: string,
    updates: Partial<ExportJob>,
  ): Promise<ExportJob> {
    await this.exportJobRepository.update(jobId, updates);
    return (await this.exportJobRepository.findOne({ where: { id: jobId } })) || ({} as ExportJob);
  }

  /**
   * Get file path for export
   */
  async getExportFilePath(jobId: string): Promise<string> {
    const job = await this.exportJobRepository.findOne({ where: { id: jobId } });

    if (!job || job.status !== ExportStatus.COMPLETED) {
      return '';
    }

    const fileExtension = this.getFileExtension(job.format);
    return path.join(this.exportDir, `export_${jobId}.${fileExtension}`);
  }

  /**
   * Clean up expired exports
   */
  async cleanupExpiredExports(): Promise<void> {
    const expiredJobs = await this.exportJobRepository.find({
      where: {
        status: ExportStatus.COMPLETED,
        expiresAt: new Date(),
      },
    });

    for (const job of expiredJobs) {
      try {
        const filePath = await this.getExportFilePath(job.id);
        if (filePath) {
          await fs.unlink(filePath);
        }
        await this.exportJobRepository.remove(job);
      } catch (error) {
        this.logger.error(`Failed to cleanup export ${job.id}: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Get nested property from object
   */
  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Get file extension for format
   */
  private getFileExtension(format: ExportFormat): string {
    switch (format) {
      case ExportFormat.CSV:
        return 'csv';
      case ExportFormat.XLSX:
        return 'xlsx';
      case ExportFormat.JSON:
        return 'json';
      case ExportFormat.PDF:
        return 'pdf';
      default:
        return 'txt';
    }
  }

  /**
   * Ensure export directory exists
   */
  private async ensureExportDirectory(): Promise<void> {
    try {
      await fs.access(this.exportDir);
    } catch {
      await fs.mkdir(this.exportDir, { recursive: true });
    }
  }
}