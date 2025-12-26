import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  Res,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ShareLinkService } from '../services/share-link.service';
import {
  CreateShareLinkDto,
  UpdateShareLinkDto,
  AccessShareLinkDto,
  ShareLinkResponseDto,
  ShareLinkStatsResponseDto,
} from '../dto/permission.dto';

/**
 * Share Link Controller
 *
 * Manages external document sharing via secure links.
 *
 * Endpoints:
 * - POST   /projects/:projectId/share-links - Create new share link
 * - GET    /projects/:projectId/share-links/:shareLinkId - Get share link details
 * - PUT    /projects/:projectId/share-links/:shareLinkId - Update share link
 * - DELETE /projects/:projectId/share-links/:shareLinkId - Revoke share link
 * - GET    /projects/:projectId/share-links/:shareLinkId/stats - Get share link statistics
 * - GET    /s/:shortCode - Access shared document (public)
 * - POST   /s/:shortCode/download - Download via share link (public)
 */
@Controller()
export class ShareLinkController {
  constructor(private readonly shareLinkService: ShareLinkService) {}

  /**
   * Create new share link
   */
  @Post('projects/:projectId/share-links')
  @UseGuards(JwtAuthGuard)
  async createShareLink(
    @Param('projectId') projectId: string,
    @Body() dto: CreateShareLinkDto,
    @Request() req: any,
  ): Promise<ShareLinkResponseDto> {
    const userId = req.user.id;

    const shareLink = await this.shareLinkService.createShareLink(userId, {
      documentId: dto.documentId,
      password: dto.password,
      requireEmail: dto.requireEmail,
      allowedEmails: dto.allowedEmails,
      maxDownloads: dto.maxDownloads,
      allowedIpRanges: dto.allowedIpRanges,
      allowDownload: dto.allowDownload,
      allowPrint: dto.allowPrint,
      watermarkEnabled: dto.watermarkEnabled,
      watermarkSettings: dto.watermarkSettings,
      recipientName: dto.recipientName,
      recipientCompany: dto.recipientCompany,
      purpose: dto.purpose,
      notifyOnAccess: dto.notifyOnAccess,
      expiresAt: dto.expiresAt,
    });

    return {
      id: shareLink.id,
      documentId: shareLink.documentId,
      shortCode: shareLink.shortCode,
      requireEmail: shareLink.requireEmail,
      allowedEmails: shareLink.allowedEmails || undefined,
      maxDownloads: shareLink.maxDownloads || undefined,
      downloadCount: shareLink.downloadCount,
      allowDownload: shareLink.allowDownload,
      allowPrint: shareLink.allowPrint,
      watermarkEnabled: shareLink.watermarkEnabled,
      recipientName: shareLink.recipientName || undefined,
      recipientCompany: shareLink.recipientCompany || undefined,
      purpose: shareLink.purpose || undefined,
      status: shareLink.status,
      expiresAt: shareLink.expiresAt,
      accessCount: shareLink.accessCount,
      lastAccessedAt: shareLink.lastAccessedAt || undefined,
      createdAt: shareLink.createdAt,
    };
  }

  /**
   * Get share link details
   */
  @Get('share-links/:shareLinkId')
  @UseGuards(JwtAuthGuard)
  async getShareLink(
    @Param('shareLinkId') shareLinkId: string,
    @Request() req: any,
  ): Promise<ShareLinkResponseDto> {
    const userId = req.user.id;

    const shareLink = await this.shareLinkService.getShareLink(shareLinkId, userId);

    return {
      id: shareLink.id,
      documentId: shareLink.documentId,
      shortCode: shareLink.shortCode,
      requireEmail: shareLink.requireEmail,
      allowedEmails: shareLink.allowedEmails || undefined,
      maxDownloads: shareLink.maxDownloads || undefined,
      downloadCount: shareLink.downloadCount,
      allowDownload: shareLink.allowDownload,
      allowPrint: shareLink.allowPrint,
      watermarkEnabled: shareLink.watermarkEnabled,
      recipientName: shareLink.recipientName || undefined,
      recipientCompany: shareLink.recipientCompany || undefined,
      purpose: shareLink.purpose || undefined,
      status: shareLink.status,
      expiresAt: shareLink.expiresAt,
      accessCount: shareLink.accessCount,
      lastAccessedAt: shareLink.lastAccessedAt || undefined,
      createdAt: shareLink.createdAt,
    };
  }

  /**
   * Update share link
   */
  @Put('share-links/:shareLinkId')
  @UseGuards(JwtAuthGuard)
  async updateShareLink(
    @Param('shareLinkId') shareLinkId: string,
    @Body() dto: UpdateShareLinkDto,
    @Request() req: any,
  ): Promise<ShareLinkResponseDto> {
    const userId = req.user.id;

    const shareLink = await this.shareLinkService.updateShareLink(
      shareLinkId,
      userId,
      {
        password: dto.password,
        requireEmail: dto.requireEmail,
        allowedEmails: dto.allowedEmails,
        maxDownloads: dto.maxDownloads,
        allowedIpRanges: dto.allowedIpRanges,
        allowDownload: dto.allowDownload,
        allowPrint: dto.allowPrint,
        watermarkEnabled: dto.watermarkEnabled,
        watermarkSettings: dto.watermarkSettings,
        expiresAt: dto.expiresAt,
        notifyOnAccess: dto.notifyOnAccess,
      },
    );

    return {
      id: shareLink.id,
      documentId: shareLink.documentId,
      shortCode: shareLink.shortCode,
      requireEmail: shareLink.requireEmail,
      allowedEmails: shareLink.allowedEmails || undefined,
      maxDownloads: shareLink.maxDownloads || undefined,
      downloadCount: shareLink.downloadCount,
      allowDownload: shareLink.allowDownload,
      allowPrint: shareLink.allowPrint,
      watermarkEnabled: shareLink.watermarkEnabled,
      recipientName: shareLink.recipientName || undefined,
      recipientCompany: shareLink.recipientCompany || undefined,
      purpose: shareLink.purpose || undefined,
      status: shareLink.status,
      expiresAt: shareLink.expiresAt,
      accessCount: shareLink.accessCount,
      lastAccessedAt: shareLink.lastAccessedAt || undefined,
      createdAt: shareLink.createdAt,
    };
  }

  /**
   * Revoke share link
   */
  @Delete('share-links/:shareLinkId')
  @UseGuards(JwtAuthGuard)
  async revokeShareLink(
    @Param('shareLinkId') shareLinkId: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    const userId = req.user.id;

    await this.shareLinkService.revokeShareLink(shareLinkId, userId);

    return { message: 'Share link revoked successfully' };
  }

  /**
   * Get share link statistics
   */
  @Get('share-links/:shareLinkId/stats')
  @UseGuards(JwtAuthGuard)
  async getShareLinkStats(
    @Param('shareLinkId') shareLinkId: string,
    @Request() req: any,
  ): Promise<ShareLinkStatsResponseDto> {
    const userId = req.user.id;

    const stats = await this.shareLinkService.getShareLinkStats(shareLinkId, userId);

    return {
      ...stats,
      lastAccessedAt: stats.lastAccessedAt || undefined,
    };
  }

  /**
   * List project share links (all documents in project)
   */
  @Get('projects/:projectId/share-links')
  @UseGuards(JwtAuthGuard)
  async getProjectShareLinks(
    @Param('projectId') projectId: string,
    @Request() req: any,
  ): Promise<ShareLinkResponseDto[]> {
    const userId = req.user.id;

    const shareLinks = await this.shareLinkService.getProjectShareLinks(
      projectId,
      userId,
    );

    return shareLinks.map(shareLink => ({
      id: shareLink.id,
      documentId: shareLink.documentId,
      shortCode: shareLink.shortCode,
      requireEmail: shareLink.requireEmail,
      allowedEmails: shareLink.allowedEmails || undefined,
      maxDownloads: shareLink.maxDownloads || undefined,
      downloadCount: shareLink.downloadCount,
      allowDownload: shareLink.allowDownload,
      allowPrint: shareLink.allowPrint,
      watermarkEnabled: shareLink.watermarkEnabled,
      recipientName: shareLink.recipientName || undefined,
      recipientCompany: shareLink.recipientCompany || undefined,
      purpose: shareLink.purpose || undefined,
      status: shareLink.status,
      expiresAt: shareLink.expiresAt,
      accessCount: shareLink.accessCount,
      lastAccessedAt: shareLink.lastAccessedAt || undefined,
      createdAt: shareLink.createdAt,
    }));
  }

  /**
   * Get distribution statistics
   */
  @Get('projects/:projectId/distribution/stats')
  @UseGuards(JwtAuthGuard)
  async getDistributionStats(
    @Param('projectId') projectId: string,
    @Request() req: any,
  ): Promise<any> {
    const userId = req.user.id;

    // Get count of active share links for this project
    const shareLinks = await this.shareLinkService.getProjectShareLinks(
      projectId,
      userId,
    );
    const activeLinksCount = shareLinks.filter(link => link.status === 'active').length;

    // Calculate total views across all share links
    const totalViews = shareLinks.reduce((sum, link) => sum + link.accessCount, 0);

    return {
      transmittalsSent: 0,
      deliveryRate: 0,
      acknowledgmentRate: 0,
      pendingCount: 0,
      activeLinksCount,
      totalViews,
    };
  }

  /**
   * Get pending acknowledgments
   */
  @Get('projects/:projectId/distribution/pending-acknowledgments')
  @UseGuards(JwtAuthGuard)
  async getPendingAcknowledgments(
    @Param('projectId') projectId: string,
    @Request() req: any,
  ): Promise<any[]> {
    // Stub endpoint - return empty array for now
    return [];
  }

  /**
   * List document share links
   */
  @Get('documents/:documentId/share-links')
  @UseGuards(JwtAuthGuard)
  async getDocumentShareLinks(
    @Param('documentId') documentId: string,
    @Request() req: any,
  ): Promise<ShareLinkResponseDto[]> {
    const userId = req.user.id;

    const shareLinks = await this.shareLinkService.getDocumentShareLinks(
      documentId,
      userId,
    );

    return shareLinks.map(shareLink => ({
      id: shareLink.id,
      documentId: shareLink.documentId,
      shortCode: shareLink.shortCode,
      requireEmail: shareLink.requireEmail,
      allowedEmails: shareLink.allowedEmails || undefined,
      maxDownloads: shareLink.maxDownloads || undefined,
      downloadCount: shareLink.downloadCount,
      allowDownload: shareLink.allowDownload,
      allowPrint: shareLink.allowPrint,
      watermarkEnabled: shareLink.watermarkEnabled,
      recipientName: shareLink.recipientName || undefined,
      recipientCompany: shareLink.recipientCompany || undefined,
      purpose: shareLink.purpose || undefined,
      status: shareLink.status,
      expiresAt: shareLink.expiresAt,
      accessCount: shareLink.accessCount,
      lastAccessedAt: shareLink.lastAccessedAt || undefined,
      createdAt: shareLink.createdAt,
    }));
  }

  /**
   * Access shared document (public endpoint)
   * Returns document metadata if access is valid
   */
  @Post('s/:shortCode/access')
  async accessSharedDocument(
    @Param('shortCode') shortCode: string,
    @Body() dto: AccessShareLinkDto,
    @Request() req: any,
  ): Promise<{
    documentId: string;
    allowDownload: boolean;
    allowPrint: boolean;
  }> {
    const ipAddress = req.ip || req.connection.remoteAddress;

    const shareLink = await this.shareLinkService.validateShareLinkAccess(
      shortCode,
      {
        password: dto.password,
        email: dto.email,
        ipAddress,
      },
    );

    return {
      documentId: shareLink.documentId,
      allowDownload: shareLink.allowDownload,
      allowPrint: shareLink.allowPrint,
    };
  }

  /**
   * Download document via share link (public endpoint)
   */
  @Post('s/:shortCode/download')
  async downloadViaShareLink(
    @Param('shortCode') shortCode: string,
    @Body() dto: AccessShareLinkDto,
    @Request() req: any,
    @Res() res: Response,
  ): Promise<void> {
    try {
      console.log('[Controller] downloadViaShareLink called with shortCode:', shortCode);
      console.log('[Controller] dto:', dto);
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      console.log('[Controller] calling service.downloadViaShareLink...');
      const { buffer, filename, mimeType } =
        await this.shareLinkService.downloadViaShareLink(shortCode, {
          password: dto.password,
          email: dto.email,
          ipAddress,
          userAgent,
        });

      console.log('[Controller] got result, setting headers...');
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      res.status(HttpStatus.OK).send(buffer);
    } catch (error) {
      console.error('[Controller] Error in downloadViaShareLink:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: (error as Error).message || 'Internal server error',
      });
    }
  }
}
