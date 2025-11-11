import { IsString, IsNotEmpty, IsOptional, MaxLength, Matches } from 'class-validator';

/**
 * DTO for creating a new organization
 */
export class CreateOrganizationDto {
  /**
   * Organization name
   * @example "Acme Construction Company"
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  /**
   * URL-friendly slug (optional, auto-generated from name if not provided)
   * Must be lowercase, alphanumeric with hyphens
   * @example "acme-construction"
   */
  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens only',
  })
  slug?: string;

  /**
   * Organization type (e.g., "General Contractor", "Subcontractor", "Owner")
   * @example "General Contractor"
   */
  @IsString()
  @IsOptional()
  @MaxLength(100)
  type?: string;

  /**
   * Organization email
   * @example "info@acmeconstruction.com"
   */
  @IsString()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  /**
   * Organization phone number
   * @example "+1-555-123-4567"
   */
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  /**
   * Organization physical address
   * @example "123 Main St, New York, NY 10001"
   */
  @IsString()
  @IsOptional()
  address?: string;

  /**
   * Organization website URL
   * @example "https://www.acmeconstruction.com"
   */
  @IsString()
  @IsOptional()
  @MaxLength(255)
  website?: string;

  /**
   * Tax ID or EIN
   * @example "12-3456789"
   */
  @IsString()
  @IsOptional()
  @MaxLength(50)
  taxId?: string;

  /**
   * Additional settings (stored as JSONB)
   * Can include custom fields, preferences, etc.
   */
  @IsOptional()
  settings?: Record<string, any>;
}
