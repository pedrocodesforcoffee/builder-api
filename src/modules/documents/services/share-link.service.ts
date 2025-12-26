import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { ShareLink, Document, DocumentAccessLog } from '../entities';
import { ShareLinkStatus, DocumentAction } from '../enums/permission.enums';
import { S3Service } from '../../../common/services/s3.service';
import { WatermarkService } from './watermark.service';
import { PermissionService } from './permission.service';

/**
 * Share Link Service
 *
 * Manages external document sharing with comprehensive security controls.
 *
 * Features:
 * - Short code generation for public URLs
 * - Password protection with bcrypt hashing
 * - Email verification and whitelisting
 * - Download limits and tracking
 * - IP range restrictions
 * - Dynamic watermarking
 * - Access logging and notifications
 * - Automatic expiration handling
 */
@Injectable()
export class ShareLinkService {
  constructor(
    @InjectRepository(ShareLink)
    private readonly shareLinkRepo: Repository<ShareLink>,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    private readonly s3Service: S3Service,
    private readonly watermarkService: WatermarkService,
    private readonly permissionService: PermissionService,
  ) {}

  /**
   * Create a new share link
   *
   * @param userId - User creating the link (must have SHARE permission)
   * @param data - Share link data
   * @returns Created share link
   */
  async createShareLink(
    userId: string,
    data: {
      documentId: string;
      password?: string;
      requireEmail?: boolean;
      allowedEmails?: string[];
      maxDownloads?: number;
      allowedIpRanges?: string[];
      allowDownload?: boolean;
      allowPrint?: boolean;
      watermarkEnabled?: boolean;
      watermarkSettings?: any;
      recipientName?: string;
      recipientCompany?: string;
      purpose?: string;
      notifyOnAccess?: boolean;
      expiresAt: Date;
    },
  ): Promise<ShareLink> {
    // Verify user has permission to share document
    await this.permissionService.enforcePermission(
      userId,
      data.documentId,
      DocumentAction.SHARE,
    );

    // Verify document exists
    const document = await this.documentRepo.findOne({
      where: { id: data.documentId },
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Validate expiration date
    if (new Date(data.expiresAt) <= new Date()) {
      throw new BadRequestException('Expiration date must be in the future');
    }

    // Generate unique short code
    const shortCode = await this.generateUniqueShortCode();

    // Hash password if provided
    let passwordHash: string | undefined;
    if (data.password) {
      passwordHash = await bcrypt.hash(data.password, 10);
    }

    // Create share link
    const shareLink = this.shareLinkRepo.create({
      documentId: data.documentId,
      shortCode,
      passwordHash: passwordHash || null,
      requireEmail: data.requireEmail ?? false,
      allowedEmails: data.allowedEmails || null,
      maxDownloads: data.maxDownloads || null,
      allowedIpRanges: data.allowedIpRanges || null,
      allowDownload: data.allowDownload ?? true,
      allowPrint: data.allowPrint ?? false,
      watermarkEnabled: data.watermarkEnabled ?? true,
      watermarkSettings: data.watermarkSettings || null,
      recipientName: data.recipientName || null,
      recipientCompany: data.recipientCompany || null,
      purpose: data.purpose || null,
      notifyOnAccess: data.notifyOnAccess ?? false,
      expiresAt: data.expiresAt,
      status: ShareLinkStatus.ACTIVE,
      createdById: userId,
    });

    return this.shareLinkRepo.save(shareLink);
  }

  /**
   * Get share link by short code
   */
  async getShareLinkByCode(shortCode: string): Promise<ShareLink> {
    const shareLink = await this.shareLinkRepo.findOne({
      where: { shortCode },
    });

    if (!shareLink) {
      throw new NotFoundException('Share link not found');
    }

    return shareLink;
  }

  /**
   * Get share link by ID (for management)
   */
  async getShareLink(shareLinkId: string, userId: string): Promise<ShareLink> {
    const shareLink = await this.shareLinkRepo.findOne({
      where: { id: shareLinkId },
    });

    if (!shareLink) {
      throw new NotFoundException('Share link not found');
    }

    // Verify user has permission to view link details
    await this.permissionService.enforcePermission(
      userId,
      shareLink.documentId,
      DocumentAction.VIEW,
    );

    return shareLink;
  }

  /**
   * List all share links for a document
   */
  async getDocumentShareLinks(
    documentId: string,
    userId: string,
  ): Promise<ShareLink[]> {
    // Verify user has permission
    await this.permissionService.enforcePermission(
      userId,
      documentId,
      DocumentAction.VIEW,
    );

    return this.shareLinkRepo.find({
      where: { documentId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * List all share links for a project
   */
  async getProjectShareLinks(
    projectId: string,
    userId: string,
  ): Promise<ShareLink[]> {
    // Get all documents in the project
    const documents = await this.documentRepo.find({
      where: { projectId },
      select: ['id'],
    });

    if (documents.length === 0) {
      return [];
    }

    const documentIds = documents.map(doc => doc.id);

    // Get all share links for those documents
    return this.shareLinkRepo.find({
      where: { documentId: In(documentIds) },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Update share link
   */
  async updateShareLink(
    shareLinkId: string,
    userId: string,
    updates: {
      password?: string;
      requireEmail?: boolean;
      allowedEmails?: string[];
      maxDownloads?: number;
      allowedIpRanges?: string[];
      allowDownload?: boolean;
      allowPrint?: boolean;
      watermarkEnabled?: boolean;
      watermarkSettings?: any;
      expiresAt?: Date;
      notifyOnAccess?: boolean;
    },
  ): Promise<ShareLink> {
    const shareLink = await this.getShareLink(shareLinkId, userId);

    // Verify user can manage the document
    await this.permissionService.enforcePermission(
      userId,
      shareLink.documentId,
      DocumentAction.SHARE,
    );

    // Update password if provided
    if (updates.password) {
      shareLink.passwordHash = await bcrypt.hash(updates.password, 10);
    }

    // Update other fields
    if (updates.requireEmail !== undefined) shareLink.requireEmail = updates.requireEmail;
    if (updates.allowedEmails !== undefined) shareLink.allowedEmails = updates.allowedEmails;
    if (updates.maxDownloads !== undefined) shareLink.maxDownloads = updates.maxDownloads;
    if (updates.allowedIpRanges !== undefined) shareLink.allowedIpRanges = updates.allowedIpRanges;
    if (updates.allowDownload !== undefined) shareLink.allowDownload = updates.allowDownload;
    if (updates.allowPrint !== undefined) shareLink.allowPrint = updates.allowPrint;
    if (updates.watermarkEnabled !== undefined) shareLink.watermarkEnabled = updates.watermarkEnabled;
    if (updates.watermarkSettings !== undefined) shareLink.watermarkSettings = updates.watermarkSettings;
    if (updates.expiresAt !== undefined) shareLink.expiresAt = updates.expiresAt;
    if (updates.notifyOnAccess !== undefined) shareLink.notifyOnAccess = updates.notifyOnAccess;

    return this.shareLinkRepo.save(shareLink);
  }

  /**
   * Revoke share link
   */
  async revokeShareLink(shareLinkId: string, userId: string): Promise<void> {
    const shareLink = await this.getShareLink(shareLinkId, userId);

    // Verify user can manage the document
    await this.permissionService.enforcePermission(
      userId,
      shareLink.documentId,
      DocumentAction.SHARE,
    );

    shareLink.status = ShareLinkStatus.REVOKED;
    shareLink.revokedAt = new Date();
    shareLink.revokedById = userId;

    await this.shareLinkRepo.save(shareLink);
  }

  /**
   * Validate share link access (10-step security check)
   *
   * @param shortCode - Share link short code
   * @param accessData - Access attempt data
   * @returns Share link if valid
   * @throws ForbiddenException if access denied
   */
  async validateShareLinkAccess(
    shortCode: string,
    accessData: {
      password?: string;
      email?: string;
      ipAddress: string;
    },
  ): Promise<ShareLink> {
    // 1. Check link exists
    const shareLink = await this.getShareLinkByCode(shortCode);

    // 2. Check status
    if (shareLink.status !== ShareLinkStatus.ACTIVE) {
      throw new ForbiddenException(`Share link is ${shareLink.status}`);
    }

    // 3. Check expiration
    if (new Date() > shareLink.expiresAt) {
      // Auto-expire
      shareLink.status = ShareLinkStatus.EXPIRED;
      await this.shareLinkRepo.save(shareLink);
      throw new ForbiddenException('Share link has expired');
    }

    // 4. Check password
    if (shareLink.passwordHash) {
      if (!accessData.password) {
        throw new UnauthorizedException('Password required');
      }
      const passwordValid = await bcrypt.compare(
        accessData.password,
        shareLink.passwordHash,
      );
      if (!passwordValid) {
        throw new UnauthorizedException('Invalid password');
      }
    }

    // 5. Check email requirement
    if (shareLink.requireEmail && !accessData.email) {
      throw new UnauthorizedException('Email required');
    }

    // 6. Check email whitelist
    if (shareLink.allowedEmails && shareLink.allowedEmails.length > 0) {
      if (!accessData.email || !shareLink.allowedEmails.includes(accessData.email)) {
        throw new ForbiddenException('Email not authorized');
      }
    }

    // 7. Check download limit
    if (
      shareLink.maxDownloads !== null &&
      shareLink.downloadCount >= shareLink.maxDownloads
    ) {
      // Auto-exhaust
      shareLink.status = ShareLinkStatus.EXHAUSTED;
      await this.shareLinkRepo.save(shareLink);
      throw new ForbiddenException('Download limit exceeded');
    }

    // 8. Check IP restrictions
    if (shareLink.allowedIpRanges && shareLink.allowedIpRanges.length > 0) {
      // Simple IP check (can be enhanced with ipaddr.js)
      const ipAllowed = shareLink.allowedIpRanges.some(range => {
        if (range === accessData.ipAddress) return true;
        if (range.includes('*')) {
          const pattern = range.replace(/\*/g, '.*');
          const regex = new RegExp(`^${pattern}$`);
          return regex.test(accessData.ipAddress);
        }
        return false;
      });

      if (!ipAllowed) {
        throw new ForbiddenException('IP address not authorized');
      }
    }

    // 9. Update access tracking
    shareLink.accessCount += 1;
    shareLink.lastAccessedAt = new Date();
    await this.shareLinkRepo.save(shareLink);

    // 10. Log access
    await this.permissionService.logAccess({
      documentId: shareLink.documentId,
      action: DocumentAction.VIEW,
      shareLinkId: shareLink.id,
      externalEmail: accessData.email || undefined,
      ipAddress: accessData.ipAddress,
      details: { success: true },
    });

    return shareLink;
  }

  /**
   * Download document via share link with watermark
   *
   * @param shortCode - Share link short code
   * @param accessData - Access data (password, email, IP)
   * @returns File buffer and metadata
   */
  async downloadViaShareLink(
    shortCode: string,
    accessData: {
      password?: string;
      email?: string;
      ipAddress: string;
      userAgent?: string;
    },
  ): Promise<{
    buffer: Buffer;
    filename: string;
    mimeType: string;
  }> {
    console.log('[ShareLinkService] downloadViaShareLink called with shortCode:', shortCode);
    // Validate access
    const shareLink = await this.validateShareLinkAccess(shortCode, accessData);

    // Check download permission
    if (!shareLink.allowDownload) {
      throw new ForbiddenException('Downloads not allowed for this link');
    }

    // Get document
    const document = await this.documentRepo.findOne({
      where: { id: shareLink.documentId },
      relations: ['currentVersion'],
    });

    console.log('[ShareLinkService] Document:', document);
    console.log('[ShareLinkService] Current version:', document?.currentVersion);

    if (!document || !document.currentVersion) {
      throw new NotFoundException('Document not found');
    }

    // Download file from S3
    console.log('[ShareLinkService] Downloading from S3:', document.currentVersion.s3Key);
    const fileBuffer = await this.s3Service.getObject(
      document.currentVersion.s3Key,
      this.s3Service.getProductionBucket(),
    );

    let finalBuffer = fileBuffer;
    let watermarkApplied = false;

    if (shareLink.watermarkEnabled) {
      try {
        const watermarkSettings = this.watermarkService.createShareLinkWatermarkSettings({
          watermarkSettings: shareLink.watermarkSettings,
          recipientName: shareLink.recipientName,
          recipientEmail: accessData.email || shareLink.recipientName || null,
          purpose: shareLink.purpose,
        });

        watermarkSettings.recipientEmail = accessData.email || undefined;
        finalBuffer = await this.watermarkService.watermarkFile(
          fileBuffer,
          document.currentVersion!.mimeType,
          watermarkSettings,
        );
        watermarkApplied = true;
      } catch (error) {
        console.error('Watermark error:', error);
      }
    }

    shareLink.downloadCount += 1;
    await this.shareLinkRepo.save(shareLink);

    await this.permissionService.logAccess({
      documentId: shareLink.documentId,
      versionId: document.currentVersion!.id,
      action: DocumentAction.DOWNLOAD,
      shareLinkId: shareLink.id,
      externalEmail: accessData.email || undefined,
      ipAddress: accessData.ipAddress,
      userAgent: accessData.userAgent || undefined,
      details: {
        success: true,
        watermarkApplied,
        downloadFormat: document.currentVersion!.mimeType,
      },
    });

    return {
      buffer: finalBuffer,
      filename: document.currentVersion!.originalFilename,
      mimeType: document.currentVersion!.mimeType,
    };
  }

  /**
   * Generate unique short code for share link
   * Format: 16 random URL-safe characters
   */
  private async generateUniqueShortCode(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      // Generate 16 random URL-safe characters
      const shortCode = crypto
        .randomBytes(12)
        .toString('base64')
        .replace(/[+/=]/g, '')
        .substring(0, 16);

      // Check if unique
      const existing = await this.shareLinkRepo.findOne({
        where: { shortCode },
      });

      if (!existing) {
        return shortCode;
      }

      attempts++;
    }

    throw new Error('Failed to generate unique short code');
  }

  /**
   * Clean up expired share links (scheduled job)
   */
  async cleanupExpiredLinks(): Promise<number> {
    const result = await this.shareLinkRepo
      .createQueryBuilder()
      .update(ShareLink)
      .set({ status: ShareLinkStatus.EXPIRED })
      .where('status = :status', { status: ShareLinkStatus.ACTIVE })
      .andWhere('expiresAt < :now', { now: new Date() })
      .execute();

    return result.affected || 0;
  }

  /**
   * Get share link statistics
   */
  async getShareLinkStats(shareLinkId: string, userId: string): Promise<{
    accessCount: number;
    downloadCount: number;
    lastAccessedAt: Date | null;
    status: ShareLinkStatus;
    daysUntilExpiration: number;
  }> {
    const shareLink = await this.getShareLink(shareLinkId, userId);

    const now = new Date();
    const daysUntilExpiration = Math.ceil(
      (shareLink.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      accessCount: shareLink.accessCount,
      downloadCount: shareLink.downloadCount,
      lastAccessedAt: shareLink.lastAccessedAt,
      status: shareLink.status,
      daysUntilExpiration,
    };
  }
}
