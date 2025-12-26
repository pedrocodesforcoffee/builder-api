import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Ip,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { VersionControlService } from '../services/version-control.service';
import {
  CheckoutDocumentDto,
  CheckoutResponseDto,
  CheckinDocumentDto,
  CheckinResponseDto,
  ForceUnlockDto,
  ForceUnlockResponseDto,
  CompareVersionsDto,
  CompareVersionsResponseDto,
  RestoreVersionDto,
  RestoreVersionResponseDto,
  VersionHistoryResponseDto,
  RecordDistributionDto,
  RecordDistributionResponseDto,
  LockStatusDto,
} from '../dto/version-control.dto';

/**
 * Version Control Controller
 *
 * Provides complete version control endpoints for documents
 *
 * Features:
 * - Checkout/checkin workflow
 * - Version comparison
 * - Version restoration
 * - Lock management
 * - Distribution tracking
 */
@ApiTags('Document Version Control')
@Controller('api/projects/:projectId/documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VersionControlController {
  constructor(private readonly versionControlService: VersionControlService) {}

  /**
   * ==================== CHECKOUT (LOCK) ====================
   */

  @Post(':documentId/checkout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Checkout (lock) a document for editing',
    description:
      'Locks a document for exclusive editing by the current user. Prevents other users from making changes until checked in or lock expires.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiParam({
    name: 'documentId',
    description: 'Document ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Document checked out successfully',
    type: CheckoutResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Document is already locked by another user',
  })
  async checkout(
    @Param('documentId') documentId: string,
    @Body() dto: CheckoutDocumentDto,
    @Request() req: any,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<CheckoutResponseDto> {
    return this.versionControlService.checkout(documentId, req.user.id, dto, {
      name: `${req.user.firstName} ${req.user.lastName}`.trim(),
      ipAddress,
      userAgent,
    });
  }

  /**
   * ==================== CHECKIN (UNLOCK + NEW VERSION) ====================
   */

  @Post(':documentId/checkin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Checkin (unlock) a document and create new version',
    description:
      'Unlocks a document and creates a new version with the changes. Document must be locked by the current user.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiParam({
    name: 'documentId',
    description: 'Document ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Document checked in successfully',
    type: CheckinResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Document is not locked',
  })
  @ApiResponse({
    status: 403,
    description: 'Document is locked by another user',
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
  })
  async checkin(
    @Param('documentId') documentId: string,
    @Body() dto: CheckinDocumentDto,
    @Request() req: any,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<CheckinResponseDto> {
    return this.versionControlService.checkin(documentId, req.user.id, dto, {
      name: `${req.user.firstName} ${req.user.lastName}`.trim(),
      ipAddress,
      userAgent,
    });
  }

  /**
   * ==================== FORCE UNLOCK ====================
   */

  @Post(':documentId/force-unlock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Force unlock a document',
    description:
      'Forcefully unlocks a document locked by another user. Should only be used by administrators or in emergency situations.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiParam({
    name: 'documentId',
    description: 'Document ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Document forcefully unlocked',
    type: ForceUnlockResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Document is not locked',
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
  })
  async forceUnlock(
    @Param('documentId') documentId: string,
    @Body() dto: ForceUnlockDto,
    @Request() req: any,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<ForceUnlockResponseDto> {
    return this.versionControlService.forceUnlock(
      documentId,
      req.user.id,
      dto,
      {
        name: `${req.user.firstName} ${req.user.lastName}`.trim(),
        ipAddress,
        userAgent,
      },
    );
  }

  /**
   * ==================== VERSION HISTORY ====================
   */

  @Get(':documentId/versions')
  @ApiOperation({
    summary: 'Get version history',
    description: 'Retrieves the complete version history for a document.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiParam({
    name: 'documentId',
    description: 'Document ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Version history retrieved successfully',
    type: VersionHistoryResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
  })
  async getVersionHistory(
    @Param('documentId') documentId: string,
  ): Promise<VersionHistoryResponseDto> {
    return this.versionControlService.getVersionHistory(documentId);
  }

  /**
   * ==================== VERSION COMPARISON ====================
   */

  @Post(':documentId/versions/compare')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Compare two versions',
    description:
      'Compares two versions of a document and returns the differences.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiParam({
    name: 'documentId',
    description: 'Document ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Versions compared successfully',
    type: CompareVersionsResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'One or both versions not found',
  })
  async compareVersions(
    @Param('documentId') documentId: string,
    @Body() dto: CompareVersionsDto,
  ): Promise<CompareVersionsResponseDto> {
    return this.versionControlService.compareVersions(documentId, dto);
  }

  /**
   * ==================== VERSION RESTORE ====================
   */

  @Post(':documentId/versions/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restore a previous version',
    description:
      'Restores a previous version of a document. Can either create a new version or replace the current version.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiParam({
    name: 'documentId',
    description: 'Document ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Version restored successfully',
    type: RestoreVersionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Document or version not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Document is locked by another user',
  })
  async restoreVersion(
    @Param('documentId') documentId: string,
    @Body() dto: RestoreVersionDto,
    @Request() req: any,
  ): Promise<RestoreVersionResponseDto> {
    return this.versionControlService.restoreVersion(
      documentId,
      req.user.id,
      dto,
      {
        name: `${req.user.firstName} ${req.user.lastName}`.trim(),
      },
    );
  }

  /**
   * ==================== LOCK STATUS ====================
   */

  @Get(':documentId/lock-status')
  @ApiOperation({
    summary: 'Get document lock status',
    description:
      'Retrieves the current lock status of a document, including who locked it and when it expires.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiParam({
    name: 'documentId',
    description: 'Document ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Lock status retrieved successfully',
    type: LockStatusDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
  })
  async getLockStatus(
    @Param('documentId') documentId: string,
    @Request() req: any,
  ): Promise<LockStatusDto> {
    return this.versionControlService.getLockStatus(documentId, req.user.id);
  }

  /**
   * ==================== DISTRIBUTION TRACKING ====================
   */

  @Post('versions/:versionId/distributions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Record document distribution',
    description:
      'Records that a document version was distributed to a recipient. Used for compliance and audit tracking.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
  })
  @ApiParam({
    name: 'versionId',
    description: 'Version ID',
  })
  @ApiResponse({
    status: 201,
    description: 'Distribution recorded successfully',
    type: RecordDistributionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Version not found',
  })
  async recordDistribution(
    @Param('versionId') versionId: string,
    @Body() dto: RecordDistributionDto,
    @Request() req: any,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<RecordDistributionResponseDto> {
    return this.versionControlService.recordDistribution(
      { ...dto, versionId },
      req.user.id,
      `${req.user.firstName} ${req.user.lastName}`.trim(),
      {
        ipAddress,
        userAgent,
      },
    );
  }
}
