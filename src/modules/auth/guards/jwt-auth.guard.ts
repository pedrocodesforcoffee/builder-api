import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

/**
 * JWT Authentication Guard
 *
 * Protects routes by verifying JWT access tokens.
 * Extends Passport's AuthGuard with custom error handling.
 *
 * Usage:
 * ```typescript
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile(@Request() req) {
 *   return req.user;
 * }
 * ```
 *
 * Features:
 * - JWT token validation
 * - User extraction from token payload
 * - Custom error messages
 * - Integration with Passport JWT strategy
 *
 * @guard JwtAuthGuard
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * Handle authentication request
   * Extracts and validates JWT from request headers
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return (await super.canActivate(context)) as boolean;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  /**
   * Handle authentication errors
   * Provides clear error messages for different failure scenarios
   */
  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException(
          info?.message || 'Authentication required',
        )
      );
    }
    return user;
  }
}
