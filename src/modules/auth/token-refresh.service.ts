import {
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as crypto from 'crypto';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';
import { TokenService } from './token.service';

/**
 * Request Metadata Interface
 * Contains information about the client making the refresh request
 */
export interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
}

/**
 * Token Refresh Response Interface
 */
export interface TokenRefreshResponse {
  accessToken: string;
  refreshToken: string | null;
  user: any;
}

/**
 * Token Refresh Service
 *
 * Handles secure token refresh with rotation and reuse detection.
 *
 * Security Features:
 * - Token rotation on every use (prevents replay attacks)
 * - Token family tracking for reuse detection
 * - Grace period for network reliability (2 minutes)
 * - Automatic revocation of entire token family on reuse
 * - Comprehensive audit logging
 *
 * @service TokenRefreshService
 */
@Injectable()
export class TokenRefreshService {
  private readonly logger = new Logger(TokenRefreshService.name);
  private readonly GRACE_PERIOD_MS = 2 * 60 * 1000; // 2 minutes

  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Refresh access and refresh tokens
   *
   * Process:
   * 1. Hash and find the incoming token
   * 2. Check for grace period if token was recently used
   * 3. Detect token reuse attacks
   * 4. Validate token expiration and user status
   * 5. Generate new access token
   * 6. Rotate refresh token
   * 7. Mark old token as used
   *
   * @param refreshToken Plain refresh token from client
   * @param metadata Request metadata (IP, user agent, device ID)
   * @returns New access token, new refresh token, and user data
   * @throws UnauthorizedException if token is invalid
   * @throws ForbiddenException if token reuse is detected
   */
  async refreshTokens(
    refreshToken: string,
    metadata: RequestMetadata,
  ): Promise<TokenRefreshResponse> {
    // 1. Hash the incoming token
    const tokenHash = this.hashToken(refreshToken);

    // 2. Find the token record
    const tokenRecord = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    if (!tokenRecord) {
      // Check if it's a recently rotated token (grace period)
      const recentToken = await this.findRecentlyRotatedToken(tokenHash);
      if (recentToken) {
        this.logger.debug(
          `Grace period refresh for user ${recentToken.userId}, token generation ${recentToken.generation}`,
        );
        return this.handleGracePeriodRefresh(recentToken, metadata);
      }

      this.logger.warn('Refresh token not found');
      throw new UnauthorizedException('Invalid refresh token');
    }

    // 3. Check for token reuse (family breach)
    if (tokenRecord.hasBeenUsed()) {
      // Check if within grace period first
      if (tokenRecord.isWithinGracePeriod(this.GRACE_PERIOD_MS)) {
        this.logger.debug(
          `Grace period refresh for user ${tokenRecord.userId}, token generation ${tokenRecord.generation}`,
        );
        return this.handleGracePeriodRefresh(tokenRecord, metadata);
      }

      // Outside grace period - token reuse detected!
      this.logger.warn(
        `Token reuse detected for user ${tokenRecord.userId}, family ${tokenRecord.familyId}`,
      );
      await this.handleTokenReuse(tokenRecord);
      throw new ForbiddenException(
        'Token reuse detected. All sessions have been terminated.',
      );
    }

    // 4. Validate token expiration
    if (tokenRecord.isExpired()) {
      await this.revokeToken(tokenRecord.id, 'expired');
      this.logger.warn(`Expired refresh token used: ${tokenRecord.id}`);
      throw new UnauthorizedException('Refresh token has expired');
    }

    // 5. Validate token is not revoked
    if (tokenRecord.isRevoked()) {
      this.logger.warn(`Revoked refresh token used: ${tokenRecord.id}`);
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    // 6. Get user and validate account status
    const user = await this.userRepository.findOne({
      where: { id: tokenRecord.userId },
    });

    if (!user || !user.isActive) {
      await this.revokeToken(tokenRecord.id, 'user_inactive');
      this.logger.warn(`Inactive user attempted refresh: ${tokenRecord.userId}`);
      throw new UnauthorizedException('User account is inactive');
    }

    // 7. Generate new access token
    const newAccessToken = await this.tokenService.generateAccessToken(user);

    // 8. Rotate refresh token
    const newRefreshToken = await this.rotateRefreshToken(
      tokenRecord,
      metadata,
    );

    // 9. Mark old token as used
    await this.markTokenAsUsed(tokenRecord.id);

    // 10. Update user's last login time
    await this.updateUserLastLogin(user.id);

    this.logger.log(
      `Tokens refreshed for user ${user.id}, family ${tokenRecord.familyId}, generation ${tokenRecord.generation + 1}`,
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Rotate refresh token - create new token in the family
   *
   * @param oldToken The token being rotated
   * @param metadata Request metadata
   * @returns Plain new refresh token
   */
  private async rotateRefreshToken(
    oldToken: RefreshToken,
    metadata: RequestMetadata,
  ): Promise<string> {
    // Generate new cryptographically secure token
    const newToken = crypto.randomBytes(32).toString('hex');
    const newTokenHash = this.hashToken(newToken);

    // Calculate expiration date (7 days)
    const expiryDays = 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    // Create new token record in the same family
    const refreshTokenEntity = this.refreshTokenRepository.create({
      familyId: oldToken.familyId,
      userId: oldToken.userId,
      tokenHash: newTokenHash,
      previousTokenHash: oldToken.tokenHash, // Link to previous token
      generation: oldToken.generation + 1,
      expiresAt,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      deviceId: metadata.deviceId,
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);

    this.logger.debug(
      `Rotated refresh token for user ${oldToken.userId}, generation ${refreshTokenEntity.generation}`,
    );

    return newToken; // Return plain token to client
  }

  /**
   * Handle token reuse attack - revoke entire token family
   *
   * @param tokenRecord The reused token
   */
  private async handleTokenReuse(tokenRecord: RefreshToken): Promise<void> {
    // Revoke all tokens in the family
    await this.refreshTokenRepository.update(
      { familyId: tokenRecord.familyId },
      {
        revokedAt: new Date(),
        revokeReason: 'token_reuse',
      },
    );

    this.logger.error(
      `Token family ${tokenRecord.familyId} revoked due to token reuse. User: ${tokenRecord.userId}`,
    );

    // TODO: Send security alert to user
    // await this.notificationService.sendSecurityAlert(
    //   tokenRecord.userId,
    //   'Suspicious activity detected. All sessions have been terminated for your security.',
    // );
  }

  /**
   * Handle grace period refresh
   * If a token was just used, allow re-using it within grace period
   *
   * @param recentToken The recently used token
   * @param metadata Request metadata
   * @returns Token refresh response with existing access token
   */
  private async handleGracePeriodRefresh(
    recentToken: RefreshToken,
    metadata: RequestMetadata,
  ): Promise<TokenRefreshResponse> {
    // Check if within grace period
    if (!recentToken.isWithinGracePeriod(this.GRACE_PERIOD_MS)) {
      this.logger.warn('Token used outside grace period');
      throw new UnauthorizedException('Token is no longer valid');
    }

    // Find the current valid token in the family
    const currentToken = await this.refreshTokenRepository.findOne({
      where: {
        familyId: recentToken.familyId,
        generation: recentToken.generation + 1,
        revokedAt: IsNull(),
      },
      relations: ['user'],
    });

    if (!currentToken) {
      this.logger.error('Token family corrupted - current token not found');
      throw new UnauthorizedException('Token family corrupted');
    }

    // Get user
    const user = await this.userRepository.findOne({
      where: { id: recentToken.userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Generate new access token
    const accessToken = await this.tokenService.generateAccessToken(user);

    this.logger.log(
      `Grace period refresh for user ${user.id}, returning existing refresh token`,
    );

    // Return access token but NO new refresh token (use existing one)
    return {
      accessToken,
      refreshToken: null, // Don't send refresh token - client should use existing
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Find recently rotated token (for grace period handling)
   *
   * @param tokenHash Hash of the token to find
   * @returns Token record if found within grace period
   */
  private async findRecentlyRotatedToken(
    tokenHash: string,
  ): Promise<RefreshToken | null> {
    // Look for tokens where this hash is the previousTokenHash
    const nextToken = await this.refreshTokenRepository.findOne({
      where: { previousTokenHash: tokenHash },
    });

    if (!nextToken) {
      return null;
    }

    // Find the original token
    const originalToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
    });

    if (!originalToken || !originalToken.hasBeenUsed()) {
      return null;
    }

    return originalToken;
  }

  /**
   * Mark token as used
   *
   * @param tokenId Token ID to mark as used
   */
  private async markTokenAsUsed(tokenId: string): Promise<void> {
    await this.refreshTokenRepository.update(tokenId, {
      usedAt: new Date(),
    });
  }

  /**
   * Revoke a token
   *
   * @param tokenId Token ID to revoke
   * @param reason Revocation reason
   */
  private async revokeToken(
    tokenId: string,
    reason: string,
  ): Promise<void> {
    await this.refreshTokenRepository.update(tokenId, {
      revokedAt: new Date(),
      revokeReason: reason,
    });

    this.logger.debug(`Token ${tokenId} revoked: ${reason}`);
  }

  /**
   * Update user's last login timestamp
   *
   * @param userId User ID
   */
  private async updateUserLastLogin(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      lastLoginAt: new Date(),
    });
  }

  /**
   * Hash a token using SHA-256
   *
   * @param token Plain token
   * @returns Hashed token
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Sanitize user object for response
   * Remove sensitive fields
   *
   * @param user User entity
   * @returns Sanitized user object
   */
  private sanitizeUser(user: User): any {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      role: user.systemRole,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
