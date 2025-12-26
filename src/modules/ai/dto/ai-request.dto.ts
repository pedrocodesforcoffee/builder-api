/**
 * AI Request DTOs
 * API request validation schemas
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  IsObject,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AiModel, AiOperationType } from '../constants/ai-config.constants';

/**
 * Base AI Request DTO
 */
export class BaseAiRequestDto {
  @IsString()
  projectId: string;

  @IsEnum(AiOperationType)
  operationType: AiOperationType;

  @IsOptional()
  @IsEnum(AiModel)
  model?: AiModel;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(8000)
  maxTokens?: number;

  @IsOptional()
  @IsBoolean()
  useCache?: boolean;
}

// ============================================================================
// DOCUMENT INTELLIGENCE DTOs
// ============================================================================

export class DocumentSummaryRequestDto extends BaseAiRequestDto {
  @IsString()
  documentId: string;

  @IsString()
  documentTitle: string;

  @IsString()
  documentType: string;

  @IsString()
  documentContent: string;
}

export class DocumentQARequestDto extends BaseAiRequestDto {
  @IsString()
  documentId: string;

  @IsString()
  documentTitle: string;

  @IsString()
  documentContent: string;

  @IsString()
  question: string;
}

export class DocumentComparisonRequestDto extends BaseAiRequestDto {
  @IsString()
  document1Id: string;

  @IsString()
  document2Id: string;

  @IsString()
  version1Date: string;

  @IsString()
  version1Content: string;

  @IsString()
  version2Date: string;

  @IsString()
  version2Content: string;
}

export class KeyInfoExtractionRequestDto extends BaseAiRequestDto {
  @IsString()
  documentId: string;

  @IsString()
  documentTitle: string;

  @IsString()
  documentType: string;

  @IsString()
  documentContent: string;
}

export class DocumentForConflictDto {
  @IsString()
  id: string;

  @IsString()
  title: string;

  @IsString()
  type: string;

  @IsString()
  content: string;
}

export class ConflictDetectionRequestDto extends BaseAiRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentForConflictDto)
  documents: DocumentForConflictDto[];
}

export class AvailableDocDto {
  @IsString()
  id: string;

  @IsString()
  title: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  summary?: string;
}

export class SuggestRelatedDocsRequestDto extends BaseAiRequestDto {
  @IsString()
  currentDocId: string;

  @IsString()
  currentDocTitle: string;

  @IsString()
  currentDocContent: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailableDocDto)
  availableDocs: AvailableDocDto[];
}

// ============================================================================
// PROJECT INTELLIGENCE DTOs
// ============================================================================

export class BudgetMetricsDto {
  @IsNumber()
  original: number;

  @IsNumber()
  committed: number;

  @IsNumber()
  actual: number;

  @IsNumber()
  variance: number;
}

export class ScheduleMetricsDto {
  @IsNumber()
  originalDays: number;

  @IsNumber()
  daysElapsed: number;

  @IsNumber()
  progressPercent: number;

  @IsNumber()
  variance: number;
}

export class QualityMetricsDto {
  @IsNumber()
  openRfis: number;

  @IsNumber()
  overdueRfis: number;

  @IsNumber()
  openPunchItems: number;

  @IsNumber()
  safetyIncidents: number;
}

export class ProjectHealthScoreRequestDto extends BaseAiRequestDto {
  @ValidateNested()
  @Type(() => BudgetMetricsDto)
  budget: BudgetMetricsDto;

  @ValidateNested()
  @Type(() => ScheduleMetricsDto)
  schedule: ScheduleMetricsDto;

  @ValidateNested()
  @Type(() => QualityMetricsDto)
  quality: QualityMetricsDto;
}

export class RecentIssueDto {
  @IsString()
  type: string;

  @IsString()
  description: string;

  @IsString()
  date: string;
}

export class RiskMetricsDto {
  @IsNumber()
  budgetVariance: number;

  @IsNumber()
  scheduleVariance: number;

  @IsNumber()
  openRfis: number;

  @IsNumber()
  criticalObservations: number;
}

export class RiskAssessmentRequestDto extends BaseAiRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecentIssueDto)
  recentIssues: RecentIssueDto[];

  @ValidateNested()
  @Type(() => RiskMetricsDto)
  metrics: RiskMetricsDto;

  @IsOptional()
  @IsString()
  weatherData?: string;
}

export class PatternDetectionRequestDto extends BaseAiRequestDto {
  @IsObject()
  costData: any;

  @IsObject()
  rfiData: any;

  @IsObject()
  safetyData: any;

  @IsObject()
  dailyReportIssues: any;
}

export class AnomalyDetectionRequestDto extends BaseAiRequestDto {
  @IsArray()
  costEntries: any[];

  @IsArray()
  timeData: any[];

  @IsArray()
  deliveryData: any[];
}

// ============================================================================
// AUTO-GENERATED ACTIONS DTOs
// ============================================================================

export class RelatedDocDto {
  @IsString()
  id: string;

  @IsString()
  title: string;

  @IsString()
  summary: string;
}

export class SuggestRfiRequestDto extends BaseAiRequestDto {
  @IsString()
  issueDescription: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RelatedDocDto)
  relatedDocs: RelatedDocDto[];

  @IsString()
  projectType: string;

  @IsString()
  currentPhase: string;
}

export class DraftRfiQuestionRequestDto extends BaseAiRequestDto {
  @IsString()
  issueDescription: string;

  @IsString()
  specSections: string;

  @IsString()
  backgroundContext: string;
}

export class GenerateSafetyObservationRequestDto extends BaseAiRequestDto {
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  photoAnalysis?: string;

  @IsString()
  location: string;
}

export class CostCodeDto {
  @IsString()
  id: string;

  @IsString()
  code: string;

  @IsString()
  fullCode: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class SuggestCostCodeRequestDto extends BaseAiRequestDto {
  @IsString()
  expenseDescription: string;

  @IsNumber()
  amount: number;

  @IsString()
  vendor: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CostCodeDto)
  costCodes: CostCodeDto[];
}

export class AutoCategorizeDocumentRequestDto extends BaseAiRequestDto {
  @IsString()
  filename: string;

  @IsString()
  contentPreview: string;

  @IsArray()
  @IsString({ each: true })
  categories: string[];
}

// ============================================================================
// ANALYTICS & FORECASTING DTOs
// ============================================================================

export class BudgetLineItemDto {
  @IsString()
  id: string;

  @IsString()
  code: string;

  @IsString()
  description: string;

  @IsNumber()
  budgetedCost: number;

  @IsNumber()
  committedCost: number;

  @IsNumber()
  actualCost: number;

  @IsNumber()
  percentComplete: number;
}

export class BudgetFacForecastRequestDto extends BaseAiRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BudgetLineItemDto)
  lineItems: BudgetLineItemDto[];

  @IsObject()
  spendingPattern: any;

  @IsObject()
  pendingChangeOrders: any;
}

export class ScheduleImpactPredictionRequestDto extends BaseAiRequestDto {
  @IsString()
  issueDescription: string;

  @IsString()
  currentPhase: string;

  @IsNumber()
  percentComplete: number;

  @IsNumber()
  daysRemaining: number;

  @IsArray()
  @IsString({ each: true })
  criticalPathActivities: string[];

  @IsObject()
  historicalDelays: any;
}

export class SubcontractorMetricsDto {
  @IsNumber()
  onTimePercent: number;

  @IsNumber()
  qualityScore: number;

  @IsNumber()
  safetyIncidents: number;

  @IsNumber()
  avgRfiResponseDays: number;

  @IsNumber()
  disputes: number;
}

export class SubcontractorScoringRequestDto extends BaseAiRequestDto {
  @IsString()
  subcontractorId: string;

  @IsString()
  subName: string;

  @IsString()
  trade: string;

  @ValidateNested()
  @Type(() => SubcontractorMetricsDto)
  metrics: SubcontractorMetricsDto;

  @IsObject()
  projectHistory: any;
}

export class BudgetStateDto {
  @IsNumber()
  original: number;

  @IsNumber()
  current: number;

  @IsNumber()
  committed: number;

  @IsNumber()
  actual: number;

  @IsNumber()
  remaining: number;
}

export class CostTrendForecastRequestDto extends BaseAiRequestDto {
  @IsArray()
  monthlyCosts: any[];

  @ValidateNested()
  @Type(() => BudgetStateDto)
  budget: BudgetStateDto;

  @IsArray()
  pendingChanges: any[];
}

export class RfiStatsDto {
  @IsNumber()
  total: number;

  @IsNumber()
  open: number;

  @IsNumber()
  avgResponseDays: number;

  @IsNumber()
  thisMonth: number;
}

export class RfiVelocityPredictionRequestDto extends BaseAiRequestDto {
  @ValidateNested()
  @Type(() => RfiStatsDto)
  stats: RfiStatsDto;

  @IsObject()
  historicalRfiData: any;

  @IsString()
  currentPhase: string;

  @IsNumber()
  percentComplete: number;
}
