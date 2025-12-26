/**
 * Document Type Enum
 *
 * Defines all possible types of documents that can be managed in the system.
 * Used for categorizing documents and applying type-specific business logic.
 */
export enum DocumentType {
  DRAWING = 'drawing',
  SPECIFICATION = 'specification',
  RFI = 'rfi',
  SUBMITTAL = 'submittal',
  CONTRACT = 'contract',
  CHANGE_ORDER = 'change_order',
  PHOTO = 'photo',
  MODEL_3D = 'model_3d',
  REPORT = 'report',
  SCHEDULE = 'schedule',
  MEETING_MINUTES = 'meeting_minutes',
  CORRESPONDENCE = 'correspondence',
  PERMIT = 'permit',
  INSPECTION = 'inspection',
  SAFETY = 'safety',
  CLOSEOUT = 'closeout',
  OTHER = 'other',
}
