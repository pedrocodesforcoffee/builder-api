import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';

/**
 * Refresh Token Throttle Guard
 *
 * Custom rate limiting guard for token refresh endpoint.
 * Provides stricter rate limits than standard API endpoints to prevent abuse.
 *
 * Rate Limits:
 * - 10 requests per 60 seconds per IP address
 * - Protects against brute force attacks on refresh tokens
 * - Prevents token enumeration attacks
 *
 * Security Features:
 * - IP-based rate limiting
 * - Custom error messages
 * - Automatic blocking after limit exceeded
 *
 * @guard RefreshThrottleGuard
 */
@Injectable()
export class RefreshThrottleGuard extends ThrottlerGuard {
  /**
   * Override to provide custom error message
   */
  protected async throwThrottlingException(
    context: ExecutionContext,
  ): Promise<void> {
    throw new ThrottlerException(
      'Too many refresh requests. Please try again later.',
    );
  }

  /**
   * Get tracker for rate limiting
   * Uses IP address as the tracking identifier
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use IP address for tracking
    return req.ip || req.socket.remoteAddress || 'unknown';
  }
}
