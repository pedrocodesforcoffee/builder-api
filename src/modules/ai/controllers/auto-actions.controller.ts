/**
 * Auto-Generated Actions Controller
 * API endpoints for AI-powered action suggestions and generation
 */

import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AutoActionsService } from '../services/auto-actions.service';
import { AiOperationType } from '../constants/ai-config.constants';
import {
  SuggestRfiRequestDto,
  DraftRfiQuestionRequestDto,
  GenerateSafetyObservationRequestDto,
  SuggestCostCodeRequestDto,
  AutoCategorizeDocumentRequestDto,
} from '../dto/ai-request.dto';

@Controller('ai/actions')
@UseGuards(JwtAuthGuard)
export class AutoActionsController {
  constructor(
    private autoActions: AutoActionsService,
  ) {}

  /**
   * POST /ai/actions/suggest-rfi
   * Suggest whether to create an RFI
   */
  @Post('suggest-rfi')
  async suggestRfi(
    @Body() dto: SuggestRfiRequestDto,
    @Request() req,
  ) {
    return this.autoActions.suggestRfi({
      ...dto,
      userId: req.user.userId,
      operationType: AiOperationType.SUGGEST_RFI,
    });
  }

  /**
   * POST /ai/actions/draft-rfi
   * Draft an RFI question
   */
  @Post('draft-rfi')
  async draftRfi(
    @Body() dto: DraftRfiQuestionRequestDto,
    @Request() req,
  ) {
    return this.autoActions.draftRfiQuestion({
      ...dto,
      userId: req.user.userId,
      operationType: AiOperationType.DRAFT_RFI_QUESTION,
    });
  }

  /**
   * POST /ai/actions/generate-safety-observation
   * Generate a safety observation
   */
  @Post('generate-safety-observation')
  async generateSafetyObservation(
    @Body() dto: GenerateSafetyObservationRequestDto,
    @Request() req,
  ) {
    return this.autoActions.generateSafetyObservation({
      ...dto,
      userId: req.user.userId,
      operationType: AiOperationType.GENERATE_SAFETY_OBSERVATION,
    });
  }

  /**
   * POST /ai/actions/suggest-cost-code
   * Suggest cost code for an expense
   */
  @Post('suggest-cost-code')
  async suggestCostCode(
    @Body() dto: SuggestCostCodeRequestDto,
    @Request() req,
  ) {
    return this.autoActions.suggestCostCode({
      ...dto,
      userId: req.user.userId,
      operationType: AiOperationType.SUGGEST_COST_CODE,
    });
  }

  /**
   * POST /ai/actions/categorize-document
   * Auto-categorize a document
   */
  @Post('categorize-document')
  async categorizeDocument(
    @Body() dto: AutoCategorizeDocumentRequestDto,
    @Request() req,
  ) {
    return this.autoActions.categorizeDocument({
      ...dto,
      userId: req.user.userId,
      operationType: AiOperationType.AUTO_CATEGORIZE_DOCUMENT,
    });
  }

  /**
   * POST /ai/actions/analyze-field-note
   * Analyze a field note for RFI creation
   */
  @Post('analyze-field-note')
  async analyzeFieldNote(
    @Body() body: {
      projectId: string;
      fieldNoteDescription: string;
      relatedDocIds: string[];
      projectType: string;
      currentPhase: string;
    },
    @Request() req,
  ) {
    return this.autoActions.analyzeFieldNote(
      body.projectId,
      req.user.userId,
      body.fieldNoteDescription,
      body.relatedDocIds,
      body.projectType,
      body.currentPhase,
    );
  }

  /**
   * POST /ai/actions/batch-suggest-cost-codes
   * Batch suggest cost codes for multiple expenses
   */
  @Post('batch-suggest-cost-codes')
  async batchSuggestCostCodes(
    @Body() body: {
      projectId: string;
      expenses: Array<{
        id: string;
        description: string;
        amount: number;
        vendor: string;
      }>;
    },
    @Request() req,
  ) {
    return this.autoActions.batchSuggestCostCodes(
      body.projectId,
      req.user.userId,
      body.expenses,
    );
  }

  /**
   * POST /ai/actions/generate-safety-observations-from-daily-report
   * Generate safety observations from a daily report
   */
  @Post('generate-safety-observations-from-daily-report')
  async generateFromDailyReport(
    @Body() body: {
      projectId: string;
      dailyReportNotes: string;
      photos: Array<{
        url: string;
        caption?: string;
        aiAnalysis?: string;
      }>;
      location: string;
    },
    @Request() req,
  ) {
    return this.autoActions.generateSafetyObservationsFromDailyReport(
      body.projectId,
      req.user.userId,
      body.dailyReportNotes,
      body.photos,
      body.location,
    );
  }

  /**
   * POST /ai/actions/auto-categorize-uploads
   * Auto-categorize uploaded documents
   */
  @Post('auto-categorize-uploads')
  async autoCategorizeUploads(
    @Body() body: {
      projectId: string;
      files: Array<{
        id: string;
        filename: string;
        contentPreview: string;
      }>;
      availableCategories: string[];
    },
    @Request() req,
  ) {
    return this.autoActions.autoCategorizeUploads(
      body.projectId,
      req.user.userId,
      body.files,
      body.availableCategories,
    );
  }
}
