/**
 * Project Type Enum
 *
 * Defines the primary type/category of construction project.
 * This helps classify projects and apply type-specific workflows or settings.
 */
export enum ProjectType {
  /**
   * Commercial construction projects
   * Examples: Office buildings, retail centers, hotels, restaurants
   */
  COMMERCIAL = 'commercial',

  /**
   * Residential construction projects
   * Examples: Single-family homes, apartments, condominiums
   */
  RESIDENTIAL = 'residential',

  /**
   * Infrastructure projects
   * Examples: Roads, bridges, utilities, public works
   */
  INFRASTRUCTURE = 'infrastructure',

  /**
   * Industrial facilities
   * Examples: Manufacturing plants, warehouses, distribution centers
   */
  INDUSTRIAL = 'industrial',

  /**
   * Healthcare facilities
   * Examples: Hospitals, clinics, medical offices
   */
  HEALTHCARE = 'healthcare',
}
