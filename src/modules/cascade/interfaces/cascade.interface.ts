/**
 * Cascade Operations Interfaces
 *
 * Defines types for cascading deletion and restoration operations
 */

/**
 * User deletion result
 */
export interface UserDeletionResult {
  userId: string;
  organizationMembershipsRemoved: number;
  projectMembershipsRemoved: number;
  resourcesReassigned: number;
  resourcesPreserved: number;
  errors: string[];
}

/**
 * Organization deletion result
 */
export interface OrganizationDeletionResult {
  organizationId: string;
  projectsDeleted: number;
  membersRemoved: number;
  errors: string[];
}

/**
 * Project deletion result
 */
export interface ProjectDeletionResult {
  projectId: string;
  membersRemoved: number;
  resourcesDeleted: {
    documents: number;
    rfis: number;
    submittals: number;
    // Add more as needed
  };
  errors: string[];
}

/**
 * Deletion options
 */
export interface DeletionOptions {
  deletedBy: string;
  reason?: string;
  softDelete?: boolean;
}

/**
 * Organization deletion options (extends base)
 */
export interface OrganizationDeletionOptions extends DeletionOptions {
  // Organization-specific options can be added here
}

/**
 * Project deletion options (extends base)
 */
export interface ProjectDeletionOptions extends DeletionOptions {
  cascadedFrom?: 'organization' | 'user';
}

/**
 * Restoration options
 */
export interface RestorationOptions {
  restoredBy: string;
  reason?: string;
}
