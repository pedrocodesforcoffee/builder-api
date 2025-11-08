import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../token.service';

/**
 * JWT Passport Strategy
 *
 * Validates JWT access tokens and extracts user information.
 * Used by JwtAuthGuard to authenticate requests.
 *
 * Configuration:
 * - Extracts JWT from Authorization header (Bearer token)
 * - Validates signature using JWT_SECRET
 * - Verifies issuer and audience claims
 *
 * @strategy JwtStrategy
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') || 'default-secret-key',
    });
  }

  /**
   * Validate JWT payload and return user object
   *
   * This method is called after JWT signature is verified.
   * Returns user object that will be attached to request.user
   *
   * @param payload - Decoded JWT payload
   * @returns User object for request context
   */
  async validate(payload: JwtPayload) {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Return user object that will be available as req.user
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      organizations: payload.organizations || [],
      projects: payload.projects || [],
    };
  }
}
