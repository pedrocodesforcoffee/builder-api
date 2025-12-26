import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ConfigService } from '@nestjs/config';
import { Repository, MoreThan } from 'typeorm';
import { Document } from '../entities/document.entity';
import { DocumentVersion } from '../entities/document-version.entity';
import { Drawing } from '../entities/drawing.entity';
import { Specification } from '../entities/specification.entity';
import { SavedSearchService } from '../services/saved-search.service';
import { AlertFrequency } from '../entities/saved-search.entity';
import {
  ELASTICSEARCH_INDEX_NAME,
  ELASTICSEARCH_INDEX_ALIAS,
  documentIndexConfig,
} from '../config/elasticsearch-index.config';

/**
 * Index Sync Job
 *
 * Synchronizes document changes to Elasticsearch index.
 *
 * Schedule: Every 5 minutes
 *
 * Functionality:
 * - Sync new and updated documents to Elasticsearch
 * - Update document permissions for security filtering
 * - Build autocomplete suggestions
 * - Trigger instant alerts for saved searches
 * - Maintain index health
 */
@Injectable()
export class IndexSyncJob {
  private readonly logger = new Logger(IndexSyncJob.name);
  private lastSyncTime: Date = new Date(0); // Initialize to epoch
  private readonly elasticsearchEnabled: boolean;

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(DocumentVersion)
    private readonly versionRepo: Repository<DocumentVersion>,
    @InjectRepository(Drawing)
    private readonly drawingRepo: Repository<Drawing>,
    @InjectRepository(Specification)
    private readonly specRepo: Repository<Specification>,
    private readonly savedSearchService: SavedSearchService,
    private readonly configService: ConfigService,
  ) {
    this.elasticsearchEnabled = this.configService.get<string>('ELASTICSEARCH_ENABLED', 'false') === 'true';
    if (!this.elasticsearchEnabled) {
      this.logger.log('Elasticsearch is disabled. IndexSyncJob will not run.');
    }
  }

  /**
   * Initialize Elasticsearch index on module load
   */
  async onModuleInit() {
    if (!this.elasticsearchEnabled) {
      return;
    }
    await this.ensureIndexExists();
  }

  /**
   * Sync documents every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncDocuments() {
    if (!this.elasticsearchEnabled) {
      return;
    }

    this.logger.log('Starting document sync to Elasticsearch...');

    try {
      const startTime = Date.now();

      // Get documents updated since last sync
      const updatedDocuments = await this.documentRepo.find({
        where: {
          updatedAt: MoreThan(this.lastSyncTime),
        },
        relations: ['currentVersion'],
        take: 500, // Process in batches
      });

      this.logger.log(`Found ${updatedDocuments.length} documents to sync`);

      let successCount = 0;
      let errorCount = 0;

      for (const document of updatedDocuments) {
        try {
          await this.indexDocument(document);
          successCount++;

          // Check instant alerts for this document
          await this.savedSearchService.checkInstantAlerts(
            document.projectId,
            document.id,
          );
        } catch (error) {
          this.logger.error(`Failed to index document ${document.id}:`, error);
          errorCount++;
        }
      }

      // Update last sync time
      this.lastSyncTime = new Date();

      const duration = Date.now() - startTime;
      this.logger.log(
        `Sync completed: ${successCount} indexed, ${errorCount} failed (${duration}ms)`,
      );
    } catch (error) {
      this.logger.error('Document sync error:', error);
    }
  }

  /**
   * Index a single document to Elasticsearch
   *
   * @param document - Document to index
   */
  async indexDocument(document: Document): Promise<void> {
    try {
      // Get related data based on document type
      let drawing: Drawing | null = null;
      let specification: Specification | null = null;

      if ((document.documentType as any) === 'DRAWING' || (document.documentType as any) === 'DRAWING_SET') {
        drawing = await this.drawingRepo.findOne({
          where: { documentId: document.id },
        });
      } else if ((document.documentType as any) === 'SPECIFICATION') {
        specification = await this.specRepo.findOne({
          where: { documentId: document.id },
        });
      }

      // Build Elasticsearch document
      const esDocument: any = {
        documentId: document.id,
        projectId: document.projectId,
        folderId: document.folderId,
        name: document.name,
        description: document.description || undefined,
        documentType: document.documentType,
        mimeType: (document as any).currentVersion?.mimeType || 'application/octet-stream',
        fileSize: (document as any).currentVersion?.fileSize || 0,
        status: document.status,
        tags: document.tags || [],
        createdBy: (document as any).createdBy?.id || undefined,
        createdByName: (document as any).createdBy?.name || undefined,
        modifiedBy: (document as any).modifiedBy?.id || undefined,
        modifiedByName: (document as any).modifiedBy?.name || undefined,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,

        // Version info
        versionNumber: document.currentVersion?.versionNumber || '1.0',
        versionComment: document.currentVersion?.versionComment || undefined,

        // Drawing-specific fields
        drawingNumber: (drawing as any)?.drawingNumber || undefined,
        discipline: drawing?.discipline || undefined,

        // Specification-specific fields
        specSection: (specification as any)?.specSection || undefined,
        division: specification?.division || undefined,

        // Content (would come from OCR/text extraction)
        content: undefined, // TODO: Implement OCR/extraction

        // Permission fields (simplified - should query actual permissions)
        allowedUserIds: [],
        allowedRoles: [],
        allowedDisciplines: [],
        isPublic: false, // Default to false for security
        restrictedIpRanges: [],

        // Related documents (would query cross-references)
        relatedDocumentIds: [],

        // Autocomplete suggestion
        suggest: {
          input: [
            document.name,
            ...((drawing as any)?.drawingNumber ? [(drawing as any).drawingNumber] : []),
            ...((specification as any)?.specSection ? [(specification as any).specSection] : []),
          ],
          contexts: {
            project: [document.projectId],
            documentType: [document.documentType],
          },
        },

        // Metadata (flexible storage)
        metadata: {
          originalFilename: document.currentVersion?.originalFilename,
        },
      };

      // Index to Elasticsearch
      await this.elasticsearchService.index({
        index: ELASTICSEARCH_INDEX_NAME,
        id: document.id,
        body: esDocument,
        refresh: true,
      });
    } catch (error) {
      this.logger.error(`Index document error for ${document.id}:`, error);
      throw error;
    }
  }

  /**
   * Delete document from index
   *
   * @param documentId - Document to remove
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      await this.elasticsearchService.delete({
        index: ELASTICSEARCH_INDEX_NAME,
        id: documentId,
      });
    } catch (error: any) {
      if (error.statusCode !== 404) {
        this.logger.error(`Delete document error for ${documentId}:`, error);
      }
    }
  }

  /**
   * Ensure Elasticsearch index exists with correct mappings
   */
  private async ensureIndexExists(): Promise<void> {
    try {
      // Check if index exists
      const exists = await this.elasticsearchService.indices.exists({
        index: ELASTICSEARCH_INDEX_NAME,
      });

      if (!exists) {
        this.logger.log(`Creating Elasticsearch index: ${ELASTICSEARCH_INDEX_NAME}`);

        // Create index with settings and mappings
        await this.elasticsearchService.indices.create({
          index: ELASTICSEARCH_INDEX_NAME,
          body: documentIndexConfig as any,
        });

        // Create alias
        await this.elasticsearchService.indices.updateAliases({
          body: {
            actions: [
              {
                add: {
                  index: ELASTICSEARCH_INDEX_NAME,
                  alias: ELASTICSEARCH_INDEX_ALIAS,
                },
              },
            ],
          } as any,
        });

        this.logger.log('Elasticsearch index created successfully');
      } else {
        this.logger.log('Elasticsearch index already exists');
      }
    } catch (error) {
      this.logger.error('Ensure index exists error:', error);
    }
  }

  /**
   * Rebuild entire index (manual operation)
   *
   * Should be called manually when index structure changes
   */
  async rebuildIndex(): Promise<void> {
    this.logger.log('Starting full index rebuild...');

    try {
      // Delete existing index
      const exists = await this.elasticsearchService.indices.exists({
        index: ELASTICSEARCH_INDEX_NAME,
      });

      if (exists) {
        await this.elasticsearchService.indices.delete({
          index: ELASTICSEARCH_INDEX_NAME,
        });
      }

      // Recreate index
      await this.ensureIndexExists();

      // Reset last sync time to force full sync
      this.lastSyncTime = new Date(0);

      // Trigger sync
      await this.syncDocuments();

      this.logger.log('Index rebuild completed');
    } catch (error) {
      this.logger.error('Rebuild index error:', error);
      throw error;
    }
  }
}
