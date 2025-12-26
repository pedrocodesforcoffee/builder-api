/**
 * Scope Configuration Constants
 *
 * Defines which roles are subject to scope restrictions and standard scope options
 */

import { ProjectRole } from '../../users/enums/project-role.enum';
import { ScopeOption } from '../types/scope.types';

/**
 * Roles that MUST have scope assigned
 */
export const SCOPE_REQUIRED_ROLES: ProjectRole[] = [
  ProjectRole.FOREMAN,
  ProjectRole.SUBCONTRACTOR,
];

/**
 * Roles that CAN optionally have scope assigned
 */
export const SCOPE_OPTIONAL_ROLES: ProjectRole[] = [
  ProjectRole.VIEWER,
  ProjectRole.PROJECT_ENGINEER,
  ProjectRole.INSPECTOR,
];

/**
 * Roles that are subject to scope limitations
 */
export const SCOPE_LIMITED_ROLES: ProjectRole[] = [
  ...SCOPE_REQUIRED_ROLES,
  ...SCOPE_OPTIONAL_ROLES,
];

/**
 * Roles that CANNOT have scope (always full access)
 */
export const SCOPE_EXEMPT_ROLES: ProjectRole[] = [
  ProjectRole.PROJECT_ADMIN,
  ProjectRole.PROJECT_MANAGER,
  ProjectRole.SUPERINTENDENT,
  ProjectRole.ARCHITECT_ENGINEER,
  ProjectRole.OWNER_REP,
];

/**
 * Check if a role can have scope assigned
 */
export function canRoleHaveScope(role: ProjectRole): boolean {
  return [...SCOPE_REQUIRED_ROLES, ...SCOPE_OPTIONAL_ROLES].includes(role);
}

/**
 * Check if a role requires scope
 */
export function doesRoleRequireScope(role: ProjectRole): boolean {
  return SCOPE_REQUIRED_ROLES.includes(role);
}

/**
 * Check if a role is scope-limited
 */
export function isRoleScopeLimited(role: ProjectRole | null): boolean {
  if (!role) {
    return false;
  }
  return SCOPE_LIMITED_ROLES.includes(role);
}

/**
 * Scope validation rules
 */
export interface ScopeValidationRules {
  maxTrades: number;
  maxAreas: number;
  maxPhases: number;
  maxTags: number;
}

export const DEFAULT_SCOPE_VALIDATION_RULES: ScopeValidationRules = {
  maxTrades: 10,
  maxAreas: 20,
  maxPhases: 5,
  maxTags: 15,
};

/**
 * Standard trade options (following CSI MasterFormat divisions)
 */
export const STANDARD_TRADES: Omit<ScopeOption, 'usageCount'>[] = [
  // Division 03 - Concrete
  {
    value: 'concrete',
    label: 'Concrete',
    category: 'Structure',
    description: 'Concrete formwork, reinforcement, and placement',
  },

  // Division 04 - Masonry
  {
    value: 'masonry',
    label: 'Masonry',
    category: 'Structure',
    description: 'Brick, block, and stone masonry',
  },

  // Division 05 - Metals
  {
    value: 'steel',
    label: 'Structural Steel',
    category: 'Structure',
    description: 'Structural steel erection and welding',
  },
  {
    value: 'metal-framing',
    label: 'Metal Framing',
    category: 'Structure',
    description: 'Metal studs and light gauge framing',
  },

  // Division 06 - Wood & Plastics
  {
    value: 'framing',
    label: 'Framing',
    category: 'Structure',
    description: 'Wood framing and rough carpentry',
  },
  {
    value: 'finish-carpentry',
    label: 'Finish Carpentry',
    category: 'Finishes',
    description: 'Trim, casework, and millwork',
  },

  // Division 07 - Thermal & Moisture Protection
  {
    value: 'roofing',
    label: 'Roofing',
    category: 'Envelope',
    description: 'Roof systems and waterproofing',
  },
  {
    value: 'insulation',
    label: 'Insulation',
    category: 'Envelope',
    description: 'Thermal and acoustic insulation',
  },
  {
    value: 'waterproofing',
    label: 'Waterproofing',
    category: 'Envelope',
    description: 'Foundation and below-grade waterproofing',
  },

  // Division 08 - Openings
  {
    value: 'windows',
    label: 'Windows & Glazing',
    category: 'Envelope',
    description: 'Windows, curtain walls, and glass',
  },
  {
    value: 'doors',
    label: 'Doors & Hardware',
    category: 'Envelope',
    description: 'Doors, frames, and hardware',
  },

  // Division 09 - Finishes
  {
    value: 'drywall',
    label: 'Drywall',
    category: 'Finishes',
    description: 'Gypsum board installation and finishing',
  },
  {
    value: 'painting',
    label: 'Painting',
    category: 'Finishes',
    description: 'Interior and exterior painting',
  },
  {
    value: 'flooring',
    label: 'Flooring',
    category: 'Finishes',
    description: 'Tile, carpet, and resilient flooring',
  },
  {
    value: 'ceilings',
    label: 'Ceilings',
    category: 'Finishes',
    description: 'Suspended ceilings and acoustic tiles',
  },

  // Division 21 - Fire Suppression
  {
    value: 'fire-protection',
    label: 'Fire Protection',
    category: 'MEP',
    description: 'Fire sprinkler systems',
  },

  // Division 22 - Plumbing
  {
    value: 'plumbing',
    label: 'Plumbing',
    category: 'MEP',
    description: 'Water supply, drainage, and fixtures',
  },

  // Division 23 - HVAC
  {
    value: 'hvac',
    label: 'HVAC',
    category: 'MEP',
    description: 'Heating, ventilation, and air conditioning',
  },

  // Division 26 - Electrical
  {
    value: 'electrical',
    label: 'Electrical',
    category: 'MEP',
    description: 'Power distribution and branch wiring',
  },
  {
    value: 'lighting',
    label: 'Lighting',
    category: 'MEP',
    description: 'Interior and exterior lighting',
  },
  {
    value: 'fire-alarm',
    label: 'Fire Alarm',
    category: 'MEP',
    description: 'Fire alarm and life safety systems',
  },

  // Division 27 - Communications
  {
    value: 'low-voltage',
    label: 'Low Voltage',
    category: 'MEP',
    description: 'Data, communications, and security systems',
  },

  // Division 31 - Earthwork
  {
    value: 'sitework',
    label: 'Sitework',
    category: 'Site',
    description: 'Excavation, grading, and utilities',
  },

  // Division 32 - Exterior Improvements
  {
    value: 'paving',
    label: 'Paving',
    category: 'Site',
    description: 'Asphalt and concrete paving',
  },
  {
    value: 'landscaping',
    label: 'Landscaping',
    category: 'Site',
    description: 'Plants, irrigation, and site amenities',
  },
];

/**
 * Standard phase options
 */
export const STANDARD_PHASES: Omit<ScopeOption, 'usageCount'>[] = [
  {
    value: 'preconstruction',
    label: 'Preconstruction',
    description: 'Planning, permits, and mobilization',
  },
  {
    value: 'demo',
    label: 'Demolition',
    description: 'Selective demolition and abatement',
  },
  {
    value: 'foundation',
    label: 'Foundation',
    description: 'Excavation, footings, and foundation walls',
  },
  {
    value: 'structure',
    label: 'Structure',
    description: 'Structural framing and deck',
  },
  {
    value: 'rough-in',
    label: 'Rough-In',
    description: 'MEP rough-in and framing',
  },
  {
    value: 'envelope',
    label: 'Envelope',
    description: 'Exterior closure and weatherproofing',
  },
  {
    value: 'interior',
    label: 'Interior',
    description: 'Interior partitions and finishes',
  },
  {
    value: 'trim-out',
    label: 'Trim-Out',
    description: 'MEP trim, fixtures, and final finishes',
  },
  {
    value: 'punchlist',
    label: 'Punchlist',
    description: 'Final inspections and corrections',
  },
  {
    value: 'closeout',
    label: 'Closeout',
    description: 'Commissioning, training, and handover',
  },
];

/**
 * Default resource visibility by resource type
 */
export const DEFAULT_RESOURCE_VISIBILITY: Record<
  string,
  'public' | 'tagged-only'
> = {
  // Public by default (everyone can see if untagged)
  'daily-report': 'public',
  'meeting-minutes': 'public',
  'safety-report': 'public',
  'photo': 'public',

  // Tagged-only by default (must be explicitly scoped)
  document: 'tagged-only',
  drawing: 'tagged-only',
  rfi: 'tagged-only',
  submittal: 'tagged-only',
  task: 'tagged-only',
  inspection: 'tagged-only',
};

/**
 * Get default visibility for a resource type
 */
export function getDefaultVisibility(
  resourceType: string,
): 'public' | 'tagged-only' {
  return DEFAULT_RESOURCE_VISIBILITY[resourceType] || 'tagged-only';
}
