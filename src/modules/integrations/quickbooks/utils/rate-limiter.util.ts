import { Injectable, Logger } from '@nestjs/common';

/**
 * Token bucket for a single time window
 */
interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

/**
 * Rate Limiter Utility
 *
 * Implements token bucket algorithm for rate limiting API requests.
 * Respects QuickBooks API limits: 450 req/min (with buffer).
 *
 * Features:
 * - Token bucket algorithm
 * - Automatic token refill
 * - Configurable limits
 * - Per-organization tracking
 * - Non-blocking (throws if limit exceeded)
 */
@Injectable()
export class RateLimiterUtil {
  private readonly logger = new Logger(RateLimiterUtil.name);
  private readonly buckets: Map<string, TokenBucket> = new Map();
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per millisecond
  private readonly windowMs: number;

  constructor(
    maxRequests: number = 450,
    windowMs: number = 60000, // 1 minute
  ) {
    this.maxTokens = maxRequests;
    this.windowMs = windowMs;
    this.refillRate = maxRequests / windowMs; // e.g., 450/60000 = 0.0075 tokens/ms
  }

  /**
   * Acquire a token for a request
   *
   * @param key Identifier (e.g., organizationId)
   * @param cost Number of tokens to consume (default: 1)
   * @returns True if token acquired, false if rate limit exceeded
   */
  async tryAcquire(key: string, cost: number = 1): Promise<boolean> {
    const bucket = this.getBucket(key);

    // Refill tokens based on time elapsed
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = elapsed * this.refillRate;

    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Check if enough tokens available
    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      return true;
    }

    return false;
  }

  /**
   * Acquire a token or wait until available
   *
   * @param key Identifier
   * @param cost Number of tokens to consume
   * @param maxWaitMs Maximum time to wait (default: 5000ms)
   * @returns True if acquired, false if timeout
   */
  async acquire(key: string, cost: number = 1, maxWaitMs: number = 5000): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 100; // Check every 100ms

    while (Date.now() - startTime < maxWaitMs) {
      if (await this.tryAcquire(key, cost)) {
        return true;
      }

      // Wait before next attempt
      await this.sleep(checkInterval);
    }

    this.logger.warn(`Rate limit timeout for key: ${key}`);
    return false;
  }

  /**
   * Get remaining tokens for a key
   *
   * @param key Identifier
   * @returns Number of tokens available
   */
  getRemainingTokens(key: string): number {
    const bucket = this.getBucket(key);

    // Calculate current tokens with refill
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = elapsed * this.refillRate;

    return Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
  }

  /**
   * Reset rate limiter for a key
   *
   * @param key Identifier
   */
  reset(key: string): void {
    this.buckets.delete(key);
  }

  /**
   * Clear all rate limiter state
   */
  clear(): void {
    this.buckets.clear();
  }

  /**
   * Get or create bucket for key
   */
  private getBucket(key: string): TokenBucket {
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = {
        tokens: this.maxTokens,
        lastRefill: Date.now(),
      };
      this.buckets.set(key, bucket);
    }

    return bucket;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
