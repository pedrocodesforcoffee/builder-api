/**
 * ValidationResult Interface
 *
 * Result of validation checks for metric calculations
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;

  /** Validation errors that prevent calculation */
  errors: ValidationError[];

  /** Validation warnings that don't prevent calculation */
  warnings: ValidationWarning[];

  /** Additional validation metadata */
  metadata?: {
    checkedAt: Date;
    checksPerformed: string[];
    dataAvailability: Record<string, boolean>;
    [key: string]: any;
  };
}

/**
 * Validation error that prevents metric calculation
 */
export interface ValidationError {
  /** Error code for programmatic handling */
  code: string;

  /** Human-readable error message */
  message: string;

  /** Field or metric that failed validation */
  field?: string;

  /** Additional error details */
  details?: Record<string, any>;
}

/**
 * Validation warning that doesn't prevent calculation
 */
export interface ValidationWarning {
  /** Warning code for programmatic handling */
  code: string;

  /** Human-readable warning message */
  message: string;

  /** Field or metric with warning */
  field?: string;

  /** Suggested action to resolve warning */
  suggestion?: string;

  /** Additional warning details */
  details?: Record<string, any>;
}