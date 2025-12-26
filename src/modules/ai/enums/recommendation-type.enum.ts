/**
 * Recommendation Type Enum
 * Defines the different types of AI-generated recommendations
 */
export enum RecommendationType {
  // Contextual Recommendations (Action-Triggered)
  SIMILAR_PROJECT = 'SIMILAR_PROJECT', // When viewing project details
  SUBCONTRACTOR_SUGGESTION = 'SUBCONTRACTOR_SUGGESTION', // When creating commitments
  COST_CODE_SUGGESTION = 'COST_CODE_SUGGESTION', // When entering costs
  SPECIFICATION_SECTION = 'SPECIFICATION_SECTION', // When creating RFIs/submittals
  DOCUMENT_SUGGESTION = 'DOCUMENT_SUGGESTION', // When searching/viewing documents
  LESSON_LEARNED = 'LESSON_LEARNED', // When encountering similar situations

  // Proactive Recommendations (Pattern-Based)
  BUDGET_RISK = 'BUDGET_RISK', // Predicted budget overrun risk
  SCHEDULE_RISK = 'SCHEDULE_RISK', // Predicted schedule delay
  QUALITY_CONCERN = 'QUALITY_CONCERN', // Quality pattern detected
  SAFETY_ALERT = 'SAFETY_ALERT', // Safety pattern detected
  COST_OPTIMIZATION = 'COST_OPTIMIZATION', // Cost-saving opportunity
  PROCESS_IMPROVEMENT = 'PROCESS_IMPROVEMENT', // Workflow optimization suggestion
  VENDOR_PERFORMANCE = 'VENDOR_PERFORMANCE', // Subcontractor/vendor performance alert
  RESOURCE_ALLOCATION = 'RESOURCE_ALLOCATION', // Resource optimization suggestion

  // Smart Defaults
  BUDGET_ESTIMATE = 'BUDGET_ESTIMATE', // Budget amount suggestion
  DURATION_ESTIMATE = 'DURATION_ESTIMATE', // Timeline suggestion
  MANPOWER_ESTIMATE = 'MANPOWER_ESTIMATE', // Labor resource suggestion
}
