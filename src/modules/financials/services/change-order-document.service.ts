import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ChangeOrderDocument } from '../entities/change-order-document.entity';
import { ChangeOrderHistory } from '../entities/change-order-history.entity';
import { OwnerChangeOrder } from '../entities/owner-change-order.entity';
import { CommitmentChangeOrder } from '../entities/commitment-change-order.entity';
import { AddCODocumentDto } from '../dto';
import { CoDocumentType } from '../enums/co-document-type.enum';
import { CoAction } from '../enums/co-action.enum';

/**
 * Change Order Document Service
 *
 * Manages document attachments for Owner Change Orders (OCO) and
 * Commitment Change Orders (CCO).
 *
 * Features:
 * - Document upload and management
 * - Type-based document categorization
 * - Audit trail integration
 * - T&M backup documentation support
 */
@Injectable()
export class ChangeOrderDocumentService {
  private readonly logger = new Logger(ChangeOrderDocumentService.name);

  constructor(
    @InjectRepository(ChangeOrderDocument)
    private readonly documentRepo: Repository<ChangeOrderDocument>,
    @InjectRepository(ChangeOrderHistory)
    private readonly historyRepo: Repository<ChangeOrderHistory>,
    @InjectRepository(OwnerChangeOrder)
    private readonly ocoRepo: Repository<OwnerChangeOrder>,
    @InjectRepository(CommitmentChangeOrder)
    private readonly ccoRepo: Repository<CommitmentChangeOrder>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Get all documents for a change order
   *
   * Retrieves all documents attached to an OCO or CCO.
   *
   * @param changeOrderId - Change order ID
   * @param type - Change order type ('OCO' or 'CCO')
   * @returns Array of documents
   */
  async getDocuments(
    changeOrderId: string,
    type: 'OCO' | 'CCO',
  ): Promise<ChangeOrderDocument[]> {
    this.logger.debug(`Fetching documents for ${type} ${changeOrderId}`);

    const documents = await this.documentRepo.find({
      where: {
        changeOrderId,
        changeOrderType: type,
      },
      relations: ['uploadedByUser'],
      order: { uploadedAt: 'DESC' },
    });

    this.logger.debug(`Found ${documents.length} documents`);
    return documents;
  }

  /**
   * Add a document to a change order
   *
   * Uploads a document and creates an audit trail entry.
   * Validates that the change order exists before adding the document.
   *
   * @param changeOrderId - Change order ID
   * @param type - Change order type ('OCO' or 'CCO')
   * @param dto - Document details
   * @param userId - User ID performing the action
   * @returns Created document
   */
  async addDocument(
    changeOrderId: string,
    type: 'OCO' | 'CCO',
    dto: AddCODocumentDto,
    userId: string,
  ): Promise<ChangeOrderDocument> {
    this.logger.log(`Adding document to ${type} ${changeOrderId} by user ${userId}`);

    // Validate change order exists
    await this.validateChangeOrderExists(changeOrderId, type);

    return await this.dataSource.transaction(async (manager) => {
      // Create document
      const document = manager.create(ChangeOrderDocument, {
        changeOrderId,
        changeOrderType: type,
        documentType: dto.documentType,
        fileName: dto.fileName,
        fileUrl: dto.fileUrl,
        fileSize: dto.fileSize,
        mimeType: dto.mimeType,
        description: dto.description,
        uploadedBy: userId,
      });

      const savedDocument = await manager.save(ChangeOrderDocument, document);

      // Create history entry
      const historyEntry = manager.create(ChangeOrderHistory, {
        changeOrderId,
        changeOrderType: type,
        action: CoAction.DOCUMENT_ADDED,
        performedBy: userId,
        changes: {
          documentId: savedDocument.id,
          documentType: dto.documentType,
          fileName: dto.fileName,
          fileSize: dto.fileSize,
        },
        notes: `Document "${dto.fileName}" added`,
      });

      await manager.save(ChangeOrderHistory, historyEntry);

      this.logger.log(`Document ${savedDocument.id} added successfully`);

      return savedDocument;
    });
  }

  /**
   * Remove a document from a change order
   *
   * Deletes a document and creates an audit trail entry.
   *
   * @param documentId - Document ID
   * @param userId - User ID performing the action
   */
  async removeDocument(documentId: string, userId: string): Promise<void> {
    this.logger.log(`Removing document ${documentId} by user ${userId}`);

    const document = await this.documentRepo.findOne({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    await this.dataSource.transaction(async (manager) => {
      // Create history entry before deletion
      const historyEntry = manager.create(ChangeOrderHistory, {
        changeOrderId: document.changeOrderId,
        changeOrderType: document.changeOrderType,
        action: CoAction.DOCUMENT_REMOVED,
        performedBy: userId,
        changes: {
          documentId: document.id,
          documentType: document.documentType,
          fileName: document.fileName,
          fileSize: document.fileSize,
        },
        notes: `Document "${document.fileName}" removed`,
      });

      await manager.save(ChangeOrderHistory, historyEntry);

      // Delete document
      await manager.remove(ChangeOrderDocument, document);

      this.logger.log(`Document ${documentId} removed successfully`);
    });
  }

  /**
   * Get documents by type
   *
   * Filters documents by their classification type.
   * Useful for retrieving specific document categories (e.g., all T&M records).
   *
   * @param changeOrderId - Change order ID
   * @param type - Change order type ('OCO' or 'CCO')
   * @param documentType - Document classification type
   * @returns Array of documents matching the type
   */
  async getDocumentsByType(
    changeOrderId: string,
    type: 'OCO' | 'CCO',
    documentType: CoDocumentType,
  ): Promise<ChangeOrderDocument[]> {
    this.logger.debug(
      `Fetching ${documentType} documents for ${type} ${changeOrderId}`,
    );

    const documents = await this.documentRepo.find({
      where: {
        changeOrderId,
        changeOrderType: type,
        documentType,
      },
      relations: ['uploadedByUser'],
      order: { uploadedAt: 'DESC' },
    });

    this.logger.debug(`Found ${documents.length} ${documentType} documents`);
    return documents;
  }

  /**
   * Validate that a change order exists
   *
   * @param changeOrderId - Change order ID
   * @param type - Change order type ('OCO' or 'CCO')
   */
  private async validateChangeOrderExists(
    changeOrderId: string,
    type: 'OCO' | 'CCO',
  ): Promise<void> {
    if (type === 'OCO') {
      const oco = await this.ocoRepo.findOne({
        where: { id: changeOrderId },
      });
      if (!oco) {
        throw new NotFoundException(`OCO with ID ${changeOrderId} not found`);
      }
    } else {
      const cco = await this.ccoRepo.findOne({
        where: { id: changeOrderId },
      });
      if (!cco) {
        throw new NotFoundException(`CCO with ID ${changeOrderId} not found`);
      }
    }
  }

  /**
   * Get document statistics for a change order
   *
   * Returns counts by document type for reporting purposes.
   *
   * @param changeOrderId - Change order ID
   * @param type - Change order type ('OCO' or 'CCO')
   * @returns Document statistics by type
   */
  async getDocumentStats(
    changeOrderId: string,
    type: 'OCO' | 'CCO',
  ): Promise<{
    totalCount: number;
    totalSize: number;
    byType: Record<CoDocumentType, number>;
  }> {
    this.logger.debug(`Getting document stats for ${type} ${changeOrderId}`);

    const documents = await this.getDocuments(changeOrderId, type);

    const stats = {
      totalCount: documents.length,
      totalSize: documents.reduce((sum, doc) => sum + Number(doc.fileSize), 0),
      byType: {} as Record<CoDocumentType, number>,
    };

    // Initialize all document types with 0
    Object.values(CoDocumentType).forEach((docType) => {
      stats.byType[docType] = 0;
    });

    // Count documents by type
    documents.forEach((doc) => {
      stats.byType[doc.documentType] = (stats.byType[doc.documentType] || 0) + 1;
    });

    return stats;
  }

  /**
   * Validate T&M documentation completeness
   *
   * Checks if a T&M change order has required backup documentation.
   *
   * @param changeOrderId - Change order ID
   * @param type - Change order type ('OCO' or 'CCO')
   * @returns Validation result with missing document types
   */
  async validateTMDocumentation(
    changeOrderId: string,
    type: 'OCO' | 'CCO',
  ): Promise<{
    isComplete: boolean;
    hasTMRecords: boolean;
    hasBackupDocs: boolean;
    missingTypes: CoDocumentType[];
    warnings: string[];
  }> {
    this.logger.debug(`Validating T&M documentation for ${type} ${changeOrderId}`);

    const documents = await this.getDocuments(changeOrderId, type);

    const hasTMRecords = documents.some(
      (doc) => doc.documentType === CoDocumentType.T_AND_M,
    );
    const hasBackupDocs = documents.some(
      (doc) => doc.documentType === CoDocumentType.BACKUP,
    );

    const missingTypes: CoDocumentType[] = [];
    const warnings: string[] = [];

    if (!hasTMRecords) {
      missingTypes.push(CoDocumentType.T_AND_M);
      warnings.push('T&M records are required for time and materials change orders');
    }

    if (!hasBackupDocs) {
      missingTypes.push(CoDocumentType.BACKUP);
      warnings.push('Backup documentation is recommended for audit compliance');
    }

    const isComplete = hasTMRecords && hasBackupDocs;

    return {
      isComplete,
      hasTMRecords,
      hasBackupDocs,
      missingTypes,
      warnings,
    };
  }
}
