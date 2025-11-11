/**
 * Permission Constants
 *
 * Defines all available permissions in the system
 * Format: feature:resource:action
 */

import {
  FeatureCategory,
  DocumentResource,
  DocumentAction,
  RfiAction,
  SubmittalAction,
  ScheduleAction,
  DailyReportAction,
  SafetyAction,
  BudgetAction,
  QualityAction,
  MeetingAction,
  ProjectSettingsAction,
} from '../types/permission.types';

/**
 * Wildcard permission (superuser only)
 */
export const ALL_PERMISSIONS = '*:*:*';

/**
 * Document Management Permissions
 */
export const DocumentPermissions = {
  // Drawings
  DRAWING_CREATE: `${FeatureCategory.DOCUMENTS}:${DocumentResource.DRAWING}:${DocumentAction.CREATE}`,
  DRAWING_READ: `${FeatureCategory.DOCUMENTS}:${DocumentResource.DRAWING}:${DocumentAction.READ}`,
  DRAWING_UPDATE: `${FeatureCategory.DOCUMENTS}:${DocumentResource.DRAWING}:${DocumentAction.UPDATE}`,
  DRAWING_DELETE: `${FeatureCategory.DOCUMENTS}:${DocumentResource.DRAWING}:${DocumentAction.DELETE}`,
  DRAWING_APPROVE: `${FeatureCategory.DOCUMENTS}:${DocumentResource.DRAWING}:${DocumentAction.APPROVE}`,
  DRAWING_EXPORT: `${FeatureCategory.DOCUMENTS}:${DocumentResource.DRAWING}:${DocumentAction.EXPORT}`,
  DRAWING_VERSION: `${FeatureCategory.DOCUMENTS}:${DocumentResource.DRAWING}:${DocumentAction.VERSION}`,

  // Specifications
  SPECIFICATION_CREATE: `${FeatureCategory.DOCUMENTS}:${DocumentResource.SPECIFICATION}:${DocumentAction.CREATE}`,
  SPECIFICATION_READ: `${FeatureCategory.DOCUMENTS}:${DocumentResource.SPECIFICATION}:${DocumentAction.READ}`,
  SPECIFICATION_UPDATE: `${FeatureCategory.DOCUMENTS}:${DocumentResource.SPECIFICATION}:${DocumentAction.UPDATE}`,
  SPECIFICATION_DELETE: `${FeatureCategory.DOCUMENTS}:${DocumentResource.SPECIFICATION}:${DocumentAction.DELETE}`,
  SPECIFICATION_APPROVE: `${FeatureCategory.DOCUMENTS}:${DocumentResource.SPECIFICATION}:${DocumentAction.APPROVE}`,
  SPECIFICATION_EXPORT: `${FeatureCategory.DOCUMENTS}:${DocumentResource.SPECIFICATION}:${DocumentAction.EXPORT}`,
  SPECIFICATION_VERSION: `${FeatureCategory.DOCUMENTS}:${DocumentResource.SPECIFICATION}:${DocumentAction.VERSION}`,

  // Photos
  PHOTO_CREATE: `${FeatureCategory.DOCUMENTS}:${DocumentResource.PHOTO}:${DocumentAction.CREATE}`,
  PHOTO_READ: `${FeatureCategory.DOCUMENTS}:${DocumentResource.PHOTO}:${DocumentAction.READ}`,
  PHOTO_UPDATE: `${FeatureCategory.DOCUMENTS}:${DocumentResource.PHOTO}:${DocumentAction.UPDATE}`,
  PHOTO_DELETE: `${FeatureCategory.DOCUMENTS}:${DocumentResource.PHOTO}:${DocumentAction.DELETE}`,
  PHOTO_EXPORT: `${FeatureCategory.DOCUMENTS}:${DocumentResource.PHOTO}:${DocumentAction.EXPORT}`,

  // Models
  MODEL_CREATE: `${FeatureCategory.DOCUMENTS}:${DocumentResource.MODEL}:${DocumentAction.CREATE}`,
  MODEL_READ: `${FeatureCategory.DOCUMENTS}:${DocumentResource.MODEL}:${DocumentAction.READ}`,
  MODEL_UPDATE: `${FeatureCategory.DOCUMENTS}:${DocumentResource.MODEL}:${DocumentAction.UPDATE}`,
  MODEL_DELETE: `${FeatureCategory.DOCUMENTS}:${DocumentResource.MODEL}:${DocumentAction.DELETE}`,
  MODEL_EXPORT: `${FeatureCategory.DOCUMENTS}:${DocumentResource.MODEL}:${DocumentAction.EXPORT}`,
  MODEL_VERSION: `${FeatureCategory.DOCUMENTS}:${DocumentResource.MODEL}:${DocumentAction.VERSION}`,

  // Reports
  REPORT_CREATE: `${FeatureCategory.DOCUMENTS}:${DocumentResource.REPORT}:${DocumentAction.CREATE}`,
  REPORT_READ: `${FeatureCategory.DOCUMENTS}:${DocumentResource.REPORT}:${DocumentAction.READ}`,
  REPORT_UPDATE: `${FeatureCategory.DOCUMENTS}:${DocumentResource.REPORT}:${DocumentAction.UPDATE}`,
  REPORT_DELETE: `${FeatureCategory.DOCUMENTS}:${DocumentResource.REPORT}:${DocumentAction.DELETE}`,
  REPORT_EXPORT: `${FeatureCategory.DOCUMENTS}:${DocumentResource.REPORT}:${DocumentAction.EXPORT}`,

  // Wildcard permissions
  ALL_DOCUMENTS: `${FeatureCategory.DOCUMENTS}:*:*`,
  ALL_DOCUMENT_READ: `${FeatureCategory.DOCUMENTS}:*:${DocumentAction.READ}`,
  ALL_DOCUMENT_CREATE: `${FeatureCategory.DOCUMENTS}:*:${DocumentAction.CREATE}`,
  ALL_DRAWING: `${FeatureCategory.DOCUMENTS}:${DocumentResource.DRAWING}:*`,
  ALL_PHOTO: `${FeatureCategory.DOCUMENTS}:${DocumentResource.PHOTO}:*`,
} as const;

/**
 * RFI (Request for Information) Permissions
 */
export const RfiPermissions = {
  RFI_CREATE: `${FeatureCategory.RFIS}:rfi:${RfiAction.CREATE}`,
  RFI_READ: `${FeatureCategory.RFIS}:rfi:${RfiAction.READ}`,
  RFI_UPDATE: `${FeatureCategory.RFIS}:rfi:${RfiAction.UPDATE}`,
  RFI_DELETE: `${FeatureCategory.RFIS}:rfi:${RfiAction.DELETE}`,
  RFI_ASSIGN: `${FeatureCategory.RFIS}:rfi:${RfiAction.ASSIGN}`,
  RFI_RESPOND: `${FeatureCategory.RFIS}:rfi:${RfiAction.RESPOND}`,
  RFI_APPROVE: `${FeatureCategory.RFIS}:rfi:${RfiAction.APPROVE}`,
  RFI_CLOSE: `${FeatureCategory.RFIS}:rfi:${RfiAction.CLOSE}`,

  // Wildcard
  ALL_RFIS: `${FeatureCategory.RFIS}:*:*`,
} as const;

/**
 * Submittal Permissions
 */
export const SubmittalPermissions = {
  SUBMITTAL_CREATE: `${FeatureCategory.SUBMITTALS}:submittal:${SubmittalAction.CREATE}`,
  SUBMITTAL_READ: `${FeatureCategory.SUBMITTALS}:submittal:${SubmittalAction.READ}`,
  SUBMITTAL_UPDATE: `${FeatureCategory.SUBMITTALS}:submittal:${SubmittalAction.UPDATE}`,
  SUBMITTAL_DELETE: `${FeatureCategory.SUBMITTALS}:submittal:${SubmittalAction.DELETE}`,
  SUBMITTAL_REVIEW: `${FeatureCategory.SUBMITTALS}:submittal:${SubmittalAction.REVIEW}`,
  SUBMITTAL_APPROVE: `${FeatureCategory.SUBMITTALS}:submittal:${SubmittalAction.APPROVE}`,
  SUBMITTAL_REJECT: `${FeatureCategory.SUBMITTALS}:submittal:${SubmittalAction.REJECT}`,
  SUBMITTAL_REQUIRE_RESUBMIT: `${FeatureCategory.SUBMITTALS}:submittal:${SubmittalAction.REQUIRE_RESUBMIT}`,

  // Wildcard
  ALL_SUBMITTALS: `${FeatureCategory.SUBMITTALS}:*:*`,
} as const;

/**
 * Schedule Management Permissions
 */
export const SchedulePermissions = {
  TASK_CREATE: `${FeatureCategory.SCHEDULE}:task:${ScheduleAction.CREATE}`,
  TASK_READ: `${FeatureCategory.SCHEDULE}:task:${ScheduleAction.READ}`,
  TASK_UPDATE: `${FeatureCategory.SCHEDULE}:task:${ScheduleAction.UPDATE}`,
  TASK_DELETE: `${FeatureCategory.SCHEDULE}:task:${ScheduleAction.DELETE}`,
  TASK_ASSIGN: `${FeatureCategory.SCHEDULE}:task:${ScheduleAction.ASSIGN}`,
  TASK_COMPLETE: `${FeatureCategory.SCHEDULE}:task:${ScheduleAction.COMPLETE}`,

  MILESTONE_CREATE: `${FeatureCategory.SCHEDULE}:milestone:${ScheduleAction.CREATE}`,
  MILESTONE_READ: `${FeatureCategory.SCHEDULE}:milestone:${ScheduleAction.READ}`,
  MILESTONE_UPDATE: `${FeatureCategory.SCHEDULE}:milestone:${ScheduleAction.UPDATE}`,
  MILESTONE_DELETE: `${FeatureCategory.SCHEDULE}:milestone:${ScheduleAction.DELETE}`,
  MILESTONE_APPROVE: `${FeatureCategory.SCHEDULE}:milestone:${ScheduleAction.APPROVE}`,

  DEPENDENCY_CREATE: `${FeatureCategory.SCHEDULE}:dependency:${ScheduleAction.CREATE}`,
  DEPENDENCY_READ: `${FeatureCategory.SCHEDULE}:dependency:${ScheduleAction.READ}`,
  DEPENDENCY_UPDATE: `${FeatureCategory.SCHEDULE}:dependency:${ScheduleAction.UPDATE}`,
  DEPENDENCY_DELETE: `${FeatureCategory.SCHEDULE}:dependency:${ScheduleAction.DELETE}`,

  // Wildcard
  ALL_SCHEDULE: `${FeatureCategory.SCHEDULE}:*:*`,
  ALL_SCHEDULE_READ: `${FeatureCategory.SCHEDULE}:*:${ScheduleAction.READ}`,
} as const;

/**
 * Daily Report Permissions
 */
export const DailyReportPermissions = {
  DAILY_REPORT_CREATE: `${FeatureCategory.DAILY_REPORTS}:daily_report:${DailyReportAction.CREATE}`,
  DAILY_REPORT_READ: `${FeatureCategory.DAILY_REPORTS}:daily_report:${DailyReportAction.READ}`,
  DAILY_REPORT_UPDATE: `${FeatureCategory.DAILY_REPORTS}:daily_report:${DailyReportAction.UPDATE}`,
  DAILY_REPORT_DELETE: `${FeatureCategory.DAILY_REPORTS}:daily_report:${DailyReportAction.DELETE}`,
  DAILY_REPORT_APPROVE: `${FeatureCategory.DAILY_REPORTS}:daily_report:${DailyReportAction.APPROVE}`,
  DAILY_REPORT_EXPORT: `${FeatureCategory.DAILY_REPORTS}:daily_report:${DailyReportAction.EXPORT}`,

  WEATHER_CREATE: `${FeatureCategory.DAILY_REPORTS}:weather:${DailyReportAction.CREATE}`,
  WEATHER_READ: `${FeatureCategory.DAILY_REPORTS}:weather:${DailyReportAction.READ}`,
  WEATHER_UPDATE: `${FeatureCategory.DAILY_REPORTS}:weather:${DailyReportAction.UPDATE}`,

  LABOR_CREATE: `${FeatureCategory.DAILY_REPORTS}:labor:${DailyReportAction.CREATE}`,
  LABOR_READ: `${FeatureCategory.DAILY_REPORTS}:labor:${DailyReportAction.READ}`,
  LABOR_UPDATE: `${FeatureCategory.DAILY_REPORTS}:labor:${DailyReportAction.UPDATE}`,

  EQUIPMENT_CREATE: `${FeatureCategory.DAILY_REPORTS}:equipment:${DailyReportAction.CREATE}`,
  EQUIPMENT_READ: `${FeatureCategory.DAILY_REPORTS}:equipment:${DailyReportAction.READ}`,
  EQUIPMENT_UPDATE: `${FeatureCategory.DAILY_REPORTS}:equipment:${DailyReportAction.UPDATE}`,

  // Wildcard
  ALL_DAILY_REPORTS: `${FeatureCategory.DAILY_REPORTS}:*:*`,
} as const;

/**
 * Safety Permissions
 */
export const SafetyPermissions = {
  INCIDENT_CREATE: `${FeatureCategory.SAFETY}:incident:${SafetyAction.CREATE}`,
  INCIDENT_READ: `${FeatureCategory.SAFETY}:incident:${SafetyAction.READ}`,
  INCIDENT_UPDATE: `${FeatureCategory.SAFETY}:incident:${SafetyAction.UPDATE}`,
  INCIDENT_DELETE: `${FeatureCategory.SAFETY}:incident:${SafetyAction.DELETE}`,
  INCIDENT_INVESTIGATE: `${FeatureCategory.SAFETY}:incident:${SafetyAction.INVESTIGATE}`,
  INCIDENT_CLOSE: `${FeatureCategory.SAFETY}:incident:${SafetyAction.CLOSE}`,

  INSPECTION_CREATE: `${FeatureCategory.SAFETY}:inspection:${SafetyAction.CREATE}`,
  INSPECTION_READ: `${FeatureCategory.SAFETY}:inspection:${SafetyAction.READ}`,
  INSPECTION_UPDATE: `${FeatureCategory.SAFETY}:inspection:${SafetyAction.UPDATE}`,
  INSPECTION_DELETE: `${FeatureCategory.SAFETY}:inspection:${SafetyAction.DELETE}`,

  MEETING_CREATE: `${FeatureCategory.SAFETY}:meeting:${SafetyAction.CREATE}`,
  MEETING_READ: `${FeatureCategory.SAFETY}:meeting:${SafetyAction.READ}`,
  MEETING_UPDATE: `${FeatureCategory.SAFETY}:meeting:${SafetyAction.UPDATE}`,

  TOOLBOX_TALK_CREATE: `${FeatureCategory.SAFETY}:toolbox_talk:${SafetyAction.CREATE}`,
  TOOLBOX_TALK_READ: `${FeatureCategory.SAFETY}:toolbox_talk:${SafetyAction.READ}`,
  TOOLBOX_TALK_UPDATE: `${FeatureCategory.SAFETY}:toolbox_talk:${SafetyAction.UPDATE}`,

  // Wildcard
  ALL_SAFETY: `${FeatureCategory.SAFETY}:*:*`,
} as const;

/**
 * Budget & Cost Permissions
 */
export const BudgetPermissions = {
  BUDGET_ITEM_READ: `${FeatureCategory.BUDGET}:budget_item:${BudgetAction.READ}`,
  BUDGET_ITEM_CREATE: `${FeatureCategory.BUDGET}:budget_item:${BudgetAction.CREATE}`,
  BUDGET_ITEM_UPDATE: `${FeatureCategory.BUDGET}:budget_item:${BudgetAction.UPDATE}`,
  BUDGET_ITEM_EXPORT: `${FeatureCategory.BUDGET}:budget_item:${BudgetAction.EXPORT}`,

  CHANGE_ORDER_READ: `${FeatureCategory.BUDGET}:change_order:${BudgetAction.READ}`,
  CHANGE_ORDER_CREATE: `${FeatureCategory.BUDGET}:change_order:${BudgetAction.CREATE}`,
  CHANGE_ORDER_UPDATE: `${FeatureCategory.BUDGET}:change_order:${BudgetAction.UPDATE}`,
  CHANGE_ORDER_APPROVE: `${FeatureCategory.BUDGET}:change_order:${BudgetAction.APPROVE}`,

  INVOICE_READ: `${FeatureCategory.BUDGET}:invoice:${BudgetAction.READ}`,
  INVOICE_CREATE: `${FeatureCategory.BUDGET}:invoice:${BudgetAction.CREATE}`,
  INVOICE_UPDATE: `${FeatureCategory.BUDGET}:invoice:${BudgetAction.UPDATE}`,
  INVOICE_APPROVE: `${FeatureCategory.BUDGET}:invoice:${BudgetAction.APPROVE}`,

  PAYMENT_READ: `${FeatureCategory.BUDGET}:payment:${BudgetAction.READ}`,
  PAYMENT_APPROVE: `${FeatureCategory.BUDGET}:payment:${BudgetAction.APPROVE}`,

  // Wildcard
  ALL_BUDGET: `${FeatureCategory.BUDGET}:*:*`,
  ALL_BUDGET_READ: `${FeatureCategory.BUDGET}:*:${BudgetAction.READ}`,
} as const;

/**
 * Quality Control Permissions
 */
export const QualityPermissions = {
  INSPECTION_CREATE: `${FeatureCategory.QUALITY}:inspection:${QualityAction.CREATE}`,
  INSPECTION_READ: `${FeatureCategory.QUALITY}:inspection:${QualityAction.READ}`,
  INSPECTION_UPDATE: `${FeatureCategory.QUALITY}:inspection:${QualityAction.UPDATE}`,
  INSPECTION_DELETE: `${FeatureCategory.QUALITY}:inspection:${QualityAction.DELETE}`,
  INSPECTION_APPROVE: `${FeatureCategory.QUALITY}:inspection:${QualityAction.APPROVE}`,

  PUNCH_ITEM_CREATE: `${FeatureCategory.QUALITY}:punch_item:${QualityAction.CREATE}`,
  PUNCH_ITEM_READ: `${FeatureCategory.QUALITY}:punch_item:${QualityAction.READ}`,
  PUNCH_ITEM_UPDATE: `${FeatureCategory.QUALITY}:punch_item:${QualityAction.UPDATE}`,
  PUNCH_ITEM_DELETE: `${FeatureCategory.QUALITY}:punch_item:${QualityAction.DELETE}`,

  TEST_RESULT_CREATE: `${FeatureCategory.QUALITY}:test_result:${QualityAction.CREATE}`,
  TEST_RESULT_READ: `${FeatureCategory.QUALITY}:test_result:${QualityAction.READ}`,
  TEST_RESULT_UPDATE: `${FeatureCategory.QUALITY}:test_result:${QualityAction.UPDATE}`,
  TEST_RESULT_PASS: `${FeatureCategory.QUALITY}:test_result:${QualityAction.PASS}`,
  TEST_RESULT_FAIL: `${FeatureCategory.QUALITY}:test_result:${QualityAction.FAIL}`,

  // Wildcard
  ALL_QUALITY: `${FeatureCategory.QUALITY}:*:*`,
} as const;

/**
 * Meeting Permissions
 */
export const MeetingPermissions = {
  MEETING_CREATE: `${FeatureCategory.MEETINGS}:meeting:${MeetingAction.CREATE}`,
  MEETING_READ: `${FeatureCategory.MEETINGS}:meeting:${MeetingAction.READ}`,
  MEETING_UPDATE: `${FeatureCategory.MEETINGS}:meeting:${MeetingAction.UPDATE}`,
  MEETING_DELETE: `${FeatureCategory.MEETINGS}:meeting:${MeetingAction.DELETE}`,
  MEETING_SCHEDULE: `${FeatureCategory.MEETINGS}:meeting:${MeetingAction.SCHEDULE}`,
  MEETING_CANCEL: `${FeatureCategory.MEETINGS}:meeting:${MeetingAction.CANCEL}`,

  MINUTES_CREATE: `${FeatureCategory.MEETINGS}:minutes:${MeetingAction.CREATE}`,
  MINUTES_READ: `${FeatureCategory.MEETINGS}:minutes:${MeetingAction.READ}`,
  MINUTES_UPDATE: `${FeatureCategory.MEETINGS}:minutes:${MeetingAction.UPDATE}`,

  ACTION_ITEM_CREATE: `${FeatureCategory.MEETINGS}:action_item:${MeetingAction.CREATE}`,
  ACTION_ITEM_READ: `${FeatureCategory.MEETINGS}:action_item:${MeetingAction.READ}`,
  ACTION_ITEM_UPDATE: `${FeatureCategory.MEETINGS}:action_item:${MeetingAction.UPDATE}`,

  // Wildcard
  ALL_MEETINGS: `${FeatureCategory.MEETINGS}:*:*`,
} as const;

/**
 * Project Settings Permissions
 */
export const ProjectSettingsPermissions = {
  SETTINGS_READ: `${FeatureCategory.PROJECT_SETTINGS}:settings:${ProjectSettingsAction.READ}`,
  SETTINGS_UPDATE: `${FeatureCategory.PROJECT_SETTINGS}:settings:${ProjectSettingsAction.UPDATE}`,
  SETTINGS_CONFIGURE: `${FeatureCategory.PROJECT_SETTINGS}:settings:${ProjectSettingsAction.CONFIGURE}`,

  MEMBERS_READ: `${FeatureCategory.PROJECT_SETTINGS}:members:${ProjectSettingsAction.READ}`,
  MEMBERS_INVITE: `${FeatureCategory.PROJECT_SETTINGS}:members:${ProjectSettingsAction.INVITE}`,
  MEMBERS_REMOVE: `${FeatureCategory.PROJECT_SETTINGS}:members:${ProjectSettingsAction.REMOVE}`,
  MEMBERS_UPDATE: `${FeatureCategory.PROJECT_SETTINGS}:members:${ProjectSettingsAction.UPDATE}`,

  PERMISSIONS_READ: `${FeatureCategory.PROJECT_SETTINGS}:permissions:${ProjectSettingsAction.READ}`,
  PERMISSIONS_UPDATE: `${FeatureCategory.PROJECT_SETTINGS}:permissions:${ProjectSettingsAction.UPDATE}`,

  INTEGRATIONS_READ: `${FeatureCategory.PROJECT_SETTINGS}:integrations:${ProjectSettingsAction.READ}`,
  INTEGRATIONS_CONFIGURE: `${FeatureCategory.PROJECT_SETTINGS}:integrations:${ProjectSettingsAction.CONFIGURE}`,

  // Wildcard
  ALL_PROJECT_SETTINGS: `${FeatureCategory.PROJECT_SETTINGS}:*:*`,
} as const;

/**
 * All permission constants combined
 */
export const Permissions = {
  ...DocumentPermissions,
  ...RfiPermissions,
  ...SubmittalPermissions,
  ...SchedulePermissions,
  ...DailyReportPermissions,
  ...SafetyPermissions,
  ...BudgetPermissions,
  ...QualityPermissions,
  ...MeetingPermissions,
  ...ProjectSettingsPermissions,
  ALL_PERMISSIONS,
} as const;

/**
 * Get all permission values as array
 */
export const getAllPermissions = (): string[] => {
  return Object.values(Permissions);
};

/**
 * Get permissions for a specific feature
 */
export const getFeaturePermissions = (feature: FeatureCategory): string[] => {
  return getAllPermissions().filter(p => p.startsWith(`${feature}:`));
};
