import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Request,
  Query,
  Res,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { PermissionService } from '../services/permission.service';
import { DocumentService } from '../services/document.service';
import { S3Service } from '../../../common/services/s3.service';
import {
  GrantDocumentPermissionDto,
  GrantFolderPermissionDto,
  SetDocumentRestrictionsDto,
} from '../dto/permission.dto';
import { DocumentAction } from '../enums/permission.enums';

/**
 * Permission Controller
 *
 * Manages document and folder permissions.
 *
 * Endpoints:
 * - GET    /documents/:documentId - Get document details
 * - GET    /documents/:documentId/download - Download/view document file
 * - GET    /documents/:documentId/permissions - Get document permissions
 * - POST   /documents/:documentId/permissions - Grant document permission
 * - DELETE /documents/:documentId/permissions/:userId - Revoke document permission
 * - GET    /documents/:documentId/restrictions - Get document restrictions
 * - POST   /documents/:documentId/restrictions - Set document restrictions
 * - GET    /folders/:folderId/permissions - Get folder permissions
 * - POST   /folders/:folderId/permissions - Grant folder permission
 * - DELETE /folders/permissions/:permissionId - Revoke folder permission
 * - GET    /documents/:documentId/access-logs - Get document access logs
 * - GET    /documents/:documentId/check-permission - Check if user has permission
 */
@Controller()
export class PermissionController {
  constructor(
    private readonly permissionService: PermissionService,
    private readonly documentService: DocumentService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Get document details
   */
  @Get('documents/:documentId')
  async getDocument(@Param('documentId') documentId: string) {
    const document = await this.documentService.getDocument(documentId);

    // Transform response to include mimeType and size at top level for frontend compatibility
    return {
      ...document,
      mimeType: document.currentVersion?.mimeType,
      size: document.currentVersion?.fileSize,
    };
  }

  /**
   * Download/view document file
   */
  @Get('documents/:documentId/download')
  async downloadDocument(
    @Param('documentId') documentId: string,
    @Request() req: any,
    @Res() res: Response,
  ): Promise<void> {
    const userId = req?.user?.id;

    // Check user has VIEW permission on document
    if (userId) {
      await this.permissionService.enforcePermission(
        userId,
        documentId,
        DocumentAction.VIEW,
      );
    }

    // Get document with version information
    const document = await this.documentService.getDocument(documentId);

    if (!document.currentVersion) {
      throw new NotFoundException('Document version not found');
    }

    // Get file from S3
    const buffer = await this.s3Service.getObject(
      document.currentVersion.s3Key,
      document.currentVersion.s3Bucket,
    );

    // Set response headers
    res.setHeader('Content-Type', document.currentVersion.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${document.name}"`,
    );
    res.setHeader('Content-Length', buffer.length);

    // Send file
    res.status(HttpStatus.OK).send(buffer);
  }

  /**
   * Get document permissions
   */
  @Get('documents/:documentId/permissions')
  async getDocumentPermissions(
    @Param('documentId') documentId: string,
    @Request() req: any,
  ) {
    const userId = req.user.id;

    // Verify user can view permissions
    await this.permissionService.enforcePermission(
      userId,
      documentId,
      DocumentAction.MANAGE_PERMISSIONS,
    );

    return this.permissionService.getDocumentPermissions(documentId);
  }

  /**
   * Grant document permission
   */
  @Post('documents/:documentId/permissions')
  async grantDocumentPermission(
    @Param('documentId') documentId: string,
    @Body() dto: GrantDocumentPermissionDto,
    @Request() req: any,
  ) {
    const userId = req.user.id;

    // Verify user can manage permissions
    await this.permissionService.enforcePermission(
      userId,
      documentId,
      DocumentAction.MANAGE_PERMISSIONS,
    );

    return this.permissionService.grantDocumentPermission({
      documentId,
      userId: dto.userId,
      actions: dto.actions,
      expiresAt: dto.expiresAt,
      reason: dto.reason,
      grantedById: userId,
    });
  }

  /**
   * Revoke document permission
   */
  @Delete('documents/:documentId/permissions/:targetUserId')
  async revokeDocumentPermission(
    @Param('documentId') documentId: string,
    @Param('targetUserId') targetUserId: string,
    @Request() req: any,
  ) {
    const userId = req.user.id;

    // Verify user can manage permissions
    await this.permissionService.enforcePermission(
      userId,
      documentId,
      DocumentAction.MANAGE_PERMISSIONS,
    );

    await this.permissionService.revokeDocumentPermission(documentId, targetUserId);

    return { message: 'Permission revoked successfully' };
  }

  /**
   * Get document restrictions
   */
  @Get('documents/:documentId/restrictions')
  async getDocumentRestrictions(
    @Param('documentId') documentId: string,
    @Request() req: any,
  ) {
    const userId = req.user.id;

    // Verify user can view restrictions
    await this.permissionService.enforcePermission(
      userId,
      documentId,
      DocumentAction.VIEW,
    );

    return this.permissionService.getDocumentRestrictions(documentId);
  }

  /**
   * Set document restrictions
   */
  @Post('documents/:documentId/restrictions')
  async setDocumentRestrictions(
    @Param('documentId') documentId: string,
    @Body() dto: SetDocumentRestrictionsDto,
    @Request() req: any,
  ) {
    const userId = req.user.id;

    // Verify user can manage permissions
    await this.permissionService.enforcePermission(
      userId,
      documentId,
      DocumentAction.MANAGE_PERMISSIONS,
    );

    return this.permissionService.setDocumentRestrictions({
      documentId,
      denyDownload: dto.denyDownload,
      denyPrint: dto.denyPrint,
      requireWatermark: dto.requireWatermark,
      allowedIpRanges: dto.allowedIpRanges,
      inheritFromFolder: dto.inheritFromFolder,
      setById: userId,
    });
  }

  /**
   * Get folder permissions
   */
  @Get('folders/:folderId/permissions')
  async getFolderPermissions(
    @Param('folderId') folderId: string,
    @Request() req: any,
  ) {
    const userId = req.user.id;

    // TODO: Verify user is project member
    // For now, just return the permissions

    return this.permissionService.getFolderPermissions(folderId);
  }

  /**
   * Grant folder permission
   */
  @Post('folders/:folderId/permissions')
  async grantFolderPermission(
    @Param('folderId') folderId: string,
    @Body() dto: GrantFolderPermissionDto,
    @Request() req: any,
  ) {
    const userId = req.user.id;

    // TODO: Verify user is project owner/admin

    return this.permissionService.grantFolderPermission({
      folderId,
      targetType: dto.targetType,
      role: dto.role,
      userId: dto.userId,
      company: dto.company,
      actions: dto.actions,
      expiresAt: dto.expiresAt,
      grantedById: userId,
    });
  }

  /**
   * Revoke folder permission
   */
  @Delete('folders/permissions/:permissionId')
  async revokeFolderPermission(
    @Param('permissionId') permissionId: string,
    @Request() req: any,
  ) {
    const userId = req.user.id;

    // TODO: Verify user is project owner/admin

    await this.permissionService.revokeFolderPermission(permissionId);

    return { message: 'Folder permission revoked successfully' };
  }

  /**
   * Get document access logs
   */
  @Get('documents/:documentId/access-logs')
  async getDocumentAccessLogs(
    @Param('documentId') documentId: string,
    @Query('limit') limit: string,
    @Request() req: any,
  ) {
    const userId = req.user.id;

    // Verify user can view document
    await this.permissionService.enforcePermission(
      userId,
      documentId,
      DocumentAction.VIEW,
    );

    const limitNum = limit ? parseInt(limit, 10) : 100;

    return this.permissionService.getDocumentAccessLogs(documentId, limitNum);
  }

  /**
   * Check if user has permission
   */
  @Get('documents/:documentId/check-permission')
  async checkPermission(
    @Param('documentId') documentId: string,
    @Query('action') action: DocumentAction,
    @Request() req: any,
  ) {
    const userId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress;

    const hasPermission = await this.permissionService.hasPermission(
      userId,
      documentId,
      action,
      ipAddress,
    );

    return {
      documentId,
      action,
      hasPermission,
    };
  }

  /**
   * Get user's accessible documents in a project
   */
  @Get('projects/:projectId/accessible-documents')
  async getUserAccessibleDocuments(
    @Param('projectId') projectId: string,
    @Query('action') action: DocumentAction,
    @Request() req: any,
  ) {
    const userId = req.user.id;

    const documentIds = await this.permissionService.getUserDocuments(
      userId,
      projectId,
      action || DocumentAction.VIEW,
    );

    return {
      projectId,
      action: action || DocumentAction.VIEW,
      documentIds,
      count: documentIds.length,
    };
  }
}
