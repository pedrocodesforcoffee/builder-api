/**
 * AI Prompt Templates
 * Centralized prompt management for all AI operations
 */

import { AiOperationType } from './ai-config.constants';

export interface PromptTemplate {
  systemPrompt: string;
  userPromptTemplate: string;
  outputFormat?: string;
}

/**
 * All AI Prompts organized by operation type
 */
export const AI_PROMPTS: Record<AiOperationType, PromptTemplate> = {
  // ============================================================================
  // DOCUMENT INTELLIGENCE
  // ============================================================================

  [AiOperationType.DOCUMENT_SUMMARY]: {
    systemPrompt: `You are an expert construction document analyzer. Your role is to summarize construction documents accurately and concisely, focusing on critical information relevant to project management.`,
    userPromptTemplate: `Summarize the following construction document in 3-5 bullet points. Focus on:
- Key decisions or requirements
- Important dates or deadlines
- Cost implications
- Safety considerations
- Action items

Document Title: {{documentTitle}}
Document Type: {{documentType}}
Document Content:
{{documentContent}}`,
    outputFormat: 'markdown_bullets',
  },

  [AiOperationType.DOCUMENT_QA]: {
    systemPrompt: `You are an expert construction document analyst. Answer questions about construction documents accurately based ONLY on the provided document content. If the answer is not in the document, say "This information is not available in the provided document."`,
    userPromptTemplate: `Answer the following question based on the document content provided.

Question: {{question}}

Document Title: {{documentTitle}}
Document Content:
{{documentContent}}`,
    outputFormat: 'text',
  },

  [AiOperationType.DOCUMENT_COMPARISON]: {
    systemPrompt: `You are an expert construction document reviewer. Compare two versions of a document and identify all meaningful changes, focusing on technical specifications, dates, costs, and requirements.`,
    userPromptTemplate: `Compare these two document versions and list all significant changes:

Version 1 ({{version1Date}}):
{{version1Content}}

Version 2 ({{version2Date}}):
{{version2Content}}

Categorize changes as:
- Technical specifications
- Dates/schedules
- Costs/pricing
- Requirements/obligations
- Other`,
    outputFormat: 'structured_comparison',
  },

  [AiOperationType.KEY_INFO_EXTRACTION]: {
    systemPrompt: `You are an expert at extracting structured information from construction documents. Extract key information accurately and format it as JSON.`,
    userPromptTemplate: `Extract the following information from this construction document:
- Important dates (deadlines, milestones, etc.)
- Cost amounts (budgets, change orders, etc.)
- Key contacts (names, roles, companies)
- Requirements or obligations
- Safety considerations

Document Title: {{documentTitle}}
Document Type: {{documentType}}
Document Content:
{{documentContent}}

Return as JSON with keys: dates, costs, contacts, requirements, safety`,
    outputFormat: 'json',
  },

  [AiOperationType.CONFLICT_DETECTION]: {
    systemPrompt: `You are an expert construction specification reviewer. Detect conflicts, contradictions, and inconsistencies between documents that could cause issues during construction.`,
    userPromptTemplate: `Review these documents and identify any conflicts or contradictions:

{{#each documents}}
Document {{@index}}: {{this.title}} ({{this.type}})
Content:
{{this.content}}

{{/each}}

Report conflicts in categories:
- Technical conflicts (specifications)
- Schedule conflicts (dates/timelines)
- Cost conflicts (pricing discrepancies)
- Scope conflicts (work requirements)`,
    outputFormat: 'structured_conflicts',
  },

  [AiOperationType.SUGGEST_RELATED_DOCS]: {
    systemPrompt: `You are a construction document librarian. Suggest related documents based on content similarity and relevance to the current context.`,
    userPromptTemplate: `Based on this document, suggest the 5 most relevant related documents from the project:

Current Document:
Title: {{currentDocTitle}}
Content: {{currentDocContent}}

Available Documents:
{{#each availableDocs}}
- ID: {{this.id}}, Title: {{this.title}}, Type: {{this.type}}, Summary: {{this.summary}}
{{/each}}

Return document IDs and relevance scores (0-100) with brief explanation.`,
    outputFormat: 'ranked_list',
  },

  // ============================================================================
  // PROJECT INTELLIGENCE
  // ============================================================================

  [AiOperationType.PROJECT_HEALTH_SCORE]: {
    systemPrompt: `You are a construction project management expert. Analyze project metrics to calculate a comprehensive health score and identify areas of concern.`,
    userPromptTemplate: `Calculate a project health score (0-100) based on these metrics:

Budget Performance:
- Original Budget: {{budget.original}}
- Committed: {{budget.committed}}
- Actual Spent: {{budget.actual}}
- Variance: {{budget.variance}}%

Schedule Performance:
- Original Duration: {{schedule.originalDays}} days
- Days Elapsed: {{schedule.daysElapsed}}
- Progress Complete: {{schedule.progressPercent}}%
- Behind/Ahead: {{schedule.variance}} days

Quality Metrics:
- Open RFIs: {{quality.openRfis}}
- Overdue RFIs: {{quality.overdueRfis}}
- Open Punch Items: {{quality.openPunchItems}}
- Safety Incidents: {{quality.safetyIncidents}}

Provide:
1. Overall health score (0-100)
2. Category scores (Budget, Schedule, Quality, Safety)
3. Top 3 concerns with severity (Critical/High/Medium)
4. Recommended actions`,
    outputFormat: 'structured_health_report',
  },

  [AiOperationType.RISK_ASSESSMENT]: {
    systemPrompt: `You are a construction risk management expert. Analyze project data to identify potential risks and their impact.`,
    userPromptTemplate: `Assess project risks based on this data:

Recent Issues:
{{#each recentIssues}}
- {{this.type}}: {{this.description}} ({{this.date}})
{{/each}}

Current Metrics:
- Budget variance: {{metrics.budgetVariance}}%
- Schedule variance: {{metrics.scheduleVariance}} days
- Open RFIs: {{metrics.openRfis}}
- Critical observations: {{metrics.criticalObservations}}

Weather Forecast:
{{weatherData}}

Identify:
1. Top 5 risks with probability (%) and impact (High/Med/Low)
2. Mitigation strategies for each risk
3. Risks requiring immediate attention`,
    outputFormat: 'risk_matrix',
  },

  [AiOperationType.PATTERN_DETECTION]: {
    systemPrompt: `You are a construction data analyst. Detect patterns and trends in project data that could indicate systematic issues or opportunities for improvement.`,
    userPromptTemplate: `Analyze this project data for patterns:

Cost Data (last 6 months):
{{costData}}

RFI Data:
{{rfiData}}

Safety Observations:
{{safetyData}}

Daily Report Issues:
{{dailyReportIssues}}

Identify:
1. Recurring issues or themes
2. Trends (improving/declining)
3. Correlations between different metrics
4. Predictive insights`,
    outputFormat: 'pattern_analysis',
  },

  [AiOperationType.ANOMALY_DETECTION]: {
    systemPrompt: `You are a construction data scientist. Detect anomalies and outliers in project data that require investigation.`,
    userPromptTemplate: `Detect anomalies in this project data:

Cost Entries (last 30 days):
{{costEntries}}

Time Tracking:
{{timeData}}

Material Deliveries:
{{deliveryData}}

Flag:
1. Unusual cost entries (outliers)
2. Abnormal time patterns
3. Delivery delays or surges
4. Data quality issues
5. Potential errors or fraud indicators`,
    outputFormat: 'anomaly_report',
  },

  // ============================================================================
  // AUTO-GENERATED ACTIONS
  // ============================================================================

  [AiOperationType.SUGGEST_RFI]: {
    systemPrompt: `You are a construction superintendent assistant. Analyze daily report issues and field notes to suggest when an RFI should be created.`,
    userPromptTemplate: `Review this issue and determine if an RFI should be created:

Issue Description:
{{issueDescription}}

Related Documents:
{{#each relatedDocs}}
- {{this.title}}: {{this.summary}}
{{/each}}

Project Context:
- Project Type: {{projectType}}
- Current Phase: {{currentPhase}}

Respond with:
1. Should create RFI? (Yes/No)
2. Confidence level (%)
3. Suggested RFI title
4. Key points to include
5. Suggested assignee discipline`,
    outputFormat: 'rfi_suggestion',
  },

  [AiOperationType.DRAFT_RFI_QUESTION]: {
    systemPrompt: `You are a construction project engineer. Draft clear, specific RFI questions that include relevant background, spec references, and the information needed.`,
    userPromptTemplate: `Draft an RFI question for this issue:

Issue: {{issueDescription}}

Relevant Spec Sections:
{{specSections}}

Background Context:
{{backgroundContext}}

Create:
1. Clear subject line
2. Background/context paragraph
3. Specific questions (numbered)
4. Reference to spec sections
5. Why this information is needed`,
    outputFormat: 'formatted_rfi',
  },

  [AiOperationType.GENERATE_SAFETY_OBSERVATION]: {
    systemPrompt: `You are a construction safety officer. Generate safety observations from daily reports, photos, or field notes.`,
    userPromptTemplate: `Analyze this for safety concerns:

Description: {{description}}

Photo Analysis: {{photoAnalysis}}

Location: {{location}}

Generate:
1. Safety observation title
2. Hazard description
3. Severity level (Low/Medium/High/Critical)
4. Category
5. Immediate action recommended
6. Long-term corrective action`,
    outputFormat: 'safety_observation',
  },

  [AiOperationType.SUGGEST_COST_CODE]: {
    systemPrompt: `You are a construction accounting expert. Suggest the most appropriate cost code for expenses based on description and project context.`,
    userPromptTemplate: `Suggest cost code for this expense:

Description: {{expenseDescription}}
Amount: {{amount}}
Vendor: {{vendor}}

Available Cost Codes:
{{#each costCodes}}
- {{this.code}} {{this.fullCode}}: {{this.name}} ({{this.description}})
{{/each}}

Return:
1. Top 3 suggested cost codes with confidence %
2. Explanation for each suggestion`,
    outputFormat: 'cost_code_suggestions',
  },

  [AiOperationType.AUTO_CATEGORIZE_DOCUMENT]: {
    systemPrompt: `You are a construction document management expert. Categorize documents based on their content and metadata.`,
    userPromptTemplate: `Categorize this document:

Filename: {{filename}}
Content Preview:
{{contentPreview}}

Available Categories:
{{categories}}

Return:
1. Primary category
2. Secondary category (if applicable)
3. Suggested tags
4. Confidence level (%)`,
    outputFormat: 'document_categorization',
  },

  // ============================================================================
  // ANALYTICS & FORECASTING
  // ============================================================================

  [AiOperationType.BUDGET_FAC_FORECAST]: {
    systemPrompt: `You are a construction cost estimator and data analyst. Forecast the Forecast at Completion (FAC) for budget line items using historical trends and current performance.`,
    userPromptTemplate: `Forecast FAC for these budget line items:

Budget Line Items:
{{#each lineItems}}
- {{this.code}} {{this.description}}
  Budgeted: {{this.budgetedCost}}
  Committed: {{this.committedCost}}
  Actual: {{this.actualCost}}
  % Complete: {{this.percentComplete}}%
{{/each}}

Historical Spending Pattern:
{{spendingPattern}}

Pending Change Orders:
{{pendingChangeOrders}}

Provide for each line item:
1. Forecasted FAC
2. Variance from budget ($)
3. Variance from budget (%)
4. Confidence interval
5. Key assumptions
6. Risk factors`,
    outputFormat: 'fac_forecast',
  },

  [AiOperationType.SCHEDULE_IMPACT_PREDICTION]: {
    systemPrompt: `You are a construction scheduler. Predict schedule impact of issues, changes, or delays.`,
    userPromptTemplate: `Predict schedule impact:

Issue/Change: {{issueDescription}}

Current Schedule:
- Current Phase: {{currentPhase}}
- % Complete: {{percentComplete}}%
- Days Remaining: {{daysRemaining}}
- Critical Path Activities: {{criticalPathActivities}}

Historical Delay Data:
{{historicalDelays}}

Predict:
1. Estimated delay (days)
2. Impact on critical path (Yes/No)
3. Confidence level (%)
4. Mitigation strategies
5. Cost impact of delay`,
    outputFormat: 'schedule_impact',
  },

  [AiOperationType.SUBCONTRACTOR_SCORING]: {
    systemPrompt: `You are a construction procurement specialist. Score subcontractor performance based on quality, schedule, safety, and communication metrics.`,
    userPromptTemplate: `Score this subcontractor:

Subcontractor: {{subName}}
Trade: {{trade}}

Performance Metrics:
- On-time completion: {{metrics.onTimePercent}}%
- Quality (defects/rework): {{metrics.qualityScore}}
- Safety incidents: {{metrics.safetyIncidents}}
- RFI response time: {{metrics.avgRfiResponseDays}} days
- Change order disputes: {{metrics.disputes}}

Project History:
{{projectHistory}}

Provide:
1. Overall score (0-100)
2. Category scores (Quality, Schedule, Safety, Communication)
3. Strengths
4. Areas for improvement
5. Recommendation (Excellent/Good/Fair/Poor)`,
    outputFormat: 'subcontractor_scorecard',
  },

  [AiOperationType.COST_TREND_FORECAST]: {
    systemPrompt: `You are a construction financial analyst. Forecast cost trends and identify budget risks.`,
    userPromptTemplate: `Forecast cost trends:

Monthly Cost Data (last 6 months):
{{monthlyCosts}}

Budget Status:
- Original Budget: {{budget.original}}
- Current Budget: {{budget.current}}
- Committed: {{budget.committed}}
- Actual Spent: {{budget.actual}}
- Remaining: {{budget.remaining}}

Pending Changes:
{{pendingChanges}}

Forecast:
1. Monthly spend projection (next 3 months)
2. Projected final cost
3. Projected variance from budget
4. Burn rate trend (increasing/stable/decreasing)
5. Budget risk areas
6. Recommended actions`,
    outputFormat: 'cost_trend_analysis',
  },

  [AiOperationType.RFI_VELOCITY_PREDICTION]: {
    systemPrompt: `You are a construction project coordinator. Predict RFI velocity and response times to forecast schedule impacts.`,
    userPromptTemplate: `Predict RFI velocity:

Current RFI Stats:
- Total RFIs: {{stats.total}}
- Open RFIs: {{stats.open}}
- Avg Response Time: {{stats.avgResponseDays}} days
- RFIs This Month: {{stats.thisMonth}}

Historical Trend (last 6 months):
{{historicalRfiData}}

Project Phase:
- Current Phase: {{currentPhase}}
- % Complete: {{percentComplete}}%

Predict:
1. Expected RFIs next month
2. Expected avg response time
3. Bottleneck areas
4. Schedule impact risk
5. Recommendations to improve velocity`,
    outputFormat: 'rfi_velocity_forecast',
  },

  // ============================================================================
  // EMBEDDINGS
  // ============================================================================

  [AiOperationType.GENERATE_EMBEDDING]: {
    systemPrompt: '', // Not used for embeddings
    userPromptTemplate: '', // Not used for embeddings
    outputFormat: 'embedding_vector',
  },
};

/**
 * Helper function to replace template variables
 */
export function renderPrompt(
  template: string,
  variables: Record<string, any>,
): string {
  let rendered = template;

  // Simple variable replacement {{variableName}}
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, String(value ?? ''));
  }

  // Handle Handlebars-style loops {{#each array}}...{{/each}}
  // This is a simplified version - for production, consider using a proper template engine
  const eachRegex = /{{#each (\w+)}}([\s\S]*?){{\/each}}/g;
  rendered = rendered.replace(eachRegex, (match, arrayName, template) => {
    const array = variables[arrayName];
    if (!Array.isArray(array)) return '';

    return array
      .map((item, index) => {
        let itemTemplate = template;
        // Replace {{this.property}}
        itemTemplate = itemTemplate.replace(/{{this\.(\w+)}}/g, (m, prop) => {
          return String(item[prop] ?? '');
        });
        // Replace {{@index}}
        itemTemplate = itemTemplate.replace(/{{@index}}/g, String(index + 1));
        return itemTemplate;
      })
      .join('\n');
  });

  return rendered;
}
