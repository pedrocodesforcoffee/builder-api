/**
 * Document Intelligence Controller
 * API endpoints for AI-powered document analysis
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DocumentIntelligenceService } from '../services/document-intelligence.service';
import { AiOperationType } from '../constants/ai-config.constants';
import {
  DocumentSummaryRequestDto,
  DocumentQARequestDto,
  DocumentComparisonRequestDto,
  KeyInfoExtractionRequestDto,
  ConflictDetectionRequestDto,
  SuggestRelatedDocsRequestDto,
} from '../dto/ai-request.dto';

@Controller('ai/documents')
@UseGuards(JwtAuthGuard)
export class DocumentIntelligenceController {
  constructor(
    private documentIntelligence: DocumentIntelligenceService,
  ) {}

  /**
   * POST /ai/documents/summarize
   * Summarize a document
   */
  @Post('summarize')
  async summarize(@Body() dto: DocumentSummaryRequestDto, @Request() req) {
    return this.documentIntelligence.summarizeDocument({
      ...dto,
      userId: req.user.userId,
      operationType: AiOperationType.DOCUMENT_SUMMARY,
    });
  }

  /**
   * POST /ai/documents/qa
   * Ask a question about a document
   */
  @Post('qa')
  async askQuestion(@Body() dto: DocumentQARequestDto, @Request() req) {
    return this.documentIntelligence.answerQuestion({
      ...dto,
      userId: req.user.userId,
      operationType: AiOperationType.DOCUMENT_QA,
    });
  }

  /**
   * POST /ai/documents/compare
   * Compare two document versions
   */
  @Post('compare')
  async compareVersions(
    @Body() dto: DocumentComparisonRequestDto,
    @Request() req,
  ) {
    return this.documentIntelligence.compareVersions({
      ...dto,
      userId: req.user.userId,
      operationType: AiOperationType.DOCUMENT_COMPARISON,
    });
  }

  /**
   * POST /ai/documents/extract-key-info
   * Extract key information from a document
   */
  @Post('extract-key-info')
  async extractKeyInfo(
    @Body() dto: KeyInfoExtractionRequestDto,
    @Request() req,
  ) {
    return this.documentIntelligence.extractKeyInfo({
      ...dto,
      userId: req.user.userId,
      operationType: AiOperationType.KEY_INFO_EXTRACTION,
    });
  }

  /**
   * POST /ai/documents/detect-conflicts
   * Detect conflicts between documents
   */
  @Post('detect-conflicts')
  async detectConflicts(
    @Body() dto: ConflictDetectionRequestDto,
    @Request() req,
  ) {
    return this.documentIntelligence.detectConflicts({
      ...dto,
      userId: req.user.userId,
      operationType: AiOperationType.CONFLICT_DETECTION,
    });
  }

  /**
   * POST /ai/documents/suggest-related
   * Suggest related documents
   */
  @Post('suggest-related')
  async suggestRelated(
    @Body() dto: SuggestRelatedDocsRequestDto,
    @Request() req,
  ) {
    return this.documentIntelligence.suggestRelatedDocs({
      ...dto,
      userId: req.user.userId,
      operationType: AiOperationType.SUGGEST_RELATED_DOCS,
    });
  }

  /**
   * POST /ai/documents/batch-summarize
   * Batch summarize multiple documents
   */
  @Post('batch-summarize')
  async batchSummarize(
    @Body() body: { projectId: string; documentIds: string[] },
    @Request() req,
  ) {
    return this.documentIntelligence.batchSummarize(
      body.projectId,
      req.user.userId,
      body.documentIds,
    );
  }

  /**
   * GET /ai/documents/:documentId/similar
   * Find documents similar to the given document
   */
  @Get(':documentId/similar')
  async findSimilar(
    @Param('documentId') documentId: string,
    @Query('projectId') projectId: string,
    @Query('limit') limit: string = '5',
    @Request() req,
  ) {
    return this.documentIntelligence.findSimilarDocuments(
      projectId,
      req.user.userId,
      documentId,
      parseInt(limit, 10),
    );
  }

  /**
   * POST /ai/documents/detect-conflicts-in-set
   * Detect conflicts in a set of documents
   */
  @Post('detect-conflicts-in-set')
  async detectConflictsInSet(
    @Body() body: { projectId: string; documentIds: string[] },
    @Request() req,
  ) {
    return this.documentIntelligence.detectConflictsInSet(
      body.projectId,
      req.user.userId,
      body.documentIds,
    );
  }

  /**
   * POST /ai/documents/:documentId/auto-process
   * Auto-process a document (summarize + extract key info)
   */
  @Post(':documentId/auto-process')
  async autoProcess(
    @Param('documentId') documentId: string,
    @Query('projectId') projectId: string,
    @Request() req,
  ) {
    return this.documentIntelligence.autoProcessDocument(
      projectId,
      req.user.userId,
      documentId,
    );
  }
}
