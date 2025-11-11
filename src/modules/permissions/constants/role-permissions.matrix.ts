/**
 * Role Permission Matrix
 *
 * Maps each project role to their specific permissions
 * Defines exactly what each of the 10 project roles can do
 */

import { ProjectRole } from '../../users/enums/project-role.enum';
import { OrganizationRole } from '../../users/enums/organization-role.enum';
import { Permissions } from './permissions.constants';

/**
 * Project Role Permission Matrix
 *
 * Each role is mapped to an array of permission strings
 * Supports wildcards for broader access
 */
export const PROJECT_ROLE_PERMISSIONS: Record<ProjectRole, string[]> = {
  /**
   * PROJECT_ADMIN - Full Project Access
   * Complete control over all project features
   */
  [ProjectRole.PROJECT_ADMIN]: [
    Permissions.ALL_PERMISSIONS, // Full access to everything
  ],

  /**
   * PROJECT_MANAGER - Management Without Settings
   * Can manage all project operations but limited settings access
   */
  [ProjectRole.PROJECT_MANAGER]: [
    // Documents - full access except delete on approved
    Permissions.ALL_DOCUMENTS,

    // RFIs - full access
    Permissions.ALL_RFIS,

    // Submittals - full access
    Permissions.ALL_SUBMITTALS,

    // Schedule - full access
    Permissions.ALL_SCHEDULE,

    // Daily Reports - read all, approve
    Permissions.DAILY_REPORT_READ,
    Permissions.DAILY_REPORT_APPROVE,
    Permissions.DAILY_REPORT_EXPORT,
    Permissions.WEATHER_READ,
    Permissions.LABOR_READ,
    Permissions.EQUIPMENT_READ,

    // Safety - full access
    Permissions.ALL_SAFETY,

    // Budget - read, create, update (no final approve)
    Permissions.BUDGET_ITEM_READ,
    Permissions.BUDGET_ITEM_CREATE,
    Permissions.BUDGET_ITEM_UPDATE,
    Permissions.BUDGET_ITEM_EXPORT,
    Permissions.CHANGE_ORDER_READ,
    Permissions.CHANGE_ORDER_CREATE,
    Permissions.CHANGE_ORDER_UPDATE,
    Permissions.INVOICE_READ,
    Permissions.INVOICE_CREATE,
    Permissions.INVOICE_UPDATE,
    Permissions.PAYMENT_READ,

    // Quality - full access
    Permissions.ALL_QUALITY,

    // Meetings - full access
    Permissions.ALL_MEETINGS,

    // Project Settings - read only (no permission changes)
    Permissions.SETTINGS_READ,
    Permissions.MEMBERS_READ,
    Permissions.PERMISSIONS_READ,
    Permissions.INTEGRATIONS_READ,
  ],

  /**
   * PROJECT_ENGINEER - Technical Focus
   * Technical documentation and engineering tasks
   */
  [ProjectRole.PROJECT_ENGINEER]: [
    // Documents - create, read, update, version technical docs
    Permissions.DRAWING_CREATE,
    Permissions.DRAWING_READ,
    Permissions.DRAWING_UPDATE,
    Permissions.DRAWING_EXPORT,
    Permissions.DRAWING_VERSION,
    Permissions.SPECIFICATION_CREATE,
    Permissions.SPECIFICATION_READ,
    Permissions.SPECIFICATION_UPDATE,
    Permissions.SPECIFICATION_EXPORT,
    Permissions.SPECIFICATION_VERSION,
    Permissions.MODEL_CREATE,
    Permissions.MODEL_READ,
    Permissions.MODEL_UPDATE,
    Permissions.MODEL_EXPORT,
    Permissions.MODEL_VERSION,
    Permissions.PHOTO_READ,
    Permissions.REPORT_CREATE,
    Permissions.REPORT_READ,
    Permissions.REPORT_EXPORT,

    // RFIs - create, read, update, respond (technical RFIs)
    Permissions.RFI_CREATE,
    Permissions.RFI_READ,
    Permissions.RFI_UPDATE,
    Permissions.RFI_RESPOND,

    // Submittals - create, read, review, comment
    Permissions.SUBMITTAL_CREATE,
    Permissions.SUBMITTAL_READ,
    Permissions.SUBMITTAL_REVIEW,
    Permissions.SUBMITTAL_UPDATE,

    // Schedule - read, update assigned tasks
    Permissions.ALL_SCHEDULE_READ,
    Permissions.TASK_UPDATE,
    Permissions.TASK_COMPLETE,

    // Daily Reports - read
    Permissions.DAILY_REPORT_READ,
    Permissions.WEATHER_READ,
    Permissions.LABOR_READ,
    Permissions.EQUIPMENT_READ,

    // Safety - read, create reports
    Permissions.INCIDENT_READ,
    Permissions.INCIDENT_CREATE,
    Permissions.INSPECTION_READ,
    Permissions.TOOLBOX_TALK_READ,

    // Budget - read only
    Permissions.ALL_BUDGET_READ,

    // Quality - create, read, update inspections
    Permissions.INSPECTION_CREATE,
    Permissions.INSPECTION_READ,
    Permissions.INSPECTION_UPDATE,
    Permissions.PUNCH_ITEM_READ,
    Permissions.TEST_RESULT_CREATE,
    Permissions.TEST_RESULT_READ,

    // Meetings - read, participate, create action items
    Permissions.MEETING_READ,
    Permissions.MINUTES_READ,
    Permissions.ACTION_ITEM_CREATE,
    Permissions.ACTION_ITEM_READ,
    Permissions.ACTION_ITEM_UPDATE,

    // Project Settings - read only
    Permissions.SETTINGS_READ,
  ],

  /**
   * SUPERINTENDENT - Field Operations
   * Manages day-to-day field activities
   */
  [ProjectRole.SUPERINTENDENT]: [
    // Documents - create, read photos/reports (no design docs)
    Permissions.PHOTO_CREATE,
    Permissions.PHOTO_READ,
    Permissions.PHOTO_UPDATE,
    Permissions.PHOTO_EXPORT,
    Permissions.REPORT_CREATE,
    Permissions.REPORT_READ,
    Permissions.REPORT_UPDATE,
    Permissions.REPORT_EXPORT,
    Permissions.DRAWING_READ,
    Permissions.SPECIFICATION_READ,

    // RFIs - create, read, respond (field RFIs)
    Permissions.RFI_CREATE,
    Permissions.RFI_READ,
    Permissions.RFI_UPDATE,
    Permissions.RFI_RESPOND,

    // Submittals - read
    Permissions.SUBMITTAL_READ,

    // Schedule - read, update, create tasks
    Permissions.ALL_SCHEDULE_READ,
    Permissions.TASK_CREATE,
    Permissions.TASK_UPDATE,
    Permissions.TASK_ASSIGN,
    Permissions.TASK_COMPLETE,

    // Daily Reports - create, read, update, export
    Permissions.ALL_DAILY_REPORTS,

    // Safety - full access, manage all safety items
    Permissions.ALL_SAFETY,

    // Budget - read (high-level only)
    Permissions.BUDGET_ITEM_READ,
    Permissions.CHANGE_ORDER_READ,

    // Quality - create, read, update inspections
    Permissions.INSPECTION_CREATE,
    Permissions.INSPECTION_READ,
    Permissions.INSPECTION_UPDATE,
    Permissions.PUNCH_ITEM_CREATE,
    Permissions.PUNCH_ITEM_READ,
    Permissions.PUNCH_ITEM_UPDATE,
    Permissions.TEST_RESULT_READ,

    // Meetings - create, read, update field meetings
    Permissions.MEETING_CREATE,
    Permissions.MEETING_READ,
    Permissions.MEETING_UPDATE,
    Permissions.MINUTES_CREATE,
    Permissions.MINUTES_READ,
    Permissions.MINUTES_UPDATE,
    Permissions.ACTION_ITEM_CREATE,
    Permissions.ACTION_ITEM_READ,
    Permissions.ACTION_ITEM_UPDATE,

    // Project Settings - read only
    Permissions.SETTINGS_READ,
  ],

  /**
   * FOREMAN - Work Area Limited
   * Limited to assigned scope/work area
   * All permissions are scope-filtered
   */
  [ProjectRole.FOREMAN]: [
    // Documents - create photos/notes, read assigned
    Permissions.PHOTO_CREATE,
    Permissions.PHOTO_READ,
    Permissions.PHOTO_EXPORT,
    Permissions.REPORT_CREATE,
    Permissions.REPORT_READ,
    Permissions.DRAWING_READ,
    Permissions.SPECIFICATION_READ,

    // RFIs - create, read (scope-limited)
    Permissions.RFI_CREATE,
    Permissions.RFI_READ,

    // Submittals - read (scope-limited)
    Permissions.SUBMITTAL_READ,

    // Schedule - read, update assigned tasks only
    Permissions.TASK_READ,
    Permissions.TASK_UPDATE,
    Permissions.TASK_COMPLETE,

    // Daily Reports - create, read own reports
    Permissions.DAILY_REPORT_CREATE,
    Permissions.DAILY_REPORT_READ,
    Permissions.DAILY_REPORT_UPDATE,
    Permissions.WEATHER_CREATE,
    Permissions.WEATHER_READ,
    Permissions.LABOR_CREATE,
    Permissions.LABOR_READ,
    Permissions.EQUIPMENT_CREATE,
    Permissions.EQUIPMENT_READ,

    // Safety - create reports, read, participate in toolbox talks
    Permissions.INCIDENT_CREATE,
    Permissions.INCIDENT_READ,
    Permissions.INSPECTION_READ,
    Permissions.TOOLBOX_TALK_READ,

    // Budget - no access

    // Quality - create observations, read assigned
    Permissions.PUNCH_ITEM_READ,
    Permissions.PUNCH_ITEM_UPDATE,

    // Meetings - read assigned meeting minutes
    Permissions.MINUTES_READ,
    Permissions.ACTION_ITEM_READ,

    // Project Settings - no access
  ],

  /**
   * ARCHITECT_ENGINEER - Design & Review
   * Design authority and submittal reviewer
   */
  [ProjectRole.ARCHITECT_ENGINEER]: [
    // Documents - create, read, update, approve drawings/specs
    Permissions.DRAWING_CREATE,
    Permissions.DRAWING_READ,
    Permissions.DRAWING_UPDATE,
    Permissions.DRAWING_APPROVE,
    Permissions.DRAWING_EXPORT,
    Permissions.DRAWING_VERSION,
    Permissions.SPECIFICATION_CREATE,
    Permissions.SPECIFICATION_READ,
    Permissions.SPECIFICATION_UPDATE,
    Permissions.SPECIFICATION_APPROVE,
    Permissions.SPECIFICATION_EXPORT,
    Permissions.SPECIFICATION_VERSION,
    Permissions.MODEL_CREATE,
    Permissions.MODEL_READ,
    Permissions.MODEL_UPDATE,
    Permissions.MODEL_EXPORT,
    Permissions.MODEL_VERSION,
    Permissions.PHOTO_READ,
    Permissions.REPORT_READ,

    // RFIs - read all, respond to design RFIs, create
    Permissions.RFI_CREATE,
    Permissions.RFI_READ,
    Permissions.RFI_RESPOND,
    Permissions.RFI_UPDATE,

    // Submittals - read all, review, approve/reject
    Permissions.SUBMITTAL_READ,
    Permissions.SUBMITTAL_REVIEW,
    Permissions.SUBMITTAL_APPROVE,
    Permissions.SUBMITTAL_REJECT,
    Permissions.SUBMITTAL_REQUIRE_RESUBMIT,

    // Schedule - read, comment on design milestones
    Permissions.ALL_SCHEDULE_READ,

    // Daily Reports - read (limited)
    Permissions.DAILY_REPORT_READ,

    // Safety - read only
    Permissions.INCIDENT_READ,
    Permissions.INSPECTION_READ,
    Permissions.TOOLBOX_TALK_READ,

    // Budget - no access

    // Quality - read, comment on design-related items
    Permissions.INSPECTION_READ,
    Permissions.PUNCH_ITEM_READ,
    Permissions.TEST_RESULT_READ,

    // Meetings - read, participate in design meetings
    Permissions.MEETING_READ,
    Permissions.MINUTES_READ,
    Permissions.ACTION_ITEM_CREATE,
    Permissions.ACTION_ITEM_READ,

    // Project Settings - no access
  ],

  /**
   * SUBCONTRACTOR - Trade-Specific
   * Limited to assigned trade/scope
   * All permissions are scope-filtered
   */
  [ProjectRole.SUBCONTRACTOR]: [
    // Documents - create, read (scope-limited)
    Permissions.PHOTO_CREATE,
    Permissions.PHOTO_READ,
    Permissions.DRAWING_READ,
    Permissions.SPECIFICATION_READ,
    Permissions.REPORT_CREATE,
    Permissions.REPORT_READ,

    // RFIs - create, read (scope-limited)
    Permissions.RFI_CREATE,
    Permissions.RFI_READ,

    // Submittals - create, read, update (scope-limited)
    Permissions.SUBMITTAL_CREATE,
    Permissions.SUBMITTAL_READ,
    Permissions.SUBMITTAL_UPDATE,

    // Schedule - read, update tasks (scope-limited)
    Permissions.TASK_READ,
    Permissions.TASK_UPDATE,
    Permissions.TASK_COMPLETE,

    // Daily Reports - create, read own reports
    Permissions.DAILY_REPORT_CREATE,
    Permissions.DAILY_REPORT_READ,
    Permissions.WEATHER_READ,
    Permissions.LABOR_CREATE,
    Permissions.LABOR_READ,

    // Safety - read, participate in safety programs
    Permissions.INCIDENT_READ,
    Permissions.TOOLBOX_TALK_READ,

    // Budget - read own budget items only
    Permissions.BUDGET_ITEM_READ,
    Permissions.INVOICE_CREATE,
    Permissions.INVOICE_READ,

    // Quality - read, respond to punch items (scope-limited)
    Permissions.PUNCH_ITEM_READ,
    Permissions.PUNCH_ITEM_UPDATE,
    Permissions.TEST_RESULT_READ,

    // Meetings - read assigned meeting minutes
    Permissions.MINUTES_READ,
    Permissions.ACTION_ITEM_READ,

    // Project Settings - no access
  ],

  /**
   * OWNER_REP - Owner Representative
   * Owner's eyes on the project, approval authority
   */
  [ProjectRole.OWNER_REP]: [
    // Documents - read all, approve major deliverables
    Permissions.ALL_DOCUMENT_READ,
    Permissions.DRAWING_APPROVE,
    Permissions.SPECIFICATION_APPROVE,
    Permissions.REPORT_APPROVE,

    // RFIs - read all, no response capability
    Permissions.RFI_READ,

    // Submittals - read all, approve (final authority)
    Permissions.SUBMITTAL_READ,
    Permissions.SUBMITTAL_APPROVE,
    Permissions.SUBMITTAL_REJECT,

    // Schedule - read all, approve milestones/payments
    Permissions.ALL_SCHEDULE_READ,
    Permissions.MILESTONE_APPROVE,

    // Daily Reports - read all
    Permissions.DAILY_REPORT_READ,
    Permissions.WEATHER_READ,
    Permissions.LABOR_READ,
    Permissions.EQUIPMENT_READ,

    // Safety - read all
    Permissions.INCIDENT_READ,
    Permissions.INSPECTION_READ,
    Permissions.MEETING_READ,
    Permissions.TOOLBOX_TALK_READ,

    // Budget - read all, approve payments/change orders
    Permissions.ALL_BUDGET_READ,
    Permissions.CHANGE_ORDER_APPROVE,
    Permissions.INVOICE_APPROVE,
    Permissions.PAYMENT_APPROVE,

    // Quality - read all, approve final inspections
    Permissions.INSPECTION_READ,
    Permissions.INSPECTION_APPROVE,
    Permissions.PUNCH_ITEM_READ,
    Permissions.TEST_RESULT_READ,

    // Meetings - read all, participate in owner meetings
    Permissions.MEETING_READ,
    Permissions.MINUTES_READ,
    Permissions.ACTION_ITEM_READ,

    // Project Settings - read only
    Permissions.SETTINGS_READ,
    Permissions.MEMBERS_READ,
  ],

  /**
   * INSPECTOR - Compliance & Reporting
   * Independent inspector, full quality control access
   */
  [ProjectRole.INSPECTOR]: [
    // Documents - read all compliance docs, create reports
    Permissions.DRAWING_READ,
    Permissions.SPECIFICATION_READ,
    Permissions.PHOTO_READ,
    Permissions.PHOTO_CREATE,
    Permissions.REPORT_CREATE,
    Permissions.REPORT_READ,
    Permissions.REPORT_EXPORT,

    // RFIs - read (no create/respond)
    Permissions.RFI_READ,

    // Submittals - read all
    Permissions.SUBMITTAL_READ,

    // Schedule - read only
    Permissions.ALL_SCHEDULE_READ,

    // Daily Reports - read all, create inspection reports
    Permissions.DAILY_REPORT_READ,
    Permissions.DAILY_REPORT_CREATE,
    Permissions.WEATHER_READ,

    // Safety - read all, create compliance reports
    Permissions.INCIDENT_READ,
    Permissions.INCIDENT_CREATE,
    Permissions.INSPECTION_CREATE,
    Permissions.INSPECTION_READ,
    Permissions.MEETING_READ,
    Permissions.TOOLBOX_TALK_READ,

    // Budget - no access

    // Quality - create, read, update inspections (full access)
    Permissions.ALL_QUALITY,

    // Meetings - read meeting minutes
    Permissions.MEETING_READ,
    Permissions.MINUTES_READ,

    // Project Settings - no access
  ],

  /**
   * VIEWER - Read-Only Observer
   * Minimal read-only access to assigned items
   */
  [ProjectRole.VIEWER]: [
    // Documents - read assigned documents only
    Permissions.DRAWING_READ,
    Permissions.SPECIFICATION_READ,
    Permissions.PHOTO_READ,
    Permissions.REPORT_READ,

    // RFIs - read assigned RFIs
    Permissions.RFI_READ,

    // Submittals - read assigned submittals
    Permissions.SUBMITTAL_READ,

    // Schedule - read overall schedule (no details)
    Permissions.TASK_READ,
    Permissions.MILESTONE_READ,

    // Daily Reports - read assigned reports
    Permissions.DAILY_REPORT_READ,

    // Safety - read safety summary (no incident details)
    Permissions.TOOLBOX_TALK_READ,

    // Budget - no access

    // Quality - read assigned items
    Permissions.PUNCH_ITEM_READ,

    // Meetings - read assigned meeting minutes
    Permissions.MINUTES_READ,

    // Project Settings - no access
  ],
};

/**
 * Organization Role Permission Matrix
 *
 * Defines which organization roles automatically get which project permissions
 */
export const ORGANIZATION_ROLE_INHERITANCE: Record<
  OrganizationRole,
  ProjectRole | null
> = {
  [OrganizationRole.OWNER]: ProjectRole.PROJECT_ADMIN, // Auto PROJECT_ADMIN
  [OrganizationRole.ORG_ADMIN]: ProjectRole.PROJECT_ADMIN, // Auto PROJECT_ADMIN
  [OrganizationRole.ORG_MEMBER]: null, // No automatic access
  [OrganizationRole.GUEST]: null, // No automatic access
};

/**
 * Roles that have scope-based filtering
 */
export const SCOPE_LIMITED_ROLES: ProjectRole[] = [
  ProjectRole.FOREMAN,
  ProjectRole.SUBCONTRACTOR,
];

/**
 * Check if a role has scope limitations
 */
export function isScopeLimitedRole(role: ProjectRole): boolean {
  return SCOPE_LIMITED_ROLES.includes(role);
}

/**
 * Get permissions for a role
 */
export function getRolePermissions(role: ProjectRole): string[] {
  return PROJECT_ROLE_PERMISSIONS[role] || [];
}

/**
 * Get inherited project role from organization role
 */
export function getInheritedProjectRole(
  orgRole: OrganizationRole,
): ProjectRole | null {
  return ORGANIZATION_ROLE_INHERITANCE[orgRole];
}

/**
 * Check if organization role has automatic project access
 */
export function hasAutomaticProjectAccess(
  orgRole: OrganizationRole,
): boolean {
  return ORGANIZATION_ROLE_INHERITANCE[orgRole] !== null;
}
