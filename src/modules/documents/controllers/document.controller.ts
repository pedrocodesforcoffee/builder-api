import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Request,
  Res,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { DocumentService } from '../services/document.service';
import { PermissionService } from '../services/permission.service';
import { S3Service } from '../../../common/services/s3.service';
import { DocumentAction } from '../enums/permission.enums';

/**
 * Document Controller
 *
 * Manages core document operations.
 *
 * Endpoints:
 * - GET /projects/:projectId/documents - List documents in project
 * - GET /projects/:projectId/documents/:id/download - Download/view document
 * - PATCH /projects/:projectId/documents/:id - Update document
 * - DELETE /projects/:projectId/documents/:id - Delete document
 */
@Controller('projects/:projectId/documents')
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly permissionService: PermissionService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * List all documents in a project
   */
  @Get()
  async getProjectDocuments(
    @Param('projectId') projectId: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('folderId') folderId?: string,
    @Request() req?: any,
  ) {
    const userId = req?.user?.id;

    // Verify user is a project member
    if (userId) {
      await this.permissionService.getMemberByUserId(userId, projectId);
    }

    return this.documentService.getProjectDocuments(projectId, {
      sortBy: sortBy || 'name',
      sortOrder: sortOrder || 'asc',
      limit: limit ? Number(limit) : 100,
      offset: offset ? Number(offset) : 0,
      folderId: folderId !== undefined ? (folderId || null) : undefined,
    });
  }

  /**
   * Download/view document
   */
  @Get(':id/download')
  async downloadDocument(
    @Param('projectId') projectId: string,
    @Param('id') documentId: string,
    @Request() req: any,
    @Res() res: Response,
  ): Promise<void> {
    console.log(`[downloadDocument] START - projectId: ${projectId}, documentId: ${documentId}`);
    const userId = req?.user?.id;
    console.log(`[downloadDocument] userId: ${userId}`);

    try {
      // Verify user is a project member
      if (userId) {
        console.log(`[downloadDocument] Verifying user is project member...`);
        await this.permissionService.getMemberByUserId(userId, projectId);
        console.log(`[downloadDocument] ✓ User is project member`);
      }

      // Check user has VIEW permission on document
      if (userId) {
        console.log(`[downloadDocument] Checking VIEW permission...`);
        await this.permissionService.enforcePermission(
          userId,
          documentId,
          DocumentAction.VIEW,
        );
        console.log(`[downloadDocument] ✓ User has VIEW permission`);
      }

      // Get document with version information
      console.log(`[downloadDocument] Fetching document...`);
      const document = await this.documentService.getDocument(documentId);
      console.log(`[downloadDocument] ✓ Document fetched:`, {
        id: document.id,
        name: document.name,
        hasCurrentVersion: !!document.currentVersion,
      });

      if (!document.currentVersion) {
        console.error(`[downloadDocument] ERROR: Document has no currentVersion`);
        throw new NotFoundException('Document version not found');
      }

      console.log(`[downloadDocument] Document version details:`, {
        s3Key: document.currentVersion.s3Key,
        s3Bucket: document.currentVersion.s3Bucket,
        mimeType: document.currentVersion.mimeType,
        fileSize: document.currentVersion.fileSize,
      });

      // Get file from S3
      console.log(`[downloadDocument] Fetching file from S3...`);
      const buffer = await this.s3Service.getObject(
        document.currentVersion.s3Key,
        document.currentVersion.s3Bucket,
      );
      console.log(`[downloadDocument] ✓ File fetched from S3, buffer size: ${buffer.length} bytes`);

      // Set response headers
      res.setHeader('Content-Type', document.currentVersion.mimeType);

      // Sanitize filename for HTTP header - remove or replace invalid characters
      const safeName = document.name.replace(/[^\x20-\x7E]/g, '_');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${safeName}"`,
      );
      res.setHeader('Content-Length', buffer.length);
      console.log(`[downloadDocument] ✓ Response headers set`);

      // Send file
      console.log(`[downloadDocument] Sending file...`);
      res.status(HttpStatus.OK).send(buffer);
      console.log(`[downloadDocument] ✓ File sent successfully`);
    } catch (error) {
      console.error(`[downloadDocument] ERROR:`, error);
      throw error;
    }
  }

  /**
   * Update document (move to folder, rename, etc.)
   */
  @Patch(':id')
  async updateDocument(
    @Param('projectId') projectId: string,
    @Param('id') documentId: string,
    @Body() updateDto: { folderId?: string | null; name?: string },
    @Request() req?: any,
  ) {
    const userId = req?.user?.id;

    // Verify user is a project member
    if (userId) {
      await this.permissionService.getMemberByUserId(userId, projectId);
    }

    return this.documentService.updateDocument(projectId, documentId, updateDto);
  }

  /**
   * Delete document (soft delete)
   */
  @Delete(':id')
  async deleteDocument(
    @Param('projectId') projectId: string,
    @Param('id') documentId: string,
    @Request() req?: any,
  ) {
    const userId = req?.user?.id;

    // Verify user is a project member
    if (userId) {
      await this.permissionService.getMemberByUserId(userId, projectId);
    }

    await this.documentService.deleteDocument(projectId, documentId);
    return { success: true };
  }
}
