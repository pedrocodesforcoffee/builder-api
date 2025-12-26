import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Document } from '../entities/document.entity';
import { DocumentVersion } from '../entities/document-version.entity';
import {
  DocumentLockHistory,
  LockAction,
} from '../entities/document-lock-history.entity';
import {
  VersionDistribution,
  DistributionType,
} from '../entities/version-distribution.entity';
import {
  CheckoutDocumentDto,
  CheckoutResponseDto,
  CheckinDocumentDto,
  CheckinResponseDto,
  ForceUnlockDto,
  ForceUnlockResponseDto,
  CompareVersionsDto,
  CompareVersionsResponseDto,
  VersionDiff,
  RestoreVersionDto,
  RestoreVersionResponseDto,
  VersionHistoryResponseDto,
  VersionHistoryItemDto,
  RecordDistributionDto,
  RecordDistributionResponseDto,
  LockStatusDto,
  VersionType,
} from '../dto/version-control.dto';

/**
 * Version Control Service
 *
 * Implements complete version control system with checkout/checkin workflow
 *
 * Features:
 * - Pessimistic locking (checkout/checkin)
 * - Automatic version numbering (major.minor scheme)
 * - Version comparison and diffing
 * - Version restoration
 * - Distribution tracking
 * - Lock expiration and management
 */
@Injectable()
export class VersionControlService {
  private readonly logger = new Logger(VersionControlService.name);

  constructor(
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(DocumentVersion)
    private versionRepository: Repository<DocumentVersion>,
    @InjectRepository(DocumentLockHistory)
    private lockHistoryRepository: Repository<DocumentLockHistory>,
    @InjectRepository(VersionDistribution)
    private distributionRepository: Repository<VersionDistribution>,
    private dataSource: DataSource,
  ) {}

  /**
   * ==================== CHECKOUT (LOCK) ====================
   */

  async checkout(
    documentId: string,
    userId: string,
    dto: CheckoutDocumentDto,
    userContext: { name: string; ipAddress?: string; userAgent?: string },
  ): Promise<CheckoutResponseDto> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
      relations: ['lockedBy'],
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    // Check if already locked
    if (document.isLocked) {
      // Check if lock has expired
      if (
        document.lockExpiresAt &&
        new Date() > new Date(document.lockExpiresAt)
      ) {
        // Lock expired, auto-unlock
        await this.recordLockHistory(
          documentId,
          userId,
          userContext.name,
          LockAction.EXPIRED,
          {
            ipAddress: userContext.ipAddress,
            userAgent: userContext.userAgent,
            metadata: {
              previousLockHolder: document.lockedById,
              expiredAt: document.lockExpiresAt,
            },
          },
        );
      } else {
        // Still locked by someone else
        if (document.lockedById !== userId) {
          throw new ConflictException({
            message: 'Document is already locked by another user',
            lockedBy: document.lockedBy?.id,
            lockedByName:
              `${document.lockedBy?.firstName} ${document.lockedBy?.lastName}`.trim(),
            lockedAt: document.lockedAt,
            lockExpiresAt: document.lockExpiresAt,
          });
        }

        // Already locked by this user - extend lock
        const lockDurationMinutes = dto.lockDurationMinutes || 30;
        const lockExpiresAt = new Date();
        lockExpiresAt.setMinutes(lockExpiresAt.getMinutes() + lockDurationMinutes);

        document.lockExpiresAt = lockExpiresAt;
        await this.documentRepository.save(document);

        return {
          success: true,
          documentId,
          lockExpiresAt,
          message: 'Lock extended successfully',
        };
      }
    }

    // Lock document
    const lockDurationMinutes = dto.lockDurationMinutes || 30;
    const lockExpiresAt = new Date();
    lockExpiresAt.setMinutes(lockExpiresAt.getMinutes() + lockDurationMinutes);

    document.isLocked = true;
    document.lockedById = userId;
    document.lockedAt = new Date();
    document.lockExpiresAt = lockExpiresAt;

    await this.documentRepository.save(document);

    // Record lock history
    await this.recordLockHistory(
      documentId,
      userId,
      userContext.name,
      LockAction.CHECKOUT,
      {
        ipAddress: userContext.ipAddress,
        userAgent: userContext.userAgent,
        reason: dto.comment,
        metadata: {
          lockDuration: lockDurationMinutes * 60 * 1000,
          expirationTime: lockExpiresAt.toISOString(),
          checkoutComment: dto.comment,
        },
      },
    );

    this.logger.log(
      `Document ${documentId} checked out by user ${userId} until ${lockExpiresAt}`,
    );

    return {
      success: true,
      documentId,
      lockExpiresAt,
      message: 'Document checked out successfully',
    };
  }

  /**
   * ==================== CHECKIN (UNLOCK + NEW VERSION) ====================
   */

  async checkin(
    documentId: string,
    userId: string,
    dto: CheckinDocumentDto,
    userContext: { name: string; ipAddress?: string; userAgent?: string },
  ): Promise<CheckinResponseDto> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
      relations: ['currentVersion'],
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    // Verify document is locked by this user
    if (!document.isLocked) {
      throw new BadRequestException('Document is not locked');
    }

    if (document.lockedById !== userId) {
      throw new ForbiddenException(
        'Document is locked by another user. You cannot check it in.',
      );
    }

    // Get current version for calculations
    const currentVersion = await this.versionRepository.findOne({
      where: { id: document.currentVersionId! },
    });

    if (!currentVersion) {
      throw new BadRequestException(
        'Cannot checkin: document has no current version',
      );
    }

    // Calculate new version number and label
    const versionInfo = this.calculateNextVersion(
      currentVersion.versionNumber,
      currentVersion.versionLabel || '1.0',
      dto.versionType,
    );

    // Create new version (use transaction)
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create new version record (copying current version data)
      const newVersion = this.versionRepository.create({
        documentId,
        versionNumber: versionInfo.versionNumber,
        versionLabel: dto.revisionLabel || versionInfo.versionLabel,
        isLatest: true,
        fileName: currentVersion.fileName,
        originalFileName: currentVersion.originalFileName,
        fileSize: currentVersion.fileSize,
        mimeType: currentVersion.mimeType,
        s3Key: currentVersion.s3Key,
        s3Bucket: currentVersion.s3Bucket,
        checksumMD5: currentVersion.checksumMD5,
        checksumSHA256: currentVersion.checksumSHA256,
        changeDescription: dto.comment,
        uploadedById: userId,
        sourceType: 'checkin',
        sourceVersionId: currentVersion.id,
        metadata: {
          ...currentVersion.metadata,
          versionType: dto.versionType,
          requiresApproval: dto.requiresApproval || false,
          checkinComment: dto.comment,
        },
        thumbnailGenerated: currentVersion.thumbnailGenerated,
        thumbnailS3Key: currentVersion.thumbnailS3Key,
        ocrProcessed: currentVersion.ocrProcessed,
        ocrText: currentVersion.ocrText,
        extractedText: currentVersion.extractedText,
        searchableText: currentVersion.searchableText,
        virusScanPassed: currentVersion.virusScanPassed,
        virusScannedAt: currentVersion.virusScannedAt,
        fileMetadata: currentVersion.fileMetadata,
      });

      const savedVersion = await queryRunner.manager.save(newVersion);

      // Mark previous version as not latest
      await queryRunner.manager.update(
        DocumentVersion,
        { id: currentVersion.id },
        { isLatest: false },
      );

      // Update document
      document.currentVersionId = savedVersion.id;
      document.isLocked = false;
      document.lockedById = null;
      document.lockedAt = null;
      document.lockExpiresAt = null;

      if (dto.revisionLabel) {
        document.revision = dto.revisionLabel;
      }

      await queryRunner.manager.save(document);

      // Record lock history
      await queryRunner.manager.save(
        this.lockHistoryRepository.create({
          documentId,
          action: LockAction.CHECKIN,
          userId,
          userName: userContext.name,
          ipAddress: userContext.ipAddress || undefined,
          userAgent: userContext.userAgent || undefined,
          reason: dto.comment,
          relatedVersionId: savedVersion.id,
          metadata: {
            lockDuration:
              document.lockedAt
                ? new Date().getTime() - new Date(document.lockedAt).getTime()
                : undefined,
            checkinComment: dto.comment,
            versionType: dto.versionType,
            versionNumber: versionInfo.versionNumber,
            versionLabel: dto.revisionLabel || versionInfo.versionLabel,
          },
        }),
      );

      await queryRunner.commitTransaction();

      this.logger.log(
        `Document ${documentId} checked in by user ${userId}. New version ${versionInfo.versionNumber} created.`,
      );

      return {
        success: true,
        documentId,
        versionId: savedVersion.id,
        versionNumber: versionInfo.versionNumber,
        versionLabel: dto.revisionLabel || versionInfo.versionLabel,
        message: 'Document checked in successfully',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error checking in document ${documentId}:`,
        error instanceof Error ? error.stack : error,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Calculate next version number and label based on version type
   */
  private calculateNextVersion(
    currentNumber: number,
    currentLabel: string,
    versionType: VersionType,
  ): { versionNumber: number; versionLabel: string } {
    const versionNumber = currentNumber + 1;

    // Parse current label (assume format like "1.2" or "1.2.3")
    const parts = currentLabel.split('.').map((p) => parseInt(p, 10) || 0);
    let major = parts[0] || 1;
    let minor = parts[1] || 0;
    let patch = parts[2] || 0;

    switch (versionType) {
      case VersionType.MAJOR:
        major += 1;
        minor = 0;
        patch = 0;
        break;
      case VersionType.MINOR:
        minor += 1;
        patch = 0;
        break;
      case VersionType.PATCH:
        patch += 1;
        break;
    }

    const versionLabel = `${major}.${minor}.${patch}`;

    return { versionNumber, versionLabel };
  }

  /**
   * ==================== FORCE UNLOCK ====================
   */

  async forceUnlock(
    documentId: string,
    userId: string,
    dto: ForceUnlockDto,
    userContext: { name: string; ipAddress?: string; userAgent?: string },
  ): Promise<ForceUnlockResponseDto> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    if (!document.isLocked) {
      throw new BadRequestException('Document is not locked');
    }

    const previousLockHolder = document.lockedById;

    // Unlock document
    document.isLocked = false;
    document.lockedById = null;
    document.lockedAt = null;
    document.lockExpiresAt = null;

    await this.documentRepository.save(document);

    // Record lock history
    await this.recordLockHistory(
      documentId,
      userId,
      userContext.name,
      LockAction.FORCE_UNLOCK,
      {
        ipAddress: userContext.ipAddress,
        userAgent: userContext.userAgent,
        reason: dto.reason,
        metadata: {
          forceUnlockedBy: userId,
          forceUnlockReason: dto.reason,
          previousLockHolder,
        },
      },
    );

    this.logger.warn(
      `Document ${documentId} forcefully unlocked by user ${userId}. Reason: ${dto.reason}`,
    );

    return {
      success: true,
      documentId,
      previousLockHolder: previousLockHolder || undefined,
      message: 'Document forcefully unlocked',
    };
  }

  /**
   * ==================== VERSION COMPARISON ====================
   */

  async compareVersions(
    documentId: string,
    dto: CompareVersionsDto,
  ): Promise<CompareVersionsResponseDto> {
    const [fromVersion, toVersion] = await Promise.all([
      this.versionRepository.findOne({
        where: { id: dto.fromVersionId, documentId },
      }),
      this.versionRepository.findOne({
        where: { id: dto.toVersionId, documentId },
      }),
    ]);

    if (!fromVersion || !toVersion) {
      throw new NotFoundException('One or both versions not found');
    }

    // Compare basic fields
    const differences: VersionDiff[] = [];

    // File name
    if (fromVersion.originalFileName !== toVersion.originalFileName) {
      differences.push({
        field: 'fileName',
        oldValue: fromVersion.originalFileName,
        newValue: toVersion.originalFileName,
      });
    }

    // File size
    if (fromVersion.fileSize !== toVersion.fileSize) {
      differences.push({
        field: 'fileSize',
        oldValue: fromVersion.fileSize,
        newValue: toVersion.fileSize,
      });
    }

    // MIME type
    if (fromVersion.mimeType !== toVersion.mimeType) {
      differences.push({
        field: 'mimeType',
        oldValue: fromVersion.mimeType,
        newValue: toVersion.mimeType,
      });
    }

    // Checksums (indicates file content changed)
    if (
      fromVersion.checksumSHA256 &&
      toVersion.checksumSHA256 &&
      fromVersion.checksumSHA256 !== toVersion.checksumSHA256
    ) {
      differences.push({
        field: 'fileContent',
        oldValue: 'Changed',
        newValue: 'Changed',
      });
    }

    // Compare metadata
    const metadataChanges: Record<string, any> = {};
    const allKeys = new Set([
      ...Object.keys(fromVersion.metadata || {}),
      ...Object.keys(toVersion.metadata || {}),
    ]);

    for (const key of allKeys) {
      const oldVal = (fromVersion.metadata || {})[key];
      const newVal = (toVersion.metadata || {})[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        metadataChanges[key] = { old: oldVal, new: newVal };
      }
    }

    return {
      fromVersion: fromVersion.versionNumber,
      toVersion: toVersion.versionNumber,
      fromLabel: fromVersion.versionLabel || `v${fromVersion.versionNumber}`,
      toLabel: toVersion.versionLabel || `v${toVersion.versionNumber}`,
      differences,
      metadataChanges,
    };
  }

  /**
   * ==================== VERSION RESTORE ====================
   */

  async restoreVersion(
    documentId: string,
    userId: string,
    dto: RestoreVersionDto,
    userContext: { name: string },
  ): Promise<RestoreVersionResponseDto> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    // Check if locked
    if (document.isLocked && document.lockedById !== userId) {
      throw new ConflictException('Document is locked by another user');
    }

    const versionToRestore = await this.versionRepository.findOne({
      where: { id: dto.versionId, documentId },
    });

    if (!versionToRestore) {
      throw new NotFoundException('Version to restore not found');
    }

    const createNewVersion = dto.createNewVersion !== false; // Default to true

    if (createNewVersion) {
      // Get current version for numbering
      const currentVersion = await this.versionRepository.findOne({
        where: { id: document.currentVersionId! },
      });

      if (!currentVersion) {
        throw new BadRequestException('Document has no current version');
      }

      const nextVersionNumber = currentVersion.versionNumber + 1;

      // Create new version as copy of restored version
      const newVersion = this.versionRepository.create({
        documentId,
        versionNumber: nextVersionNumber,
        versionLabel: `${nextVersionNumber}.0`,
        isLatest: true,
        fileName: versionToRestore.fileName,
        originalFileName: versionToRestore.originalFileName,
        fileSize: versionToRestore.fileSize,
        mimeType: versionToRestore.mimeType,
        s3Key: versionToRestore.s3Key,
        s3Bucket: versionToRestore.s3Bucket,
        checksumMD5: versionToRestore.checksumMD5,
        checksumSHA256: versionToRestore.checksumSHA256,
        changeDescription: `Restored from version ${versionToRestore.versionNumber}. ${dto.comment}`,
        uploadedById: userId,
        sourceType: 'restore',
        sourceVersionId: versionToRestore.id,
        metadata: {
          ...versionToRestore.metadata,
          restoredFrom: versionToRestore.versionNumber,
          restoreComment: dto.comment,
        },
        thumbnailGenerated: versionToRestore.thumbnailGenerated,
        thumbnailS3Key: versionToRestore.thumbnailS3Key,
        ocrProcessed: versionToRestore.ocrProcessed,
        ocrText: versionToRestore.ocrText,
        extractedText: versionToRestore.extractedText,
        searchableText: versionToRestore.searchableText,
        virusScanPassed: versionToRestore.virusScanPassed,
        virusScannedAt: versionToRestore.virusScannedAt,
        fileMetadata: versionToRestore.fileMetadata,
      });

      const savedVersion = await this.versionRepository.save(newVersion);

      // Mark previous version as not latest
      await this.versionRepository.update(
        { id: currentVersion.id },
        { isLatest: false },
      );

      // Update document
      document.currentVersionId = savedVersion.id;
      await this.documentRepository.save(document);

      this.logger.log(
        `Version ${versionToRestore.versionNumber} of document ${documentId} restored as new version ${nextVersionNumber}`,
      );

      return {
        success: true,
        documentId,
        restoredVersionId: dto.versionId,
        newVersionId: savedVersion.id,
        message: `Version ${versionToRestore.versionNumber} restored as new version ${nextVersionNumber}`,
      };
    } else {
      // Direct restore (no new version)
      // Mark all versions as not latest
      await this.versionRepository.update(
        { documentId, isLatest: true },
        { isLatest: false },
      );

      // Mark restored version as latest
      await this.versionRepository.update(
        { id: versionToRestore.id },
        { isLatest: true },
      );

      // Update document
      document.currentVersionId = versionToRestore.id;
      await this.documentRepository.save(document);

      this.logger.log(
        `Version ${versionToRestore.versionNumber} of document ${documentId} restored directly`,
      );

      return {
        success: true,
        documentId,
        restoredVersionId: dto.versionId,
        message: `Version ${versionToRestore.versionNumber} restored`,
      };
    }
  }

  /**
   * ==================== VERSION HISTORY ====================
   */

  async getVersionHistory(
    documentId: string,
  ): Promise<VersionHistoryResponseDto> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    const versions = await this.versionRepository.find({
      where: { documentId },
      relations: ['uploadedBy'],
      order: { versionNumber: 'DESC' },
    });

    const versionItems: VersionHistoryItemDto[] = versions.map((v) => ({
      id: v.id,
      versionNumber: v.versionNumber,
      versionLabel: v.versionLabel || undefined,
      comment: v.changeDescription || '',
      createdById: v.uploadedById,
      createdByName: v.uploadedBy
        ? `${v.uploadedBy.firstName} ${v.uploadedBy.lastName}`.trim()
        : 'Unknown',
      createdAt: v.uploadedAt,
      fileSize: Number(v.fileSize),
      isCurrent: v.id === document.currentVersionId,
    }));

    return {
      documentId,
      totalVersions: versions.length,
      currentVersion: document.currentVersionId
        ? versions.find((v) => v.id === document.currentVersionId)
            ?.versionNumber || 0
        : 0,
      versions: versionItems,
    };
  }

  /**
   * ==================== LOCK STATUS ====================
   */

  async getLockStatus(
    documentId: string,
    userId: string,
  ): Promise<LockStatusDto> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
      relations: ['lockedBy'],
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    if (!document.isLocked) {
      return {
        isLocked: false,
        canUnlock: false,
      };
    }

    const lockExpiresInMinutes = document.lockExpiresAt
      ? Math.max(
          0,
          Math.floor(
            (new Date(document.lockExpiresAt).getTime() - new Date().getTime()) /
              60000,
          ),
        )
      : undefined;

    return {
      isLocked: true,
      lockedById: document.lockedById || undefined,
      lockedByName: document.lockedBy
        ? `${document.lockedBy.firstName} ${document.lockedBy.lastName}`.trim()
        : undefined,
      lockedAt: document.lockedAt || undefined,
      lockExpiresAt: document.lockExpiresAt || undefined,
      lockExpiresInMinutes,
      canUnlock:
        document.lockedById === userId ||
        (document.lockExpiresAt
          ? new Date() > new Date(document.lockExpiresAt)
          : false),
    };
  }

  /**
   * ==================== DISTRIBUTION TRACKING ====================
   */

  async recordDistribution(
    dto: RecordDistributionDto,
    distributedBy: string,
    distributedByName: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<RecordDistributionResponseDto> {
    // Verify version exists
    const version = await this.versionRepository.findOne({
      where: { id: dto.versionId },
    });

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    const distribution = this.distributionRepository.create({
      versionId: dto.versionId,
      distributionType: dto.distributionType as DistributionType,
      recipientId: dto.recipientId,
      recipientName: dto.recipientName,
      recipientEmail: dto.recipientEmail || null,
      recipientCompany: dto.recipientCompany || null,
      distributedBy,
      distributedByName,
      transmittalNumber: dto.transmittalNumber || null,
      referenceNumber: dto.referenceNumber || null,
      notes: dto.notes || null,
      metadata: metadata || null,
    });

    const saved = await this.distributionRepository.save(distribution);

    this.logger.log(
      `Distribution recorded: Version ${dto.versionId} distributed to ${dto.recipientName} via ${dto.distributionType}`,
    );

    return {
      success: true,
      distributionId: saved.id,
      message: 'Distribution recorded successfully',
    };
  }

  /**
   * ==================== HELPERS ====================
   */

  /**
   * Record lock history
   */
  private async recordLockHistory(
    documentId: string,
    userId: string,
    userName: string,
    action: LockAction,
    options?: {
      ipAddress?: string;
      userAgent?: string;
      reason?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<void> {
    const history = this.lockHistoryRepository.create({
      documentId,
      action,
      userId,
      userName,
      ipAddress: options?.ipAddress || null,
      userAgent: options?.userAgent || null,
      reason: options?.reason || null,
      metadata: options?.metadata || null,
    });

    await this.lockHistoryRepository.save(history);
  }
}
