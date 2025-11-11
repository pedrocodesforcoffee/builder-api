import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsDateString,
  MaxLength,
  Matches,
  IsObject,
  IsNumber,
  Min,
  Max,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsInt,
  IsDecimal,
  ValidateNested,
  IsLatitude,
  IsLongitude,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectType } from '../enums/project-type.enum';
import { DeliveryMethod } from '../enums/delivery-method.enum';
import { ProjectStatus } from '../enums/project-status.enum';

/**
 * Create Project DTO
 *
 * Comprehensive validation for creating a new construction project.
 * Supports all ProCore-style fields including location, financials,
 * construction specifics, and flexible metadata.
 *
 * @dto CreateProjectDto
 */
export class CreateProjectDto {
  // ==================== CORE FIELDS ====================

  /**
   * Project number
   * Unique identifier within the organization (e.g., "2024-001", "NYC-TOWER-2024")
   *
   * If not provided, will be auto-generated
   *
   * @optional
   * @maxLength 50
   * @example "2024-001"
   */
  @IsString()
  @IsOptional()
  @MaxLength(50)
  number?: string;

  /**
   * Project name
   * Display name shown in the UI
   *
   * @required
   * @maxLength 255
   * @example "Downtown Office Complex"
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  /**
   * Organization ID
   * The organization that owns this project
   *
   * @required
   * @format uuid
   */
  @IsUUID()
  @IsNotEmpty()
  organizationId!: string;

  // ==================== LOCATION DETAILS ====================

  /**
   * Street address
   *
   * @optional
   * @maxLength 255
   * @example "123 Main Street"
   */
  @IsString()
  @IsOptional()
  @MaxLength(255)
  address?: string;

  /**
   * City
   *
   * @optional
   * @maxLength 100
   * @example "San Francisco"
   */
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  /**
   * State/Province
   *
   * @optional
   * @maxLength 50
   * @example "CA"
   */
  @IsString()
  @IsOptional()
  @MaxLength(50)
  state?: string;

  /**
   * ZIP/Postal code
   *
   * @optional
   * @maxLength 20
   * @example "94102"
   */
  @IsString()
  @IsOptional()
  @MaxLength(20)
  zip?: string;

  /**
   * Country
   *
   * @optional
   * @maxLength 100
   * @default "USA"
   * @example "USA"
   */
  @IsString()
  @IsOptional()
  @MaxLength(100)
  country?: string;

  /**
   * Latitude for geolocation
   * Range: -90 to 90
   *
   * @optional
   * @example 37.7749
   */
  @IsLatitude()
  @IsOptional()
  latitude?: number;

  /**
   * Longitude for geolocation
   * Range: -180 to 180
   *
   * @optional
   * @example -122.4194
   */
  @IsLongitude()
  @IsOptional()
  longitude?: number;

  // ==================== CONSTRUCTION-SPECIFIC FIELDS ====================

  /**
   * Project type
   * Categorizes the construction project
   *
   * @required
   * @enum ProjectType
   * @example "commercial"
   */
  @IsEnum(ProjectType, {
    message: 'Type must be one of: commercial, residential, infrastructure, industrial, healthcare',
  })
  @IsNotEmpty()
  type!: ProjectType;

  /**
   * Delivery method
   * How the project is being procured and delivered
   *
   * @optional
   * @enum DeliveryMethod
   * @example "design_build"
   */
  @IsEnum(DeliveryMethod, {
    message: 'Delivery method must be one of: design_bid_build, design_build, cm_at_risk, ipd',
  })
  @IsOptional()
  deliveryMethod?: DeliveryMethod;

  /**
   * Contract type
   * E.g., "Lump Sum", "Cost Plus", "GMP" (Guaranteed Maximum Price)
   *
   * @optional
   * @maxLength 100
   * @example "Lump Sum"
   */
  @IsString()
  @IsOptional()
  @MaxLength(100)
  contractType?: string;

  /**
   * Square footage
   * Total building area in square feet
   *
   * @optional
   * @min 1
   * @example 125000
   */
  @IsInt()
  @Min(1, { message: 'Square footage must be positive' })
  @IsOptional()
  squareFootage?: number;

  // ==================== SCHEDULE MANAGEMENT ====================

  /**
   * Project start date
   *
   * @optional
   * @format date
   * @example "2024-03-01"
   */
  @IsDateString()
  @IsOptional()
  startDate?: string;

  /**
   * Project end date (planned)
   *
   * @optional
   * @format date
   * @example "2025-09-30"
   */
  @IsDateString()
  @IsOptional()
  endDate?: string;

  /**
   * Substantial completion date
   * When work is sufficiently complete for intended use
   *
   * @optional
   * @format date
   * @example "2025-08-15"
   */
  @IsDateString()
  @IsOptional()
  substantialCompletion?: string;

  /**
   * Final completion date
   * When all punchlist items and closeout are complete
   *
   * @optional
   * @format date
   * @example "2025-09-30"
   */
  @IsDateString()
  @IsOptional()
  finalCompletion?: string;

  // ==================== FINANCIAL TRACKING ====================

  /**
   * Original contract amount
   * Initial contract value before any change orders
   *
   * @optional
   * @min 0
   * @example 15000000.00
   */
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Original contract must be non-negative' })
  @IsOptional()
  originalContract?: number;

  /**
   * Current contract amount
   * Contract value including approved change orders
   *
   * @optional
   * @min 0
   * @example 15000000.00
   */
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Current contract must be non-negative' })
  @IsOptional()
  currentContract?: number;

  /**
   * Percent complete
   * Overall project completion percentage (0-100)
   *
   * @optional
   * @min 0
   * @max 100
   * @default 0
   * @example 0
   */
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Percent complete must be at least 0' })
  @Max(100, { message: 'Percent complete cannot exceed 100' })
  @IsOptional()
  percentComplete?: number;

  // ==================== PROJECT SETTINGS ====================

  /**
   * Project timezone
   * E.g., "America/New_York", "America/Los_Angeles"
   *
   * @optional
   * @maxLength 50
   * @default "America/New_York"
   * @example "America/Los_Angeles"
   */
  @IsString()
  @IsOptional()
  @MaxLength(50)
  timezone?: string;

  /**
   * Working days
   * Array of day numbers (0=Sunday, 1=Monday, ..., 6=Saturday)
   * E.g., [1,2,3,4,5] for Monday-Friday
   *
   * @optional
   * @default [1,2,3,4,5]
   * @example [1,2,3,4,5]
   */
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsOptional()
  workingDays?: number[];

  /**
   * Holidays
   * Array of holiday dates (YYYY-MM-DD format)
   *
   * @optional
   * @default []
   * @example ["2024-07-04", "2024-12-25"]
   */
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  holidays?: string[];

  // ==================== METADATA & FLEXIBILITY ====================

  /**
   * Custom fields
   * Extensible JSON storage for project-specific data
   *
   * @optional
   * @example { "client": "Acme Corporation", "architect": "Design Partners LLC" }
   */
  @IsObject()
  @IsOptional()
  customFields?: Record<string, any>;

  /**
   * Tags
   * Array of tag strings for categorization/filtering
   *
   * @optional
   * @example ["high-rise", "leed-certified"]
   */
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  @IsOptional()
  tags?: string[];

  /**
   * Project status
   * Tracks the current lifecycle stage
   *
   * @optional
   * @enum ProjectStatus
   * @default "bidding"
   * @example "awarded"
   */
  @IsEnum(ProjectStatus, {
    message:
      'Status must be one of: bidding, awarded, preconstruction, construction, closeout, warranty, complete',
  })
  @IsOptional()
  status?: ProjectStatus;

  /**
   * Project description
   * Detailed information about the project
   *
   * @optional
   * @example "Construction of a 20-story mixed-use office building"
   */
  @IsString()
  @IsOptional()
  description?: string;
}
