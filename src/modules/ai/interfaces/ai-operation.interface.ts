/**
 * AI Operation Interfaces
 * Type definitions for all AI operations
 */

import { AiModel, AiOperationType } from '../constants/ai-config.constants';

/**
 * Base AI Request Interface
 */
export interface AiRequest {
  projectId: string;
  userId: string;
  operationType: AiOperationType;
  context?: Record<string, any>;
  model?: AiModel;
  temperature?: number;
  maxTokens?: number;
  useCache?: boolean;
}

/**
 * Base AI Response Interface
 */
export interface AiResponse<T = any> {
  operationType: AiOperationType;
  result: T;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  cost: number;
  responseTime: number; // milliseconds
  cached: boolean;
  model: AiModel;
  timestamp: Date;
}

/**
 * AI Operation Result
 * Stores the result of an AI operation in the database
 */
export interface AiOperationResult {
  id: string;
  projectId: string;
  userId: string;
  operationType: AiOperationType;
  model: AiModel;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  responseTime: number;
  cached: boolean;
  success: boolean;
  errorMessage?: string;
  createdAt: Date;
}

/**
 * AI Cost Summary
 */
export interface AiCostSummary {
  projectId: string;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  totalOperations: number;
  totalTokens: number;
  totalCost: number;
  costByOperation: Record<AiOperationType, number>;
  tokensByOperation: Record<AiOperationType, number>;
}

/**
 * AI Usage Metrics
 */
export interface AiUsageMetrics {
  projectId: string;
  dailyTokensUsed: number;
  monthlyTokensUsed: number;
  dailyTokensRemaining: number;
  monthlyTokensRemaining: number;
  monthlyCost: number;
  topOperations: Array<{
    operationType: AiOperationType;
    count: number;
    cost: number;
  }>;
}

// ============================================================================
// DOCUMENT INTELLIGENCE INTERFACES
// ============================================================================

export interface DocumentSummaryRequest extends AiRequest {
  documentId: string;
  documentTitle: string;
  documentType: string;
  documentContent: string;
}

export interface DocumentSummaryResponse {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  criticalDates: string[];
  costImplications: string[];
}

export interface DocumentQARequest extends AiRequest {
  documentId: string;
  documentTitle: string;
  documentContent: string;
  question: string;
}

export interface DocumentQAResponse {
  answer: string;
  confidence: number;
  sourceExcerpts: string[];
}

export interface DocumentComparisonRequest extends AiRequest {
  document1Id: string;
  document2Id: string;
  version1Date: string;
  version1Content: string;
  version2Date: string;
  version2Content: string;
}

export interface DocumentComparisonResponse {
  changes: Array<{
    category: 'technical' | 'dates' | 'costs' | 'requirements' | 'other';
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    oldValue?: string;
    newValue?: string;
  }>;
  summary: string;
}

export interface KeyInfoExtractionRequest extends AiRequest {
  documentId: string;
  documentTitle: string;
  documentType: string;
  documentContent: string;
}

export interface KeyInfoExtractionResponse {
  dates: Array<{
    date: string;
    description: string;
    type: 'deadline' | 'milestone' | 'other';
  }>;
  costs: Array<{
    amount: number;
    description: string;
    type: 'budget' | 'change_order' | 'other';
  }>;
  contacts: Array<{
    name: string;
    role?: string;
    company?: string;
    email?: string;
    phone?: string;
  }>;
  requirements: string[];
  safety: string[];
}

export interface ConflictDetectionRequest extends AiRequest {
  documents: Array<{
    id: string;
    title: string;
    type: string;
    content: string;
  }>;
}

export interface ConflictDetectionResponse {
  conflicts: Array<{
    category: 'technical' | 'schedule' | 'cost' | 'scope';
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    affectedDocuments: string[];
    recommendation: string;
  }>;
  conflictCount: number;
}

export interface SuggestRelatedDocsRequest extends AiRequest {
  currentDocId: string;
  currentDocTitle: string;
  currentDocContent: string;
  availableDocs: Array<{
    id: string;
    title: string;
    type: string;
    summary?: string;
  }>;
}

export interface SuggestRelatedDocsResponse {
  suggestions: Array<{
    documentId: string;
    relevanceScore: number;
    reason: string;
  }>;
}

// ============================================================================
// PROJECT INTELLIGENCE INTERFACES
// ============================================================================

export interface ProjectHealthScoreRequest extends AiRequest {
  budget: {
    original: number;
    committed: number;
    actual: number;
    variance: number;
  };
  schedule: {
    originalDays: number;
    daysElapsed: number;
    progressPercent: number;
    variance: number;
  };
  quality: {
    openRfis: number;
    overdueRfis: number;
    openPunchItems: number;
    safetyIncidents: number;
  };
}

export interface ProjectHealthScoreResponse {
  overallScore: number;
  categoryScores: {
    budget: number;
    schedule: number;
    quality: number;
    safety: number;
  };
  concerns: Array<{
    category: string;
    description: string;
    severity: 'critical' | 'high' | 'medium';
    recommendedAction: string;
  }>;
  trend: 'improving' | 'stable' | 'declining';
}

export interface RiskAssessmentRequest extends AiRequest {
  recentIssues: Array<{
    type: string;
    description: string;
    date: string;
  }>;
  metrics: {
    budgetVariance: number;
    scheduleVariance: number;
    openRfis: number;
    criticalObservations: number;
  };
  weatherData?: string;
}

export interface RiskAssessmentResponse {
  risks: Array<{
    description: string;
    probability: number;
    impact: 'high' | 'medium' | 'low';
    mitigation: string;
    priority: number;
  }>;
  criticalRisks: string[];
}

export interface PatternDetectionRequest extends AiRequest {
  costData: any;
  rfiData: any;
  safetyData: any;
  dailyReportIssues: any;
}

export interface PatternDetectionResponse {
  patterns: Array<{
    category: string;
    description: string;
    frequency: string;
    trend: 'increasing' | 'stable' | 'decreasing';
    insight: string;
  }>;
  correlations: Array<{
    metric1: string;
    metric2: string;
    correlation: number;
    insight: string;
  }>;
}

export interface AnomalyDetectionRequest extends AiRequest {
  costEntries: any[];
  timeData: any[];
  deliveryData: any[];
}

export interface AnomalyDetectionResponse {
  anomalies: Array<{
    type: 'cost' | 'time' | 'delivery' | 'data_quality';
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    value: any;
    expectedRange: string;
    recommendation: string;
  }>;
}

// ============================================================================
// AUTO-GENERATED ACTIONS INTERFACES
// ============================================================================

export interface SuggestRfiRequest extends AiRequest {
  issueDescription: string;
  relatedDocs: Array<{
    id: string;
    title: string;
    summary: string;
  }>;
  projectType: string;
  currentPhase: string;
}

export interface SuggestRfiResponse {
  shouldCreateRfi: boolean;
  confidence: number;
  suggestedTitle: string;
  keyPoints: string[];
  suggestedDiscipline: string;
  reasoning: string;
}

export interface DraftRfiQuestionRequest extends AiRequest {
  issueDescription: string;
  specSections: string;
  backgroundContext: string;
}

export interface DraftRfiQuestionResponse {
  subject: string;
  background: string;
  questions: string[];
  specReferences: string[];
  justification: string;
}

export interface GenerateSafetyObservationRequest extends AiRequest {
  description: string;
  photoAnalysis?: string;
  location: string;
}

export interface GenerateSafetyObservationResponse {
  title: string;
  hazardDescription: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  immediateAction: string;
  correctiveAction: string;
}

export interface SuggestCostCodeRequest extends AiRequest {
  expenseDescription: string;
  amount: number;
  vendor: string;
  costCodes: Array<{
    id: string;
    code: string;
    fullCode: string;
    name: string;
    description?: string;
  }>;
}

export interface SuggestCostCodeResponse {
  suggestions: Array<{
    costCodeId: string;
    costCode: string;
    confidence: number;
    explanation: string;
  }>;
}

export interface AutoCategorizeDocumentRequest extends AiRequest {
  filename: string;
  contentPreview: string;
  categories: string[];
}

export interface AutoCategorizeDocumentResponse {
  primaryCategory: string;
  secondaryCategory?: string;
  suggestedTags: string[];
  confidence: number;
}

// ============================================================================
// ANALYTICS & FORECASTING INTERFACES
// ============================================================================

export interface BudgetFacForecastRequest extends AiRequest {
  lineItems: Array<{
    id: string;
    code: string;
    description: string;
    budgetedCost: number;
    committedCost: number;
    actualCost: number;
    percentComplete: number;
  }>;
  spendingPattern: any;
  pendingChangeOrders: any;
}

export interface BudgetFacForecastResponse {
  forecasts: Array<{
    lineItemId: string;
    forecastedFac: number;
    varianceAmount: number;
    variancePercent: number;
    confidenceInterval: {
      low: number;
      high: number;
    };
    assumptions: string[];
    riskFactors: string[];
  }>;
  totalForecastedFac: number;
  totalVariance: number;
}

export interface ScheduleImpactPredictionRequest extends AiRequest {
  issueDescription: string;
  currentPhase: string;
  percentComplete: number;
  daysRemaining: number;
  criticalPathActivities: string[];
  historicalDelays: any;
}

export interface ScheduleImpactPredictionResponse {
  estimatedDelayDays: number;
  impactsCriticalPath: boolean;
  confidence: number;
  mitigationStrategies: string[];
  costImpact: number;
}

export interface SubcontractorScoringRequest extends AiRequest {
  subcontractorId: string;
  subName: string;
  trade: string;
  metrics: {
    onTimePercent: number;
    qualityScore: number;
    safetyIncidents: number;
    avgRfiResponseDays: number;
    disputes: number;
  };
  projectHistory: any;
}

export interface SubcontractorScoringResponse {
  overallScore: number;
  categoryScores: {
    quality: number;
    schedule: number;
    safety: number;
    communication: number;
  };
  strengths: string[];
  improvements: string[];
  recommendation: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface CostTrendForecastRequest extends AiRequest {
  monthlyCosts: any[];
  budget: {
    original: number;
    current: number;
    committed: number;
    actual: number;
    remaining: number;
  };
  pendingChanges: any[];
}

export interface CostTrendForecastResponse {
  monthlyProjections: Array<{
    month: string;
    projectedSpend: number;
  }>;
  projectedFinalCost: number;
  projectedVariance: number;
  burnRateTrend: 'increasing' | 'stable' | 'decreasing';
  budgetRiskAreas: string[];
  recommendations: string[];
}

export interface RfiVelocityPredictionRequest extends AiRequest {
  stats: {
    total: number;
    open: number;
    avgResponseDays: number;
    thisMonth: number;
  };
  historicalRfiData: any;
  currentPhase: string;
  percentComplete: number;
}

export interface RfiVelocityPredictionResponse {
  expectedRfisNextMonth: number;
  expectedAvgResponseTime: number;
  bottleneckAreas: string[];
  scheduleImpactRisk: 'high' | 'medium' | 'low';
  recommendations: string[];
}
