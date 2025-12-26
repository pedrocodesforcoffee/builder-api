/**
 * AI Configuration Constants
 * Centralized configuration for AI features
 */

export const AI_CONFIG = {
  // OpenAI Configuration
  OPENAI: {
    DEFAULT_MODEL: 'gpt-4-turbo-preview',
    FAST_MODEL: 'gpt-3.5-turbo',
    EMBEDDING_MODEL: 'text-embedding-3-small',
    MAX_TOKENS: {
      'gpt-4-turbo-preview': 4096,
      'gpt-3.5-turbo': 2048,
      'text-embedding-3-small': 8191, // Input token limit for embeddings
    },
    TEMPERATURE: {
      CREATIVE: 0.8,
      BALANCED: 0.5,
      PRECISE: 0.2,
    },
    EMBEDDING_DIMENSIONS: 1536, // Output dimensions for text-embedding-3-small
  },

  // Cost Tracking (per 1K tokens)
  COSTS: {
    'gpt-4-turbo-preview': {
      input: 0.01,
      output: 0.03,
    },
    'gpt-3.5-turbo': {
      input: 0.0005,
      output: 0.0015,
    },
    'text-embedding-3-small': {
      input: 0.00002, // $0.02 per 1M tokens = $0.00002 per 1K tokens
      output: 0, // Embeddings don't have output tokens
    },
  },

  // Token Budget Limits
  BUDGET: {
    DAILY_LIMIT: 50000, // tokens per day per project
    MONTHLY_LIMIT: 1000000, // tokens per month per project
    COST_ALERT_THRESHOLD: 100, // USD per project per month
  },

  // Rate Limiting
  RATE_LIMITS: {
    REQUESTS_PER_MINUTE: 60,
    REQUESTS_PER_HOUR: 500,
    REQUESTS_PER_DAY: 5000,
  },

  // Cache Configuration
  CACHE: {
    TTL_SECONDS: 2592000, // 30 days
    CACHE_ENABLED: true,
  },

  // Feature Flags
  FEATURES: {
    DOCUMENT_INTELLIGENCE: true,
    PROJECT_INTELLIGENCE: true,
    AUTO_GENERATED_ACTIONS: true,
    ANALYTICS_FORECASTING: true,
  },
};

/**
 * AI Model Types
 */
export enum AiModel {
  GPT4_TURBO = 'gpt-4-turbo-preview',
  GPT35_TURBO = 'gpt-3.5-turbo',
  EMBEDDING = 'text-embedding-3-small',
}

/**
 * AI Operation Types
 */
export enum AiOperationType {
  // Document Intelligence
  DOCUMENT_SUMMARY = 'document_summary',
  DOCUMENT_QA = 'document_qa',
  DOCUMENT_COMPARISON = 'document_comparison',
  KEY_INFO_EXTRACTION = 'key_info_extraction',
  CONFLICT_DETECTION = 'conflict_detection',
  SUGGEST_RELATED_DOCS = 'suggest_related_docs',

  // Project Intelligence
  PROJECT_HEALTH_SCORE = 'project_health_score',
  RISK_ASSESSMENT = 'risk_assessment',
  PATTERN_DETECTION = 'pattern_detection',
  ANOMALY_DETECTION = 'anomaly_detection',

  // Auto-Generated Actions
  SUGGEST_RFI = 'suggest_rfi',
  DRAFT_RFI_QUESTION = 'draft_rfi_question',
  GENERATE_SAFETY_OBSERVATION = 'generate_safety_observation',
  SUGGEST_COST_CODE = 'suggest_cost_code',
  AUTO_CATEGORIZE_DOCUMENT = 'auto_categorize_document',

  // Analytics & Forecasting
  BUDGET_FAC_FORECAST = 'budget_fac_forecast',
  SCHEDULE_IMPACT_PREDICTION = 'schedule_impact_prediction',
  SUBCONTRACTOR_SCORING = 'subcontractor_scoring',
  COST_TREND_FORECAST = 'cost_trend_forecast',
  RFI_VELOCITY_PREDICTION = 'rfi_velocity_prediction',

  // Embeddings
  GENERATE_EMBEDDING = 'generate_embedding',
}

/**
 * AI Temperature Presets
 */
export const AI_TEMPERATURE = {
  [AiOperationType.DOCUMENT_SUMMARY]: AI_CONFIG.OPENAI.TEMPERATURE.PRECISE,
  [AiOperationType.DOCUMENT_QA]: AI_CONFIG.OPENAI.TEMPERATURE.PRECISE,
  [AiOperationType.DOCUMENT_COMPARISON]: AI_CONFIG.OPENAI.TEMPERATURE.PRECISE,
  [AiOperationType.KEY_INFO_EXTRACTION]: AI_CONFIG.OPENAI.TEMPERATURE.PRECISE,
  [AiOperationType.CONFLICT_DETECTION]: AI_CONFIG.OPENAI.TEMPERATURE.PRECISE,
  [AiOperationType.SUGGEST_RELATED_DOCS]: AI_CONFIG.OPENAI.TEMPERATURE.BALANCED,
  [AiOperationType.PROJECT_HEALTH_SCORE]: AI_CONFIG.OPENAI.TEMPERATURE.BALANCED,
  [AiOperationType.RISK_ASSESSMENT]: AI_CONFIG.OPENAI.TEMPERATURE.BALANCED,
  [AiOperationType.PATTERN_DETECTION]: AI_CONFIG.OPENAI.TEMPERATURE.BALANCED,
  [AiOperationType.ANOMALY_DETECTION]: AI_CONFIG.OPENAI.TEMPERATURE.PRECISE,
  [AiOperationType.SUGGEST_RFI]: AI_CONFIG.OPENAI.TEMPERATURE.CREATIVE,
  [AiOperationType.DRAFT_RFI_QUESTION]: AI_CONFIG.OPENAI.TEMPERATURE.CREATIVE,
  [AiOperationType.GENERATE_SAFETY_OBSERVATION]: AI_CONFIG.OPENAI.TEMPERATURE.PRECISE,
  [AiOperationType.SUGGEST_COST_CODE]: AI_CONFIG.OPENAI.TEMPERATURE.PRECISE,
  [AiOperationType.AUTO_CATEGORIZE_DOCUMENT]: AI_CONFIG.OPENAI.TEMPERATURE.PRECISE,
  [AiOperationType.BUDGET_FAC_FORECAST]: AI_CONFIG.OPENAI.TEMPERATURE.PRECISE,
  [AiOperationType.SCHEDULE_IMPACT_PREDICTION]: AI_CONFIG.OPENAI.TEMPERATURE.BALANCED,
  [AiOperationType.SUBCONTRACTOR_SCORING]: AI_CONFIG.OPENAI.TEMPERATURE.BALANCED,
  [AiOperationType.COST_TREND_FORECAST]: AI_CONFIG.OPENAI.TEMPERATURE.BALANCED,
  [AiOperationType.RFI_VELOCITY_PREDICTION]: AI_CONFIG.OPENAI.TEMPERATURE.BALANCED,
  [AiOperationType.GENERATE_EMBEDDING]: AI_CONFIG.OPENAI.TEMPERATURE.PRECISE, // Not used for embeddings, but included for completeness
};

/**
 * AI Model Selection by Operation Type
 * Use GPT-3.5 for simple tasks, GPT-4 for complex analysis
 */
export const AI_MODEL_SELECTION = {
  [AiOperationType.DOCUMENT_SUMMARY]: AiModel.GPT35_TURBO,
  [AiOperationType.DOCUMENT_QA]: AiModel.GPT4_TURBO,
  [AiOperationType.DOCUMENT_COMPARISON]: AiModel.GPT4_TURBO,
  [AiOperationType.KEY_INFO_EXTRACTION]: AiModel.GPT35_TURBO,
  [AiOperationType.CONFLICT_DETECTION]: AiModel.GPT4_TURBO,
  [AiOperationType.SUGGEST_RELATED_DOCS]: AiModel.GPT35_TURBO,
  [AiOperationType.PROJECT_HEALTH_SCORE]: AiModel.GPT4_TURBO,
  [AiOperationType.RISK_ASSESSMENT]: AiModel.GPT4_TURBO,
  [AiOperationType.PATTERN_DETECTION]: AiModel.GPT4_TURBO,
  [AiOperationType.ANOMALY_DETECTION]: AiModel.GPT4_TURBO,
  [AiOperationType.SUGGEST_RFI]: AiModel.GPT35_TURBO,
  [AiOperationType.DRAFT_RFI_QUESTION]: AiModel.GPT35_TURBO,
  [AiOperationType.GENERATE_SAFETY_OBSERVATION]: AiModel.GPT35_TURBO,
  [AiOperationType.SUGGEST_COST_CODE]: AiModel.GPT35_TURBO,
  [AiOperationType.AUTO_CATEGORIZE_DOCUMENT]: AiModel.GPT35_TURBO,
  [AiOperationType.BUDGET_FAC_FORECAST]: AiModel.GPT4_TURBO,
  [AiOperationType.SCHEDULE_IMPACT_PREDICTION]: AiModel.GPT4_TURBO,
  [AiOperationType.SUBCONTRACTOR_SCORING]: AiModel.GPT4_TURBO,
  [AiOperationType.COST_TREND_FORECAST]: AiModel.GPT4_TURBO,
  [AiOperationType.RFI_VELOCITY_PREDICTION]: AiModel.GPT35_TURBO,
  [AiOperationType.GENERATE_EMBEDDING]: AiModel.EMBEDDING,
};
