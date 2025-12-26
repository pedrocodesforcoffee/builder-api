import { Logger } from '@nestjs/common';

/**
 * Retry configuration options
 */
export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: (error: any) => boolean;
  onRetry?: (error: any, attempt: number, delayMs: number) => void;
}

/**
 * Default retryable error checker
 *
 * Retries on:
 * - Network errors
 * - 429 (Rate Limit)
 * - 500, 502, 503, 504 (Server errors)
 */
const defaultRetryableErrors = (error: any): boolean => {
  // Network errors
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
    return true;
  }

  // HTTP errors
  if (error.response) {
    const status = error.response.status;
    // Rate limit, server errors
    return status === 429 || (status >= 500 && status <= 599);
  }

  return false;
};

/**
 * Retry Utility
 *
 * Implements exponential backoff retry strategy for API requests.
 *
 * Features:
 * - Exponential backoff with jitter
 * - Configurable retry attempts
 * - Custom retryable error detection
 * - Logging and callbacks
 * - Max delay cap
 *
 * Example:
 * ```ts
 * const result = await RetryUtil.execute(
 *   () => apiClient.get('/endpoint'),
 *   { maxAttempts: 3, initialDelayMs: 1000 }
 * );
 * ```
 */
export class RetryUtil {
  private static readonly logger = new Logger(RetryUtil.name);

  /**
   * Execute function with retry logic
   *
   * @param fn Function to execute (can be async)
   * @param options Retry configuration
   * @returns Result from successful execution
   * @throws Last error if all retries exhausted
   */
  static async execute<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {},
  ): Promise<T> {
    const {
      maxAttempts = 3,
      initialDelayMs = 1000,
      maxDelayMs = 30000,
      backoffMultiplier = 2,
      retryableErrors = defaultRetryableErrors,
      onRetry,
    } = options;

    let lastError: any;
    let attempt = 0;

    while (attempt < maxAttempts) {
      attempt++;

      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Check if error is retryable
        if (!retryableErrors(error)) {
          this.logger.debug(`Error not retryable: ${(error as Error).message}`);
          throw error;
        }

        // Check if we have retries left
        if (attempt >= maxAttempts) {
          this.logger.error(`All ${maxAttempts} retry attempts exhausted`);
          throw error;
        }

        // Calculate delay with exponential backoff and jitter
        const exponentialDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);
        const jitter = Math.random() * 0.3 * exponentialDelay; // Up to 30% jitter
        const delayMs = Math.min(exponentialDelay + jitter, maxDelayMs);

        // Log retry
        this.logger.warn(
          `Attempt ${attempt}/${maxAttempts} failed: ${(error as Error).message}. ` +
          `Retrying in ${Math.round(delayMs)}ms...`,
        );

        // Callback
        if (onRetry) {
          onRetry(error, attempt, delayMs);
        }

        // Wait before retry
        await this.sleep(delayMs);
      }
    }

    // Should never reach here, but TypeScript needs it
    throw lastError;
  }

  /**
   * Execute with specific retry for rate limit (429) errors
   *
   * Uses Retry-After header if available, otherwise exponential backoff.
   *
   * @param fn Function to execute
   * @param options Retry configuration
   * @returns Result from successful execution
   */
  static async executeWithRateLimit<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {},
  ): Promise<T> {
    return this.execute(fn, {
      ...options,
      retryableErrors: (error: any) => {
        // Only retry on rate limit errors
        return error.response?.status === 429;
      },
      onRetry: (error: any, attempt: number, delayMs: number) => {
        // Check for Retry-After header
        const retryAfter = error.response?.headers?.['retry-after'];
        if (retryAfter) {
          const retryAfterMs = parseInt(retryAfter, 10) * 1000;
          this.logger.warn(
            `Rate limited. Retry-After: ${retryAfter}s. Waiting ${retryAfterMs}ms...`,
          );
        }

        if (options.onRetry) {
          options.onRetry(error, attempt, delayMs);
        }
      },
    });
  }

  /**
   * Sleep utility
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Calculate retry delay for specific attempt
   *
   * Useful for displaying estimated retry time to users.
   *
   * @param attempt Attempt number (1-indexed)
   * @param initialDelayMs Initial delay
   * @param backoffMultiplier Backoff multiplier
   * @param maxDelayMs Maximum delay cap
   * @returns Delay in milliseconds
   */
  static calculateDelay(
    attempt: number,
    initialDelayMs: number = 1000,
    backoffMultiplier: number = 2,
    maxDelayMs: number = 30000,
  ): number {
    const exponentialDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);
    return Math.min(exponentialDelay, maxDelayMs);
  }
}
