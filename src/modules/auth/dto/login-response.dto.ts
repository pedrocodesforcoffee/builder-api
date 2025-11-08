import { UserResponseDto } from './user-response.dto';

/**
 * Login Response DTO
 *
 * Structured response for successful login attempts.
 * Includes JWT access token, refresh token, and user information.
 */
export class LoginResponseDto {
  /**
   * JWT access token (short-lived, typically 15 minutes)
   * Used for authenticating API requests
   */
  accessToken!: string;

  /**
   * Refresh token (long-lived, typically 7 days)
   * Used to obtain new access tokens without re-authenticating
   */
  refreshToken!: string;

  /**
   * Token type (always "Bearer" for JWT)
   */
  tokenType!: string;

  /**
   * Access token expiration in seconds
   */
  expiresIn!: number;

  /**
   * Authenticated user information (without password)
   */
  user!: UserResponseDto;

  constructor(partial: Partial<LoginResponseDto>) {
    Object.assign(this, partial);
    this.tokenType = 'Bearer';
  }
}
