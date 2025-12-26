/**
 * DTO for organization response
 * Returned from all organization endpoints
 */
export class OrganizationResponseDto {
  id!: string;
  name!: string;
  slug!: string;
  type?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  taxId?: string;
  isActive!: boolean;
  settings?: Record<string, any>;
  createdAt!: Date;
  updatedAt!: Date;

  /**
   * Optional: Include member count if requested
   */
  memberCount?: number;

  /**
   * Optional: Include project count if requested
   */
  projectCount?: number;
}
