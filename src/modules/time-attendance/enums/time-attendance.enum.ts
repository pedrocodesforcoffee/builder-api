/**
 * Time & Attendance System Enums
 *
 * All enums used throughout the Time & Attendance module for type safety and validation
 */

/**
 * Status workflow for time entries
 * DRAFT → SUBMITTED → APPROVED/REJECTED → LOCKED
 */
export enum TimeEntryStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  LOCKED = 'LOCKED',
}

/**
 * Methods for clocking in/out
 */
export enum ClockMethod {
  MOBILE_APP = 'MOBILE_APP',
  KIOSK = 'KIOSK',
  WEB = 'WEB',
  MANUAL = 'MANUAL',
  QR_CODE = 'QR_CODE',
  NFC = 'NFC',
  BIOMETRIC = 'BIOMETRIC',
}

/**
 * Worker employment classifications
 */
export enum EmploymentType {
  DIRECT_EMPLOYEE = 'DIRECT_EMPLOYEE',
  SUBCONTRACTOR = 'SUBCONTRACTOR',
  UNION = 'UNION',
  NON_UNION = 'NON_UNION',
  TEMPORARY = 'TEMPORARY',
  APPRENTICE = 'APPRENTICE',
}

/**
 * Overtime calculation rules
 */
export enum OvertimeRule {
  STANDARD = 'STANDARD',           // >40 hours weekly
  CALIFORNIA = 'CALIFORNIA',       // >8 daily OT, >12 daily DT
  UNION = 'UNION',                 // Custom union rules
  CONSTRUCTION = 'CONSTRUCTION',   // Construction-specific
  STATE_SPECIFIC = 'STATE_SPECIFIC', // Other state rules
  CUSTOM = 'CUSTOM',               // Custom configuration
}

/**
 * Clock event types for timestamped tracking
 */
export enum EventType {
  CLOCK_IN = 'CLOCK_IN',
  CLOCK_OUT = 'CLOCK_OUT',
  BREAK_START = 'BREAK_START',
  BREAK_END = 'BREAK_END',
  LUNCH_START = 'LUNCH_START',
  LUNCH_END = 'LUNCH_END',
}

/**
 * Geofence boundary types
 */
export enum GeofenceType {
  CIRCULAR = 'CIRCULAR',
  POLYGON = 'POLYGON',
}

/**
 * Status workflow for crew timesheets
 */
export enum CrewTimesheetStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/**
 * Supported payroll export formats
 */
export enum PayrollExportFormat {
  CSV = 'CSV',
  JSON = 'JSON',
  XML = 'XML',
  QUICKBOOKS = 'QUICKBOOKS',
  ADP = 'ADP',
}
