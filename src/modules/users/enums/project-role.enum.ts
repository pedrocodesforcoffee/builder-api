/**
 * Project Role Enum
 *
 * Defines access levels within a project.
 * These roles are specific to construction project management and follow
 * industry-standard roles similar to ProCore.
 *
 * Hierarchy (highest to lowest administrative access):
 * 1. PROJECT_ADMIN - Full project control
 * 2. PROJECT_MANAGER - Project management and coordination
 * 3. PROJECT_ENGINEER - Technical oversight
 * 4. SUPERINTENDENT - Field supervision
 * 5. FOREMAN - On-site crew management
 * 6. ARCHITECT_ENGINEER - Design and engineering
 * 7. SUBCONTRACTOR - Trade-specific work
 * 8. OWNER_REP - Owner's representative
 * 9. INSPECTOR - Quality and compliance inspection
 * 10. VIEWER - Read-only access
 *
 * @enum ProjectRole
 */
export enum ProjectRole {
  /**
   * Project Administrator
   * - Full access to all project features and data
   * - Can manage project settings and permissions
   * - Can add/remove project members
   * - Can archive/delete the project
   */
  PROJECT_ADMIN = 'project_admin',

  /**
   * Project Manager
   * - Oversees entire project execution
   * - Can manage schedules, budgets, and resources
   * - Can approve submittals and RFIs
   * - Can create and assign tasks
   * - Cannot modify project settings or permissions
   */
  PROJECT_MANAGER = 'project_manager',

  /**
   * Project Engineer
   * - Technical oversight and coordination
   * - Can manage drawings and specifications
   * - Can review and approve technical submittals
   * - Can create RFIs and change orders
   * - Can manage quality control documentation
   */
  PROJECT_ENGINEER = 'project_engineer',

  /**
   * Superintendent
   * - On-site construction supervision
   * - Can manage daily reports and field observations
   * - Can coordinate subcontractors
   * - Can update construction progress
   * - Can manage safety documentation
   */
  SUPERINTENDENT = 'superintendent',

  /**
   * Foreman
   * - Leads specific work crews
   * - Can update task progress
   * - Can submit daily work logs
   * - Can report material usage
   * - Limited to assigned work areas
   */
  FOREMAN = 'foreman',

  /**
   * Architect/Engineer
   * - Design and engineering consultant
   * - Can view and markup drawings
   * - Can respond to RFIs
   * - Can review submittals
   * - Read-only access to most other areas
   */
  ARCHITECT_ENGINEER = 'architect_engineer',

  /**
   * Subcontractor
   * - Trade-specific contractor
   * - Can view relevant drawings and specifications
   * - Can submit progress updates
   * - Can upload work documentation
   * - Limited to assigned scope of work
   */
  SUBCONTRACTOR = 'subcontractor',

  /**
   * Owner's Representative
   * - Represents the project owner
   * - Can view all project data
   * - Can comment and request changes
   * - Can approve major milestones
   * - Cannot modify construction data
   */
  OWNER_REP = 'owner_rep',

  /**
   * Inspector
   * - Quality assurance and compliance
   * - Can create inspection reports
   * - Can flag non-compliance issues
   * - Read-only access to most data
   * - Can upload inspection documentation
   */
  INSPECTOR = 'inspector',

  /**
   * Viewer
   * - Read-only access
   * - Can view project data assigned to them
   * - Cannot create, edit, or delete anything
   * - Useful for stakeholders who need visibility only
   */
  VIEWER = 'viewer',
}
