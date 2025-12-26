/**
 * Document Intelligence Service
 * AI-powered document analysis, summarization, and Q&A
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from './ai.service';
import { AiOperationType } from '../constants/ai-config.constants';
import {
  DocumentSummaryRequest,
  DocumentSummaryResponse,
  DocumentQARequest,
  DocumentQAResponse,
  DocumentComparisonRequest,
  DocumentComparisonResponse,
  KeyInfoExtractionRequest,
  KeyInfoExtractionResponse,
  ConflictDetectionRequest,
  ConflictDetectionResponse,
  SuggestRelatedDocsRequest,
  SuggestRelatedDocsResponse,
} from '../interfaces/ai-operation.interface';
import { Document } from '../../documents/entities/document.entity';
import { DocumentVersion } from '../../documents/entities/document-version.entity';

@Injectable()
export class DocumentIntelligenceService {
  private readonly logger = new Logger(DocumentIntelligenceService.name);

  constructor(
    private aiService: AiService,
    @InjectRepository(Document)
    private documentRepo: Repository<Document>,
    @InjectRepository(DocumentVersion)
    private documentVersionRepo: Repository<DocumentVersion>,
  ) {}

  /**
   * Summarize a document
   */
  async summarizeDocument(
    request: DocumentSummaryRequest,
  ): Promise<DocumentSummaryResponse> {
    this.logger.debug(
      `Summarizing document: ${request.documentId} (${request.documentTitle})`,
    );

    const response = await this.aiService.executeOperation<DocumentSummaryResponse>(
      request,
      {
        documentTitle: request.documentTitle,
        documentType: request.documentType,
        documentContent: request.documentContent,
      },
    );

    return response.result;
  }

  /**
   * Answer questions about a document
   */
  async answerQuestion(
    request: DocumentQARequest,
  ): Promise<DocumentQAResponse> {
    this.logger.debug(
      `Answering question about document: ${request.documentId} | Q: ${request.question}`,
    );

    const response = await this.aiService.executeOperation<DocumentQAResponse>(
      request,
      {
        question: request.question,
        documentTitle: request.documentTitle,
        documentContent: request.documentContent,
      },
    );

    return response.result;
  }

  /**
   * Compare two document versions
   */
  async compareVersions(
    request: DocumentComparisonRequest,
  ): Promise<DocumentComparisonResponse> {
    this.logger.debug(
      `Comparing document versions: ${request.document1Id} vs ${request.document2Id}`,
    );

    const response = await this.aiService.executeOperation<DocumentComparisonResponse>(
      request,
      {
        version1Date: request.version1Date,
        version1Content: request.version1Content,
        version2Date: request.version2Date,
        version2Content: request.version2Content,
      },
    );

    return response.result;
  }

  /**
   * Extract key information from a document
   */
  async extractKeyInfo(
    request: KeyInfoExtractionRequest,
  ): Promise<KeyInfoExtractionResponse> {
    this.logger.debug(
      `Extracting key info from document: ${request.documentId}`,
    );

    const response = await this.aiService.executeOperation<KeyInfoExtractionResponse>(
      request,
      {
        documentTitle: request.documentTitle,
        documentType: request.documentType,
        documentContent: request.documentContent,
      },
    );

    return response.result;
  }

  /**
   * Detect conflicts between documents
   */
  async detectConflicts(
    request: ConflictDetectionRequest,
  ): Promise<ConflictDetectionResponse> {
    this.logger.debug(
      `Detecting conflicts across ${request.documents.length} documents`,
    );

    const response = await this.aiService.executeOperation<ConflictDetectionResponse>(
      request,
      {
        documents: request.documents,
      },
    );

    return response.result;
  }

  /**
   * Suggest related documents
   */
  async suggestRelatedDocs(
    request: SuggestRelatedDocsRequest,
  ): Promise<SuggestRelatedDocsResponse> {
    this.logger.debug(
      `Finding related documents for: ${request.currentDocId}`,
    );

    const response = await this.aiService.executeOperation<SuggestRelatedDocsResponse>(
      request,
      {
        currentDocTitle: request.currentDocTitle,
        currentDocContent: request.currentDocContent,
        availableDocs: request.availableDocs,
      },
    );

    return response.result;
  }

  /**
   * Helper: Get document by ID with OCR text
   */
  async getDocumentWithContent(
    documentId: string,
    projectId: string,
  ): Promise<{ document: Document; content: string }> {
    const document = await this.documentRepo.findOne({
      where: { id: documentId, projectId },
      relations: ['currentVersion'],
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    // Get OCR text or file content
    let content = '';

    if (document.currentVersion?.ocrText) {
      content = document.currentVersion.ocrText;
    } else if (document.currentVersion) {
      // If no OCR text, we might need to extract it
      // For now, use a placeholder
      content = `[Document: ${document.name}, Type: ${document.documentType}]`;
    }

    return { document, content };
  }

  /**
   * Helper: Batch summarize multiple documents
   */
  async batchSummarize(
    projectId: string,
    userId: string,
    documentIds: string[],
  ): Promise<
    Array<{
      documentId: string;
      summary?: DocumentSummaryResponse;
      error?: string;
    }>
  > {
    const results: Array<{
      documentId: string;
      summary?: DocumentSummaryResponse;
      error?: string;
    }> = [];

    for (const documentId of documentIds) {
      try {
        const { document, content } = await this.getDocumentWithContent(
          documentId,
          projectId,
        );

        const summary = await this.summarizeDocument({
          projectId,
          userId,
          operationType: AiOperationType.DOCUMENT_SUMMARY,
          documentId,
          documentTitle: document.name,
          documentType: document.documentType,
          documentContent: content,
        });

        results.push({ documentId, summary });
      } catch (error: any) {
        this.logger.error(
          `Failed to summarize document ${documentId}: ${error.message}`,
        );
        results.push({
          documentId,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Helper: Find documents similar to a query
   */
  async findSimilarDocuments(
    projectId: string,
    userId: string,
    queryDocumentId: string,
    limit: number = 5,
  ): Promise<
    Array<{
      documentId: string;
      documentName: string;
      relevanceScore: number;
      reason: string;
    }>
  > {
    // Get the query document
    const { document: queryDoc, content: queryContent } =
      await this.getDocumentWithContent(queryDocumentId, projectId);

    // Get all other documents in the project
    const allDocs = await this.documentRepo.find({
      where: { projectId },
      relations: ['currentVersion'],
    });

    // Filter out the query document
    const candidateDocs = allDocs
      .filter((doc) => doc.id !== queryDocumentId)
      .map((doc) => ({
        id: doc.id,
        title: doc.name,
        type: doc.documentType,
        summary: doc.currentVersion?.ocrText
          ? doc.currentVersion.ocrText.substring(0, 500)
          : '',
      }));

    if (candidateDocs.length === 0) {
      return [];
    }

    // Ask AI to find related documents
    const result = await this.suggestRelatedDocs({
      projectId,
      userId,
      operationType: AiOperationType.SUGGEST_RELATED_DOCS,
      currentDocId: queryDocumentId,
      currentDocTitle: queryDoc.name,
      currentDocContent: queryContent,
      availableDocs: candidateDocs,
    });

    return result.suggestions
      .slice(0, limit)
      .map((suggestion) => ({
        documentId: suggestion.documentId,
        documentName:
          candidateDocs.find((d) => d.id === suggestion.documentId)?.title ||
          'Unknown',
        relevanceScore: suggestion.relevanceScore,
        reason: suggestion.reason,
      }));
  }

  /**
   * Helper: Detect conflicts in a document set
   */
  async detectConflictsInSet(
    projectId: string,
    userId: string,
    documentIds: string[],
  ): Promise<ConflictDetectionResponse> {
    const documents = await Promise.all(
      documentIds.map(async (id) => {
        const { document, content } = await this.getDocumentWithContent(
          id,
          projectId,
        );
        return {
          id: document.id,
          title: document.name,
          type: document.documentType,
          content,
        };
      }),
    );

    return this.detectConflicts({
      projectId,
      userId,
      operationType: AiOperationType.CONFLICT_DETECTION,
      documents,
    });
  }

  /**
   * Helper: Auto-process new document
   * Runs summarization and key info extraction automatically
   */
  async autoProcessDocument(
    projectId: string,
    userId: string,
    documentId: string,
  ): Promise<{
    summary: DocumentSummaryResponse;
    keyInfo: KeyInfoExtractionResponse;
  }> {
    const { document, content } = await this.getDocumentWithContent(
      documentId,
      projectId,
    );

    // Run in parallel
    const [summary, keyInfo] = await Promise.all([
      this.summarizeDocument({
        projectId,
        userId,
        operationType: AiOperationType.DOCUMENT_SUMMARY,
        documentId,
        documentTitle: document.name,
        documentType: document.documentType,
        documentContent: content,
      }),
      this.extractKeyInfo({
        projectId,
        userId,
        operationType: AiOperationType.KEY_INFO_EXTRACTION,
        documentId,
        documentTitle: document.name,
        documentType: document.documentType,
        documentContent: content,
      }),
    ]);

    this.logger.log(
      `Auto-processed document ${documentId}: ${summary.keyPoints.length} key points, ${keyInfo.dates.length} dates extracted`,
    );

    return { summary, keyInfo };
  }
}
