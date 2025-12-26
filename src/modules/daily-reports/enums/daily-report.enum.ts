/**
 * Daily Report Status Enum
 * Tracks the workflow state of a daily report
 */
export enum DailyReportStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/**
 * Weather Condition Enum
 * Describes weather conditions observed on site
 */
export enum WeatherCondition {
  CLEAR = 'CLEAR',
  PARTLY_CLOUDY = 'PARTLY_CLOUDY',
  CLOUDY = 'CLOUDY',
  RAIN = 'RAIN',
  HEAVY_RAIN = 'HEAVY_RAIN',
  SNOW = 'SNOW',
  SLEET = 'SLEET',
  FOG = 'FOG',
  WINDY = 'WINDY',
  STORM = 'STORM',
}

/**
 * Work Impact Enum
 * Describes how weather or other factors impacted work
 */
export enum WorkImpact {
  NONE = 'NONE',
  MINOR = 'MINOR',
  MODERATE = 'MODERATE',
  MAJOR = 'MAJOR',
  STOPPED = 'STOPPED',
}

/**
 * Delay Type Enum
 * Categorizes types of delays encountered on site
 */
export enum DelayType {
  WEATHER = 'WEATHER',
  MATERIAL = 'MATERIAL',
  LABOR = 'LABOR',
  EQUIPMENT = 'EQUIPMENT',
  OWNER = 'OWNER',
  DESIGN = 'DESIGN',
  PERMIT = 'PERMIT',
  INSPECTION = 'INSPECTION',
  OTHER = 'OTHER',
}

/**
 * Incident Type Enum
 * Categorizes safety and security incidents
 */
export enum IncidentType {
  INJURY = 'INJURY',
  NEAR_MISS = 'NEAR_MISS',
  PROPERTY_DAMAGE = 'PROPERTY_DAMAGE',
  ENVIRONMENTAL = 'ENVIRONMENTAL',
  SAFETY_VIOLATION = 'SAFETY_VIOLATION',
  THEFT = 'THEFT',
  OTHER = 'OTHER',
}

/**
 * Incident Severity Enum
 * Rates the severity of incidents
 */
export enum IncidentSeverity {
  MINOR = 'MINOR',
  MODERATE = 'MODERATE',
  SERIOUS = 'SERIOUS',
  CRITICAL = 'CRITICAL',
}

/**
 * Inspection Result Enum
 * Records the outcome of inspections
 */
export enum InspectionResult {
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
  CANCELLED = 'CANCELLED',
  RESCHEDULED = 'RESCHEDULED',
}
