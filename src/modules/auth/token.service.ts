import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as crypto from 'crypto';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';
import { OrganizationMember } from '../organizations/entities/organization-member.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';

/**
 * JWT Token Payload Interface
 */
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: string; // System role
  jti: string; // JWT ID for tracking
  organizations?: Array<{
    id: string;
    role: string;
  }>;
  projects?: Array<{
    id: string;
    organizationId: string;
    role: string;
  }>;
}

/**
 * Refresh Token Metadata
 */
export interface RefreshTokenMetadata {
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Token Service
 *
 * Handles JWT access token and refresh token generation, validation, and management.
 *
 * Features:
 * - JWT access token generation (short-lived)
 * - Refresh token generation and storage (long-lived)
 * - Token hashing for secure storage
 * - Token validation and verification
 * - Automatic cleanup of expired tokens
 *
 * Security:
 * - Refresh tokens are hashed before storage (SHA-256)
 * - JWT tokens include issuer and audience claims
 * - Unique JWT IDs (jti) for token tracking
 * - Automatic expiration handling
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(OrganizationMember)
    private readonly organizationMemberRepository: Repository<OrganizationMember>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,
  ) {}

  /**
   * Generate JWT access token
   *
   * Creates a short-lived JWT token (typically 15 minutes) for API authentication.
   * Includes user's organization and project memberships for efficient authorization.
   *
   * @param user - User object
   * @returns JWT access token string
   */
  async generateAccessToken(user: User): Promise<string> {
    // Fetch user's organization memberships
    const orgMemberships = await this.organizationMemberRepository.find({
      where: { userId: user.id },
      select: ['organizationId', 'role'],
    });

    // Fetch user's project memberships with organization info
    const projectMemberships = await this.projectMemberRepository
      .createQueryBuilder('pm')
      .innerJoin('pm.project', 'p')
      .select(['pm.projectId', 'pm.role', 'p.organizationId'])
      .where('pm.userId = :userId', { userId: user.id })
      .getRawMany();

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.systemRole,
      jti: this.generateUniqueId(),
      organizations: orgMemberships.map((m) => ({
        id: m.organizationId,
        role: m.role,
      })),
      projects: projectMemberships.map((m) => ({
        id: m.pm_projectId,
        organizationId: m.p_organizationId,
        role: m.pm_role,
      })),
    };

    const secret = this.configService.get<string>('JWT_SECRET');
    const expiresIn = this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRY', '15m');
    const issuer = this.configService.get<string>('JWT_ISSUER', 'builder-api');
    const audience = this.configService.get<string>('JWT_AUDIENCE', 'builder-app');

    try {
      const token = this.jwtService.sign(payload as any);

      this.logger.log(
        `Access token generated for user: ${user.id} (${orgMemberships.length} orgs, ${projectMemberships.length} projects)`,
      );
      return token;
    } catch (error) {
      this.logger.error('Failed to generate access token', error);
      throw new Error('Token generation failed');
    }
  }

  /**
   * Generate and store refresh token
   *
   * Creates a long-lived refresh token (typically 7 days) and stores it hashed in the database.
   *
   * @param user - User object
   * @param metadata - IP address and user agent for security tracking
   * @returns Plain refresh token (not hashed)
   */
  async generateRefreshToken(
    user: User,
    metadata?: RefreshTokenMetadata,
    familyId?: string,
  ): Promise<string> {
    // Generate cryptographically secure random token
    const token = crypto.randomBytes(32).toString('hex');

    // Hash the token for storage
    const tokenHash = this.hashToken(token);

    // Calculate expiration date
    const expiryDays = this.parseExpiryToDays(
      this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRY', '7d'),
    );
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    // Generate new family ID if not provided (first token in family)
    const tokenFamilyId = familyId || crypto.randomUUID();

    // Create refresh token record
    const refreshToken = this.refreshTokenRepository.create({
      familyId: tokenFamilyId,
      userId: user.id,
      tokenHash,
      generation: 1, // First generation in the family
      expiresAt,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });

    try {
      await this.refreshTokenRepository.save(refreshToken);
      this.logger.log(`Refresh token created for user: ${user.id}, family: ${tokenFamilyId}`);
      return token; // Return plain token to client
    } catch (error) {
      this.logger.error('Failed to save refresh token', error);
      throw new Error('Refresh token generation failed');
    }
  }

  /**
   * Validate and verify refresh token
   *
   * Checks if a refresh token is valid, not expired, and not revoked.
   *
   * @param token - Plain refresh token
   * @returns RefreshToken entity if valid
   * @throws UnauthorizedException if token is invalid
   */
  async validateRefreshToken(token: string): Promise<RefreshToken> {
    const tokenHash = this.hashToken(token);

    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    if (!refreshToken) {
      this.logger.warn('Refresh token not found');
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (refreshToken.isExpired()) {
      this.logger.warn(`Expired refresh token used: ${refreshToken.id}`);
      throw new UnauthorizedException('Refresh token has expired');
    }

    if (refreshToken.isRevoked()) {
      this.logger.warn(`Revoked refresh token used: ${refreshToken.id}`);
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    this.logger.log(`Refresh token validated for user: ${refreshToken.userId}`);
    return refreshToken;
  }

  /**
   * Revoke a refresh token
   *
   * Marks a refresh token as revoked, preventing future use.
   *
   * @param token - Plain refresh token
   */
  async revokeRefreshToken(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);

    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
    });

    if (refreshToken) {
      refreshToken.revokedAt = new Date();
      await this.refreshTokenRepository.save(refreshToken);
      this.logger.log(`Refresh token revoked: ${refreshToken.id}`);
    }
  }

  /**
   * Revoke all refresh tokens for a user
   *
   * Useful for logout-all-sessions functionality.
   *
   * @param userId - User ID
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: new Date() })
      .where('userId = :userId', { userId })
      .andWhere('revokedAt IS NULL')
      .execute();

    this.logger.log(`All refresh tokens revoked for user: ${userId}`);
  }

  /**
   * Clean up expired refresh tokens
   *
   * Removes expired tokens from the database to prevent table bloat.
   * Should be run periodically (e.g., via cron job).
   */
  async cleanupExpiredTokens(): Promise<void> {
    const result = await this.refreshTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });

    this.logger.log(`Cleaned up ${result.affected || 0} expired refresh tokens`);
  }

  /**
   * Verify JWT access token
   *
   * Validates the JWT signature and claims.
   *
   * @param token - JWT access token
   * @returns Decoded token payload
   * @throws UnauthorizedException if token is invalid
   */
  async verifyAccessToken(token: string): Promise<JwtPayload> {
    const secret = this.configService.get<string>('JWT_SECRET');
    const issuer = this.configService.get<string>('JWT_ISSUER', 'builder-api');
    const audience = this.configService.get<string>('JWT_AUDIENCE', 'builder-app');

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret,
        issuer,
        audience,
      });

      return payload;
    } catch (error) {
      this.logger.warn('Invalid access token', error);
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  /**
   * Get token expiration in seconds
   *
   * @returns Access token expiration in seconds
   */
  getAccessTokenExpiration(): number {
    const expiry = this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRY', '15m');
    return this.parseExpiryToSeconds(expiry);
  }

  /**
   * Hash a token using SHA-256
   *
   * @param token - Plain token
   * @returns Hashed token
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate a unique identifier
   *
   * @returns Unique ID string
   */
  private generateUniqueId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Parse expiry string to seconds
   *
   * @param expiry - Expiry string (e.g., '15m', '7d', '1h')
   * @returns Expiry in seconds
   */
  private parseExpiryToSeconds(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 60 * 60 * 24;
      default:
        return 900; // Default 15 minutes
    }
  }

  /**
   * Parse expiry string to days
   *
   * @param expiry - Expiry string (e.g., '7d', '1w')
   * @returns Expiry in days
   */
  private parseExpiryToDays(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);

    switch (unit) {
      case 'd':
        return value;
      case 'w':
        return value * 7;
      case 'm':
        return value * 30;
      default:
        return 7; // Default 7 days
    }
  }
}
