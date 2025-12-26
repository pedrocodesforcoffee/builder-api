/**
 * Safety & Toolbox Talks Module - Enums
 * Comprehensive enums for OSHA compliance, incident tracking, and safety management
 */

/**
 * Safety topic categories for toolbox talks and training
 */
export enum SafetyTopicCategory {
  FALL_PROTECTION = 'FALL_PROTECTION',
  ELECTRICAL = 'ELECTRICAL',
  HAZARD_COMMUNICATION = 'HAZARD_COMMUNICATION',
  SCAFFOLDING = 'SCAFFOLDING',
  LADDERS = 'LADDERS',
  PERSONAL_PROTECTIVE_EQUIPMENT = 'PERSONAL_PROTECTIVE_EQUIPMENT',
  EXCAVATION = 'EXCAVATION',
  CONFINED_SPACES = 'CONFINED_SPACES',
  LOCKOUT_TAGOUT = 'LOCKOUT_TAGOUT',
  MACHINE_GUARDING = 'MACHINE_GUARDING',
  POWERED_INDUSTRIAL_VEHICLES = 'POWERED_INDUSTRIAL_VEHICLES',
  CRANES_HOISTS = 'CRANES_HOISTS',
  WELDING_HOT_WORK = 'WELDING_HOT_WORK',
  FIRE_PREVENTION = 'FIRE_PREVENTION',
  FIRST_AID = 'FIRST_AID',
  EMERGENCY_ACTION_PLAN = 'EMERGENCY_ACTION_PLAN',
  HOUSEKEEPING = 'HOUSEKEEPING',
  MATERIAL_HANDLING = 'MATERIAL_HANDLING',
  HAND_POWER_TOOLS = 'HAND_POWER_TOOLS',
  RESPIRATORY_PROTECTION = 'RESPIRATORY_PROTECTION',
  HEARING_CONSERVATION = 'HEARING_CONSERVATION',
  HEAT_STRESS = 'HEAT_STRESS',
  COLD_STRESS = 'COLD_STRESS',
  BLOODBORNE_PATHOGENS = 'BLOODBORNE_PATHOGENS',
  HAZARDOUS_MATERIALS = 'HAZARDOUS_MATERIALS',
  ASBESTOS = 'ASBESTOS',
  LEAD = 'LEAD',
  SILICA = 'SILICA',
  RIGGING = 'RIGGING',
  TRENCHING = 'TRENCHING',
  STEEL_ERECTION = 'STEEL_ERECTION',
  CONCRETE_MASONRY = 'CONCRETE_MASONRY',
  DEMOLITION = 'DEMOLITION',
  GENERAL = 'GENERAL',
  OTHER = 'OTHER',
}

/**
 * Toolbox talk workflow status
 */
export enum ToolboxTalkStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  RESCHEDULED = 'RESCHEDULED',
}

/**
 * Worker attendance status for toolbox talks
 */
export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  EXCUSED = 'EXCUSED',
  LATE = 'LATE',
}

/**
 * Safety observation severity levels
 */
export enum ObservationSeverity {
  CRITICAL = 'CRITICAL',           // Immediate danger, stop work
  HIGH = 'HIGH',                   // Serious hazard, immediate action required
  MEDIUM = 'MEDIUM',               // Moderate risk, action required soon
  LOW = 'LOW',                     // Minor issue, document and monitor
  POSITIVE = 'POSITIVE',           // Positive observation, recognize safe behavior
}

/**
 * Safety observation workflow status
 */
export enum ObservationStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  VERIFIED = 'VERIFIED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

/**
 * Corrective action status
 */
export enum ActionStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  VERIFIED = 'VERIFIED',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

/**
 * Incident severity classification
 */
export enum IncidentSeverity {
  FATALITY = 'FATALITY',                           // Death
  CATASTROPHIC = 'CATASTROPHIC',                   // Multiple hospitalizations
  SERIOUS = 'SERIOUS',                             // Single hospitalization
  LOST_TIME = 'LOST_TIME',                         // Lost workday case
  RESTRICTED_WORK = 'RESTRICTED_WORK',             // Restricted work case
  MEDICAL_TREATMENT = 'MEDICAL_TREATMENT',         // Medical treatment only
  FIRST_AID = 'FIRST_AID',                         // First aid only
  NEAR_MISS = 'NEAR_MISS',                         // No injury but potential
  PROPERTY_DAMAGE = 'PROPERTY_DAMAGE',             // Property damage only
}

/**
 * Incident types (OSHA classification)
 */
export enum IncidentType {
  // Injury/Illness
  INJURY = 'INJURY',
  ILLNESS = 'ILLNESS',
  NEAR_MISS = 'NEAR_MISS',

  // Specific incident types
  FALL_FROM_HEIGHT = 'FALL_FROM_HEIGHT',
  FALL_SAME_LEVEL = 'FALL_SAME_LEVEL',
  STRUCK_BY = 'STRUCK_BY',
  STRUCK_AGAINST = 'STRUCK_AGAINST',
  CAUGHT_IN_BETWEEN = 'CAUGHT_IN_BETWEEN',
  ELECTROCUTION = 'ELECTROCUTION',
  EXPOSURE = 'EXPOSURE',
  OVEREXERTION = 'OVEREXERTION',
  REPETITIVE_MOTION = 'REPETITIVE_MOTION',

  // Vehicle/Equipment
  VEHICLE_INCIDENT = 'VEHICLE_INCIDENT',
  EQUIPMENT_FAILURE = 'EQUIPMENT_FAILURE',

  // Environmental
  FIRE = 'FIRE',
  EXPLOSION = 'EXPLOSION',
  CHEMICAL_RELEASE = 'CHEMICAL_RELEASE',

  // Other
  PROPERTY_DAMAGE = 'PROPERTY_DAMAGE',
  ENVIRONMENTAL = 'ENVIRONMENTAL',
  OTHER = 'OTHER',
}

/**
 * Injury types for incident reporting
 */
export enum InjuryType {
  // No injury
  NO_INJURY = 'NO_INJURY',

  // Injury types
  AMPUTATION = 'AMPUTATION',
  BURN = 'BURN',
  CHEMICAL_BURN = 'CHEMICAL_BURN',
  CONCUSSION = 'CONCUSSION',
  CONTUSION = 'CONTUSION',
  CUT_LACERATION = 'CUT_LACERATION',
  DISLOCATION = 'DISLOCATION',
  FRACTURE = 'FRACTURE',
  HEARING_LOSS = 'HEARING_LOSS',
  PUNCTURE = 'PUNCTURE',
  SPRAIN_STRAIN = 'SPRAIN_STRAIN',

  // Illnesses
  RESPIRATORY_CONDITION = 'RESPIRATORY_CONDITION',
  SKIN_DISORDER = 'SKIN_DISORDER',
  POISONING = 'POISONING',

  // Other
  MULTIPLE_INJURIES = 'MULTIPLE_INJURIES',
  OTHER = 'OTHER',
}

/**
 * Body parts affected
 */
export enum BodyPart {
  HEAD = 'HEAD',
  EYES = 'EYES',
  EARS = 'EARS',
  FACE = 'FACE',
  NECK = 'NECK',

  SHOULDER = 'SHOULDER',
  UPPER_ARM = 'UPPER_ARM',
  ELBOW = 'ELBOW',
  FOREARM = 'FOREARM',
  WRIST = 'WRIST',
  HAND = 'HAND',
  FINGER = 'FINGER',

  CHEST = 'CHEST',
  ABDOMEN = 'ABDOMEN',
  BACK_UPPER = 'BACK_UPPER',
  BACK_LOWER = 'BACK_LOWER',

  HIP = 'HIP',
  UPPER_LEG = 'UPPER_LEG',
  KNEE = 'KNEE',
  LOWER_LEG = 'LOWER_LEG',
  ANKLE = 'ANKLE',
  FOOT = 'FOOT',
  TOE = 'TOE',

  MULTIPLE = 'MULTIPLE',
  INTERNAL = 'INTERNAL',
  SYSTEMIC = 'SYSTEMIC',
  OTHER = 'OTHER',
}

/**
 * Investigation workflow status
 */
export enum InvestigationStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING_REVIEW = 'PENDING_REVIEW',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED',
}

/**
 * Safety certification types
 */
export enum CertificationType {
  // OSHA Certifications
  OSHA_10 = 'OSHA_10',
  OSHA_30 = 'OSHA_30',
  OSHA_500 = 'OSHA_500',
  OSHA_510 = 'OSHA_510',

  // Fall Protection
  FALL_PROTECTION = 'FALL_PROTECTION',
  COMPETENT_PERSON_FALL = 'COMPETENT_PERSON_FALL',

  // Scaffold
  SCAFFOLD_COMPETENT_PERSON = 'SCAFFOLD_COMPETENT_PERSON',
  SCAFFOLD_USER = 'SCAFFOLD_USER',

  // Confined Space
  CONFINED_SPACE_ENTRY = 'CONFINED_SPACE_ENTRY',
  CONFINED_SPACE_ATTENDANT = 'CONFINED_SPACE_ATTENDANT',
  CONFINED_SPACE_SUPERVISOR = 'CONFINED_SPACE_SUPERVISOR',

  // Equipment
  FORKLIFT_OPERATOR = 'FORKLIFT_OPERATOR',
  CRANE_OPERATOR = 'CRANE_OPERATOR',
  AERIAL_LIFT = 'AERIAL_LIFT',
  RIGGING = 'RIGGING',
  SIGNAL_PERSON = 'SIGNAL_PERSON',

  // Specialized
  FIRST_AID_CPR = 'FIRST_AID_CPR',
  BLOODBORNE_PATHOGENS = 'BLOODBORNE_PATHOGENS',
  HAZMAT = 'HAZMAT',
  LOCKOUT_TAGOUT = 'LOCKOUT_TAGOUT',
  RESPIRATORY_PROTECTION = 'RESPIRATORY_PROTECTION',
  HEARING_CONSERVATION = 'HEARING_CONSERVATION',

  // Welding/Hot Work
  WELDING = 'WELDING',
  HOT_WORK = 'HOT_WORK',
  FIRE_WATCH = 'FIRE_WATCH',

  // Electrical
  ELECTRICAL_SAFETY = 'ELECTRICAL_SAFETY',
  ARC_FLASH = 'ARC_FLASH',

  // Excavation
  COMPETENT_PERSON_EXCAVATION = 'COMPETENT_PERSON_EXCAVATION',

  // Silica/Asbestos/Lead
  SILICA_AWARENESS = 'SILICA_AWARENESS',
  ASBESTOS_AWARENESS = 'ASBESTOS_AWARENESS',
  LEAD_AWARENESS = 'LEAD_AWARENESS',

  // Other
  OTHER = 'OTHER',
}

/**
 * Certification status
 */
export enum CertificationStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  EXPIRING_SOON = 'EXPIRING_SOON',     // Within 30 days
  SUSPENDED = 'SUSPENDED',
  REVOKED = 'REVOKED',
  PENDING_RENEWAL = 'PENDING_RENEWAL',
}
