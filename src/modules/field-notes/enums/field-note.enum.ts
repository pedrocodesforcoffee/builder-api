/**
 * Enums for Field Notes & Observations System
 */

/**
 * Types of field notes (25 types for comprehensive coverage)
 */
export enum FieldNoteType {
  GENERAL = 'GENERAL',
  SITE_CONDITIONS = 'SITE_CONDITIONS',
  WEATHER = 'WEATHER',
  VERBAL_DIRECTION = 'VERBAL_DIRECTION',
  MEETING = 'MEETING',
  PHONE_CALL = 'PHONE_CALL',
  DELAY = 'DELAY',
  INSPECTION = 'INSPECTION',
  QUALITY_ISSUE = 'QUALITY_ISSUE',
  SAFETY_CONCERN = 'SAFETY_CONCERN',
  VISITOR = 'VISITOR',
  DELIVERY = 'DELIVERY',
  EQUIPMENT = 'EQUIPMENT',
  MANPOWER = 'MANPOWER',
  MATERIAL_ISSUE = 'MATERIAL_ISSUE',
  CHANGE_ORDER = 'CHANGE_ORDER',
  WORK_DIRECTIVE = 'WORK_DIRECTIVE',
  CLARIFICATION = 'CLARIFICATION',
  COORDINATION = 'COORDINATION',
  PROGRESS_NOTE = 'PROGRESS_NOTE',
  DOCUMENTATION = 'DOCUMENTATION',
  OBSERVATION = 'OBSERVATION',
  DEFICIENCY = 'DEFICIENCY',
  COMPLETION = 'COMPLETION',
  OTHER = 'OTHER',
}

/**
 * Visibility levels for field notes
 */
export enum FieldNoteVisibility {
  PRIVATE = 'PRIVATE', // Only creator can see
  TEAM = 'TEAM', // Project team members
  SHARED = 'SHARED', // Shared with specific users/roles
  PUBLIC = 'PUBLIC', // All project participants
}

/**
 * Priority levels for follow-up actions
 */
export enum FieldNotePriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

/**
 * Status of field note (for follow-up tracking)
 */
export enum FieldNoteStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  FOLLOW_UP_REQUIRED = 'FOLLOW_UP_REQUIRED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Types of entities that can be linked to field notes
 */
export enum LinkedEntityType {
  RFI = 'RFI',
  SUBMITTAL = 'SUBMITTAL',
  DAILY_REPORT = 'DAILY_REPORT',
  PUNCH_ITEM = 'PUNCH_ITEM',
  SAFETY_OBSERVATION = 'SAFETY_OBSERVATION',
  SAFETY_INCIDENT = 'SAFETY_INCIDENT',
  CHANGE_ORDER = 'CHANGE_ORDER',
  MEETING = 'MEETING',
  DOCUMENT = 'DOCUMENT',
  COST_CODE = 'COST_CODE',
  SCHEDULE_TASK = 'SCHEDULE_TASK',
}

/**
 * Types of attachments
 */
export enum AttachmentType {
  PHOTO = 'PHOTO',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  DOCUMENT = 'DOCUMENT',
  SKETCH = 'SKETCH',
  PDF = 'PDF',
  OTHER = 'OTHER',
}

/**
 * Visibility for comments
 */
export enum CommentVisibility {
  PUBLIC = 'PUBLIC',
  TEAM = 'TEAM',
  PRIVATE = 'PRIVATE',
  INTERNAL = 'INTERNAL', // Internal team only
}

/**
 * History action types for audit trail
 */
export enum FieldNoteHistoryAction {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  VISIBILITY_CHANGED = 'VISIBILITY_CHANGED',
  ATTACHMENT_ADDED = 'ATTACHMENT_ADDED',
  ATTACHMENT_REMOVED = 'ATTACHMENT_REMOVED',
  LINK_ADDED = 'LINK_ADDED',
  LINK_REMOVED = 'LINK_REMOVED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  COMMENT_REMOVED = 'COMMENT_REMOVED',
  ASSIGNED = 'ASSIGNED',
  UNASSIGNED = 'UNASSIGNED',
  FOLLOW_UP_COMPLETED = 'FOLLOW_UP_COMPLETED',
  ARCHIVED = 'ARCHIVED',
  RESTORED = 'RESTORED',
}

/**
 * Weather conditions (for weather-specific field notes)
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
  WIND = 'WIND',
  EXTREME_HEAT = 'EXTREME_HEAT',
  EXTREME_COLD = 'EXTREME_COLD',
  STORM = 'STORM',
}
