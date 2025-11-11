import { ProjectStatus } from '../enums/project-status.enum';
import { ProjectType } from '../enums/project-type.enum';
import { DeliveryMethod } from '../enums/delivery-method.enum';

/**
 * Project Response DTO
 *
 * Defines the structure of project data returned by the API.
 * Used to ensure consistent response format across all endpoints.
 * Mirrors the comprehensive Project entity structure.
 *
 * @dto ProjectResponseDto
 */
export class ProjectResponseDto {
  // ==================== CORE FIELDS ====================

  id!: string;
  organizationId!: string;
  name!: string;
  number!: string;
  description?: string;

  // ==================== LOCATION DETAILS ====================

  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  latitude?: number;
  longitude?: number;

  // ==================== CONSTRUCTION-SPECIFIC FIELDS ====================

  type!: ProjectType;
  deliveryMethod?: DeliveryMethod;
  contractType?: string;
  squareFootage?: number;

  // ==================== SCHEDULE MANAGEMENT ====================

  startDate?: Date;
  endDate?: Date;
  substantialCompletion?: Date;
  finalCompletion?: Date;

  // ==================== FINANCIAL TRACKING ====================

  originalContract?: number;
  currentContract?: number;
  percentComplete?: number;

  // ==================== PROJECT SETTINGS ====================

  timezone?: string;
  workingDays?: number[];
  holidays?: string[];

  // ==================== METADATA & FLEXIBILITY ====================

  customFields?: Record<string, any>;
  tags?: string[];
  status!: ProjectStatus;

  // ==================== COMPUTED/OPTIONAL FIELDS ====================

  memberCount?: number;
  organizationName?: string;

  // ==================== AUDIT FIELDS ====================

  createdAt!: Date;
  updatedAt!: Date;
  createdBy?: string;
  updatedBy?: string;
}
