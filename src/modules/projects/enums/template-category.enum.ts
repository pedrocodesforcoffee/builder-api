/**
 * Template Category Enum
 *
 * Defines the primary categories for project templates.
 * Aligns with ProjectType but used for template organization.
 */
export enum TemplateCategory {
  /**
   * Commercial construction templates
   * Examples: Office buildings, retail centers, hotels
   */
  COMMERCIAL = 'COMMERCIAL',

  /**
   * Residential construction templates
   * Examples: Single-family homes, apartments, condominiums
   */
  RESIDENTIAL = 'RESIDENTIAL',

  /**
   * Infrastructure templates
   * Examples: Roads, bridges, utilities
   */
  INFRASTRUCTURE = 'INFRASTRUCTURE',

  /**
   * Industrial facility templates
   * Examples: Manufacturing plants, warehouses
   */
  INDUSTRIAL = 'INDUSTRIAL',

  /**
   * Healthcare facility templates
   * Examples: Hospitals, clinics, medical offices
   */
  HEALTHCARE = 'HEALTHCARE',
}
