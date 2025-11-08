import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

/**
 * Refresh Token DTO
 *
 * Data transfer object for token refresh requests.
 * The refresh token can be provided either in the request body
 * or via HTTP-only cookies (for enhanced security).
 *
 * @dto RefreshTokenDto
 */
export class RefreshTokenDto {
  /**
   * Refresh token from the client
   * Optional if using HTTP-only cookies
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  refreshToken?: string;
}
