/**
 * Drawing Discipline Enum
 *
 * Standard construction drawing disciplines based on industry practice.
 * Used for organizing drawings by trade/discipline.
 */
export enum DrawingDiscipline {
  GENERAL = 'G', // General
  CIVIL = 'C', // Civil/Site
  LANDSCAPE = 'L', // Landscape
  ARCHITECTURAL = 'A', // Architectural
  STRUCTURAL = 'S', // Structural
  MECHANICAL = 'M', // Mechanical/HVAC
  PLUMBING = 'P', // Plumbing
  ELECTRICAL = 'E', // Electrical
  FIRE_PROTECTION = 'FP', // Fire Protection
  TECHNOLOGY = 'T', // Technology/Low Voltage
  INTERIOR = 'I', // Interior Design
  FOOD_SERVICE = 'FS', // Food Service
  EQUIPMENT = 'Q', // Equipment
  OTHER = 'X', // Other
}
