import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import {
  Document,
  DocumentVersion,
  DrawingSet,
  Drawing,
  DrawingCrossReference,
  DrawingRevision,
  Specification,
  DocumentAuditLog,
  Addendum,
  AddendumSection,
  SpecificationProduct,
  SpecificationDrawing,
  SpecificationRfi,
  ProjectMember,
  FolderPermission,
  DocumentPermission,
  DocumentRestriction,
  ShareLink,
  DocumentAccessLog,
  Transmittal,
  TransmittalDocument,
  TransmittalRecipient,
  DistributionList,
  DistributionListMember,
  UserDocumentActivity,
  UserFavorite,
  SavedSearch,
  SearchLog,
} from './entities';
import { DocumentUpload } from './entities/document-upload.entity';
import { VersionDistribution } from './entities/version-distribution.entity';
import { DocumentLockHistory } from './entities/document-lock-history.entity';
import { DocumentService } from './services/document.service';
import { DocumentUploadService } from './services/document-upload.service';
import { VersionControlService } from './services/version-control.service';
import { DrawingSetService } from './services/drawing-set.service';
import { DrawingService } from './services/drawing.service';
import { SpecificationService } from './services/specification.service';
import { AddendumService } from './services/addendum.service';
import { PermissionService } from './services/permission.service';
import { WatermarkService } from './services/watermark.service';
import { ShareLinkService } from './services/share-link.service';
import { TransmittalService } from './services/transmittal.service';
import { DocumentController } from './controllers/document.controller';
import { DocumentUploadController } from './controllers/document-upload.controller';
import { DocumentSimpleUploadController } from './controllers/document-simple-upload.controller';
import { VersionControlController } from './controllers/version-control.controller';
import { DrawingSetController } from './controllers/drawing-set.controller';
import { DrawingController } from './controllers/drawing.controller';
import { SpecificationController } from './controllers/specification.controller';
import { AddendumController } from './controllers/addendum.controller';
import { ProjectMemberController } from './controllers/project-member.controller';
import { PermissionController } from './controllers/permission.controller';
import { ShareLinkController } from './controllers/share-link.controller';
import { TransmittalController } from './controllers/transmittal.controller';
import { StorageQuotaGuard } from './guards/storage-quota.guard';
import { S3Service } from '../../common/services/s3.service';
import { QUEUE_NAMES } from './constants/queue-names';
import { VirusScanProcessor } from './processors/virus-scan.processor';
import { ThumbnailProcessor } from './processors/thumbnail.processor';
import { OcrProcessor } from './processors/ocr.processor';
import { MetadataProcessor } from './processors/metadata.processor';
import { UploadCleanupJob } from './jobs/upload-cleanup.job';
import { LockExpirationJob } from './jobs/lock-expiration.job';
import { SearchService } from './services/search.service';
import { ActivityService } from './services/activity.service';
import { SavedSearchService } from './services/saved-search.service';
import { SearchAnalyticsService } from './services/search-analytics.service';
import { SearchController } from './controllers/search.controller';
import { ActivityController } from './controllers/activity.controller';
import { SavedSearchController } from './controllers/saved-search.controller';
import { IndexSyncJob } from './jobs/index-sync.job';
import { AlertProcessingJob } from './jobs/alert-processing.job';

/**
 * Documents Module
 *
 * Core module for document management system.
 * Provides complete document upload, storage, versioning, and permission management.
 *
 * Features:
 * - Advanced upload system with multipart support
 * - Document storage and versioning
 * - Drawing management with CSI organization
 * - Specification management with MasterFormat
 * - Comprehensive audit logging
 * - Hybrid RBAC + document-level permissions
 * - External sharing with security controls
 * - Document watermarking (PDF & images)
 * - Formal transmittal distribution
 *
 * Upload System:
 * - Single and multipart uploads via pre-signed S3 URLs
 * - Large file support (up to 5GB)
 * - Direct-to-S3 uploads for performance
 * - Upload tracking and status monitoring
 *
 * Permission System:
 * - Role-based access control (14 project roles)
 * - Folder-level permissions with inheritance
 * - Document-level permission overrides
 * - IP restrictions and discipline-specific access
 * - Complete access audit trail
 *
 * Distribution System:
 * - External share links with password/email verification
 * - Formal transmittals with cover sheets
 * - Dynamic watermarking for security
 * - Distribution lists with auto-computed membership
 * - Acknowledgment tracking
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      Document,
      DocumentVersion,
      DrawingSet,
      Drawing,
      DrawingCrossReference,
      DrawingRevision,
      Specification,
      DocumentAuditLog,
      DocumentUpload,
      VersionDistribution,
      DocumentLockHistory,
      Addendum,
      AddendumSection,
      SpecificationProduct,
      SpecificationDrawing,
      SpecificationRfi,
      // Permission & Distribution entities
      ProjectMember,
      FolderPermission,
      DocumentPermission,
      DocumentRestriction,
      ShareLink,
      DocumentAccessLog,
      Transmittal,
      TransmittalDocument,
      TransmittalRecipient,
      DistributionList,
      DistributionListMember,
      // Search & Discovery entities
      UserDocumentActivity,
      UserFavorite,
      SavedSearch,
      SearchLog,
    ]),
    // ElasticsearchModule.registerAsync({
    //   imports: [ConfigModule],
    //   useFactory: async (configService: ConfigService) => ({
    //     node: configService.get('ELASTICSEARCH_NODE', 'http://localhost:9200'),
    //     auth: {
    //       username: configService.get('ELASTICSEARCH_USERNAME', 'elastic'),
    //       password: configService.get('ELASTICSEARCH_PASSWORD', 'changeme'),
    //     },
    //     maxRetries: 3,
    //     requestTimeout: 60000,
    //   }),
    //   inject: [ConfigService],
    //}),
    BullModule.registerQueueAsync({
      name: QUEUE_NAMES.DOCUMENT_PROCESSING,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    DocumentController,
    DocumentUploadController,
    DocumentSimpleUploadController,
    VersionControlController,
    DrawingSetController,
    DrawingController,
    SpecificationController,
    AddendumController,
    // Permission & Distribution controllers
    ProjectMemberController,
    PermissionController,
    ShareLinkController,
    TransmittalController,
    // Search & Discovery controllers (commented out - require Elasticsearch)
    // SearchController,
    ActivityController,
    // SavedSearchController,
  ],
  providers: [
    DocumentService,
    DocumentUploadService,
    VersionControlService,
    DrawingSetService,
    DrawingService,
    SpecificationService,
    AddendumService,
    // Permission & Distribution services
    PermissionService,
    WatermarkService,
    ShareLinkService,
    TransmittalService,
    StorageQuotaGuard,
    S3Service,
    VirusScanProcessor,
    ThumbnailProcessor,
    OcrProcessor,
    MetadataProcessor,
    UploadCleanupJob,
    LockExpirationJob,
    // Search & Discovery services (commented out - require Elasticsearch)
    // SearchService,
    ActivityService,
    // SavedSearchService,
    // SearchAnalyticsService,
    // Search & Discovery jobs (commented out - require Elasticsearch)
    // IndexSyncJob,
    // AlertProcessingJob,
  ],
  exports: [
    TypeOrmModule,
    DocumentService,
    DocumentUploadService,
    VersionControlService,
    DrawingSetService,
    DrawingService,
    SpecificationService,
    AddendumService,
    PermissionService,
    WatermarkService,
    ShareLinkService,
    TransmittalService,
    S3Service,
    // Search & Discovery services (commented out - require Elasticsearch)
    // SearchService,
    ActivityService,
    // SavedSearchService,
    // SearchAnalyticsService,
  ],
})
export class DocumentsModule {}
