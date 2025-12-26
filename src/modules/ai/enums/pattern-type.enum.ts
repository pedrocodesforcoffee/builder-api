/**
 * Pattern Type Enum
 * Defines the types of patterns detected across projects
 */
export enum PatternType {
  COST_VARIANCE = 'COST_VARIANCE', // Cost variance patterns (e.g., "Structural always 10% over")
  SCHEDULE_VARIANCE = 'SCHEDULE_VARIANCE', // Schedule variance patterns
  SUBCONTRACTOR_PERFORMANCE = 'SUBCONTRACTOR_PERFORMANCE', // Vendor performance trends
  RFI_VELOCITY = 'RFI_VELOCITY', // RFI creation/response patterns
  CHANGE_ORDER_FREQUENCY = 'CHANGE_ORDER_FREQUENCY', // Change order patterns
  SAFETY_INCIDENTS = 'SAFETY_INCIDENTS', // Safety incident trends
  QUALITY_ISSUES = 'QUALITY_ISSUES', // Quality defect patterns
  MATERIAL_DELAYS = 'MATERIAL_DELAYS', // Material procurement delays
  LABOR_PRODUCTIVITY = 'LABOR_PRODUCTIVITY', // Labor efficiency trends
  WEATHER_IMPACT = 'WEATHER_IMPACT', // Weather-related delays
  PERMIT_DELAYS = 'PERMIT_DELAYS', // Permitting timeline patterns
  DESIGN_CHANGES = 'DESIGN_CHANGES', // Design change frequency
  CASH_FLOW = 'CASH_FLOW', // Cash flow patterns
  PUNCH_LIST = 'PUNCH_LIST', // Punch list size/closure patterns
}
