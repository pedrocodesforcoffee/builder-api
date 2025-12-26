import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../entities/document.entity';

export interface DocumentListOptions {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  limit: number;
  offset: number;
  folderId?: string | null | undefined;
}

/**
 * Document Service
 *
 * Core service for document management operations.
 */
@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
  ) {}

  /**
   * Get all documents for a project
   */
  async getProjectDocuments(
    projectId: string,
    options: DocumentListOptions,
  ): Promise<Document[]> {
    const { sortBy, sortOrder, limit, offset, folderId } = options;

    const queryBuilder = this.documentRepo
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.currentVersion', 'currentVersion')
      .where('document.projectId = :projectId', { projectId })
      .andWhere('document.deletedAt IS NULL')
      .take(limit)
      .skip(offset);

    // Filter by folder
    if (folderId !== undefined) {
      if (folderId === null) {
        // Root level - documents with no folder
        queryBuilder.andWhere('document.folderId IS NULL');
      } else {
        // Specific folder
        queryBuilder.andWhere('document.folderId = :folderId', { folderId });
      }
    }

    // Add sorting
    const allowedSortFields = ['name', 'createdAt', 'updatedAt', 'number'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'name';
    queryBuilder.orderBy(`document.${sortField}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    const documents = await queryBuilder.getMany();
    this.logger.log(`Found ${documents.length} documents for project ${projectId} (folderId: ${folderId})`);
    this.logger.log(`Documents with version data: ${JSON.stringify(documents.map(d => ({
      id: d.id,
      name: d.name,
      folderId: d.folderId,
      currentVersion: {
        id: d.currentVersion?.id,
        fileSize: d.currentVersion?.fileSize,
        mimeType: d.currentVersion?.mimeType
      }
    })))}`);

    return documents;
  }

  /**
   * Get a single document by ID
   */
  async getDocument(documentId: string): Promise<Document> {
    const document = await this.documentRepo.findOne({
      where: { id: documentId },
      relations: ['currentVersion'],
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    return document;
  }

  /**
   * Update document (move to folder, rename, etc.)
   */
  async updateDocument(
    projectId: string,
    documentId: string,
    updateDto: { folderId?: string | null; name?: string },
  ): Promise<Document> {
    this.logger.log(`[updateDocument] START - documentId: ${documentId}, updateDto: ${JSON.stringify(updateDto)}`);

    // Find document first to verify it exists
    const document = await this.documentRepo.findOne({
      where: { id: documentId, projectId },
      relations: ['currentVersion'],
    });

    if (!document) {
      this.logger.error(`[updateDocument] Document ${documentId} not found`);
      throw new NotFoundException('Document not found');
    }

    this.logger.log(`[updateDocument] Current document folderId: ${document.folderId}`);

    // Build update object
    const updates: any = {};
    if (updateDto.folderId !== undefined) {
      updates.folderId = updateDto.folderId;
    }
    if (updateDto.name !== undefined) {
      updates.name = updateDto.name;
    }

    // Use .update() method for reliable persistence
    this.logger.log(`[updateDocument] Updating document ${documentId} with: ${JSON.stringify(updates)}`);
    await this.documentRepo.update(
      { id: documentId, projectId },
      updates
    );

    this.logger.log(`[updateDocument] Document ${documentId} updated successfully`);

    // Fetch and return updated document
    const updatedDocument = await this.documentRepo.findOne({
      where: { id: documentId, projectId },
      relations: ['currentVersion'],
    });

    return updatedDocument!;
  }

  /**
   * Delete document (soft delete)
   */
  async deleteDocument(projectId: string, documentId: string): Promise<void> {
    // Find document
    const document = await this.documentRepo.findOne({
      where: { id: documentId, projectId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Soft delete (set deletedAt timestamp)
    document.deletedAt = new Date();
    await this.documentRepo.save(document);

    this.logger.log(`Document ${documentId} soft deleted`);
  }
}
