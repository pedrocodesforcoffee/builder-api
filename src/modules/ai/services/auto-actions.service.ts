/**
 * Auto-Generated Actions Service
 * AI-powered automatic action suggestions and generation
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from './ai.service';
import { AiOperationType } from '../constants/ai-config.constants';
import {
  SuggestRfiRequest,
  SuggestRfiResponse,
  DraftRfiQuestionRequest,
  DraftRfiQuestionResponse,
  GenerateSafetyObservationRequest,
  GenerateSafetyObservationResponse,
  SuggestCostCodeRequest,
  SuggestCostCodeResponse,
  AutoCategorizeDocumentRequest,
  AutoCategorizeDocumentResponse,
} from '../interfaces/ai-operation.interface';
import { CostCode } from '../../financials/entities/cost-code.entity';

@Injectable()
export class AutoActionsService {
  private readonly logger = new Logger(AutoActionsService.name);

  constructor(
    private aiService: AiService,
    @InjectRepository(CostCode)
    private costCodeRepo: Repository<CostCode>,
  ) {}

  /**
   * Suggest whether an RFI should be created
   */
  async suggestRfi(
    request: SuggestRfiRequest,
  ): Promise<SuggestRfiResponse> {
    this.logger.debug(
      `Analyzing issue for RFI suggestion: ${request.issueDescription.substring(0, 100)}...`,
    );

    const response = await this.aiService.executeOperation<SuggestRfiResponse>(
      request,
      {
        issueDescription: request.issueDescription,
        relatedDocs: request.relatedDocs,
        projectType: request.projectType,
        currentPhase: request.currentPhase,
      },
    );

    this.logger.log(
      `RFI suggestion: ${response.result.shouldCreateRfi ? 'YES' : 'NO'} (${response.result.confidence}% confidence)`,
    );

    return response.result;
  }

  /**
   * Draft an RFI question
   */
  async draftRfiQuestion(
    request: DraftRfiQuestionRequest,
  ): Promise<DraftRfiQuestionResponse> {
    this.logger.debug(`Drafting RFI question for issue: ${request.issueDescription.substring(0, 100)}...`);

    const response = await this.aiService.executeOperation<DraftRfiQuestionResponse>(
      request,
      {
        issueDescription: request.issueDescription,
        specSections: request.specSections,
        backgroundContext: request.backgroundContext,
      },
    );

    this.logger.log(
      `RFI drafted: "${response.result.subject}" with ${response.result.questions.length} questions`,
    );

    return response.result;
  }

  /**
   * Generate safety observation
   */
  async generateSafetyObservation(
    request: GenerateSafetyObservationRequest,
  ): Promise<GenerateSafetyObservationResponse> {
    this.logger.debug(
      `Generating safety observation for: ${request.description.substring(0, 100)}...`,
    );

    const response = await this.aiService.executeOperation<GenerateSafetyObservationResponse>(
      request,
      {
        description: request.description,
        photoAnalysis: request.photoAnalysis || 'No photo analysis available',
        location: request.location,
      },
    );

    this.logger.log(
      `Safety observation generated: ${response.result.severity} severity - ${response.result.title}`,
    );

    return response.result;
  }

  /**
   * Suggest cost code for expense
   */
  async suggestCostCode(
    request: SuggestCostCodeRequest,
  ): Promise<SuggestCostCodeResponse> {
    this.logger.debug(
      `Suggesting cost code for: ${request.expenseDescription.substring(0, 100)}... ($${request.amount})`,
    );

    const response = await this.aiService.executeOperation<SuggestCostCodeResponse>(
      request,
      {
        expenseDescription: request.expenseDescription,
        amount: request.amount,
        vendor: request.vendor,
        costCodes: request.costCodes,
      },
    );

    const topSuggestion = response.result.suggestions[0];
    this.logger.log(
      `Cost code suggested: ${topSuggestion?.costCode} (${topSuggestion?.confidence}% confidence)`,
    );

    return response.result;
  }

  /**
   * Auto-categorize document
   */
  async categorizeDocument(
    request: AutoCategorizeDocumentRequest,
  ): Promise<AutoCategorizeDocumentResponse> {
    this.logger.debug(`Categorizing document: ${request.filename}`);

    const response = await this.aiService.executeOperation<AutoCategorizeDocumentResponse>(
      request,
      {
        filename: request.filename,
        contentPreview: request.contentPreview,
        categories: request.categories,
      },
    );

    this.logger.log(
      `Document categorized: ${response.result.primaryCategory} (${response.result.confidence}% confidence)`,
    );

    return response.result;
  }

  /**
   * Helper: Analyze field note for RFI creation
   */
  async analyzeFieldNote(
    projectId: string,
    userId: string,
    fieldNoteDescription: string,
    relatedDocIds: string[],
    projectType: string,
    currentPhase: string,
  ): Promise<{
    shouldCreateRfi: boolean;
    rfiDraft?: DraftRfiQuestionResponse;
  }> {
    // First, check if an RFI should be created
    const suggestion = await this.suggestRfi({
      projectId,
      userId,
      operationType: AiOperationType.SUGGEST_RFI,
      issueDescription: fieldNoteDescription,
      relatedDocs: [], // Would load from relatedDocIds
      projectType,
      currentPhase,
    });

    if (!suggestion.shouldCreateRfi || suggestion.confidence < 70) {
      return { shouldCreateRfi: false };
    }

    // If yes, draft the RFI
    const rfiDraft = await this.draftRfiQuestion({
      projectId,
      userId,
      operationType: AiOperationType.DRAFT_RFI_QUESTION,
      issueDescription: fieldNoteDescription,
      specSections: '', // Would load from related documents
      backgroundContext: `Project Type: ${projectType}, Phase: ${currentPhase}`,
    });

    return {
      shouldCreateRfi: true,
      rfiDraft,
    };
  }

  /**
   * Helper: Auto-suggest cost codes for batch of expenses
   */
  async batchSuggestCostCodes(
    projectId: string,
    userId: string,
    expenses: Array<{
      id: string;
      description: string;
      amount: number;
      vendor: string;
    }>,
  ): Promise<
    Array<{
      expenseId: string;
      suggestions: SuggestCostCodeResponse;
    }>
  > {
    // Load available cost codes once
    const costCodes = await this.costCodeRepo.find({
      select: ['id', 'code', 'fullCode', 'name', 'description'],
      take: 100, // Limit to avoid token overflow
    });

    const results: Array<{
      expenseId: string;
      suggestions: SuggestCostCodeResponse;
    }> = [];

    for (const expense of expenses) {
      try {
        const suggestions = await this.suggestCostCode({
          projectId,
          userId,
          operationType: AiOperationType.SUGGEST_COST_CODE,
          expenseDescription: expense.description,
          amount: expense.amount,
          vendor: expense.vendor,
          costCodes,
        });

        results.push({
          expenseId: expense.id,
          suggestions,
        });
      } catch (error: any) {
        this.logger.error(
          `Failed to suggest cost code for expense ${expense.id}: ${error.message}`,
        );
      }
    }

    return results;
  }

  /**
   * Helper: Generate safety observations from daily reports
   */
  async generateSafetyObservationsFromDailyReport(
    projectId: string,
    userId: string,
    dailyReportNotes: string,
    photos: Array<{
      url: string;
      caption?: string;
      aiAnalysis?: string;
    }>,
    location: string,
  ): Promise<GenerateSafetyObservationResponse[]> {
    const observations: GenerateSafetyObservationResponse[] = [];

    // Generate observation from notes
    if (dailyReportNotes && dailyReportNotes.length > 20) {
      try {
        const observation = await this.generateSafetyObservation({
          projectId,
          userId,
          operationType: AiOperationType.GENERATE_SAFETY_OBSERVATION,
          description: dailyReportNotes,
          location,
        });

        observations.push(observation);
      } catch (error: any) {
        this.logger.error(
          `Failed to generate observation from notes: ${error.message}`,
        );
      }
    }

    // Generate observations from photos
    for (const photo of photos) {
      if (photo.aiAnalysis) {
        try {
          const observation = await this.generateSafetyObservation({
            projectId,
            userId,
            operationType: AiOperationType.GENERATE_SAFETY_OBSERVATION,
            description: photo.caption || 'Safety concern in photo',
            photoAnalysis: photo.aiAnalysis,
            location,
          });

          observations.push(observation);
        } catch (error: any) {
          this.logger.error(
            `Failed to generate observation from photo: ${error.message}`,
          );
        }
      }
    }

    this.logger.log(
      `Generated ${observations.length} safety observations from daily report`,
    );

    return observations;
  }

  /**
   * Helper: Auto-categorize uploaded documents
   */
  async autoCategorizeUploads(
    projectId: string,
    userId: string,
    files: Array<{
      id: string;
      filename: string;
      contentPreview: string;
    }>,
    availableCategories: string[],
  ): Promise<
    Array<{
      fileId: string;
      categorization: AutoCategorizeDocumentResponse;
    }>
  > {
    const results: Array<{
      fileId: string;
      categorization: AutoCategorizeDocumentResponse;
    }> = [];

    for (const file of files) {
      try {
        const categorization = await this.categorizeDocument({
          projectId,
          userId,
          operationType: AiOperationType.AUTO_CATEGORIZE_DOCUMENT,
          filename: file.filename,
          contentPreview: file.contentPreview,
          categories: availableCategories,
        });

        results.push({
          fileId: file.id,
          categorization,
        });
      } catch (error: any) {
        this.logger.error(
          `Failed to categorize file ${file.id}: ${error.message}`,
        );
      }
    }

    return results;
  }
}
