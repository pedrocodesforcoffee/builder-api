import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import { QBConnection } from '../entities';
import { QBConnectionStatus } from '../enums';
import { QuickBooksConfigService } from './quickbooks-config.service';
import { EncryptionUtil } from '../utils/encryption.util';

/**
 * QuickBooks OAuth 2.0 tokens from token endpoint
 */
interface QBTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds (typically 3600 = 1 hour)
  x_refresh_token_expires_in: number; // seconds (typically 8640000 = 100 days)
  token_type: string;
}

/**
 * QuickBooks User Info from userinfo endpoint
 */
interface QBUserInfo {
  sub: string;
  email: string;
  emailVerified: boolean;
  givenName?: string;
  familyName?: string;
}

/**
 * QuickBooks Authentication Service
 *
 * Handles OAuth 2.0 authentication flow with QuickBooks Online:
 * - Generate authorization URL
 * - Exchange authorization code for tokens
 * - Refresh access tokens (proactive and on-demand)
 * - Revoke tokens (disconnect)
 * - Token encryption/decryption
 *
 * Security Features:
 * - CSRF protection via state parameter
 * - Encrypted token storage (AES-256-GCM)
 * - Proactive token refresh (before expiry)
 * - Token rotation support
 */
@Injectable()
export class QuickBooksAuthService {
  private readonly logger = new Logger(QuickBooksAuthService.name);
  private readonly httpClient: AxiosInstance;
  private readonly encryptionUtil: EncryptionUtil;

  constructor(
    @InjectRepository(QBConnection)
    private readonly connectionRepository: Repository<QBConnection>,
    private readonly configService: QuickBooksConfigService,
  ) {
    // Initialize HTTP client
    this.httpClient = axios.create({
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // Initialize encryption utility
    this.encryptionUtil = new EncryptionUtil(
      this.configService.getEncryptionKey(),
    );
  }

  /**
   * Generate OAuth 2.0 authorization URL
   *
   * User should be redirected to this URL to grant permission.
   *
   * @param organizationId Organization identifier
   * @returns Authorization URL and state parameter
   */
  async getAuthorizationUrl(organizationId: string): Promise<{
    authorizationUrl: string;
    state: string;
  }> {
    this.logger.log(`Generating authorization URL for organization ${organizationId}`);

    // Generate random state for CSRF protection
    const state = this.generateState(organizationId);

    // Build authorization URL
    const authorizationUrl = this.configService.getAuthorizationUrl(state);

    this.logger.log(`Authorization URL generated for organization ${organizationId}`);

    return {
      authorizationUrl,
      state,
    };
  }

  /**
   * Handle OAuth 2.0 callback
   *
   * Exchanges authorization code for access/refresh tokens and stores connection.
   *
   * @param code Authorization code from QuickBooks
   * @param realmId Company ID from QuickBooks
   * @param state State parameter for CSRF validation
   * @returns Created QBConnection
   * @throws UnauthorizedException if state is invalid
   * @throws BadRequestException if token exchange fails
   */
  async handleOAuthCallback(
    code: string,
    realmId: string,
    state: string,
  ): Promise<QBConnection> {
    this.logger.log(`Handling OAuth callback for realm ${realmId}`);

    // Validate and extract organization ID from state
    const organizationId = this.validateState(state);

    // Exchange authorization code for tokens
    const tokens = await this.exchangeCodeForTokens(code);

    // Fetch user info (for additional context)
    const userInfo = await this.fetchUserInfo(tokens.access_token);

    // Calculate token expiration dates
    const now = new Date();
    const accessTokenExpiresAt = new Date(now.getTime() + tokens.expires_in * 1000);
    const refreshTokenExpiresAt = new Date(
      now.getTime() + tokens.x_refresh_token_expires_in * 1000,
    );

    // Encrypt tokens before storage
    const encryptedAccessToken = this.encryptionUtil.encrypt(tokens.access_token);
    const encryptedRefreshToken = this.encryptionUtil.encrypt(tokens.refresh_token);

    // Create or update connection
    let connection = await this.connectionRepository.findOne({
      where: { organizationId },
    });

    if (connection) {
      // Update existing connection
      connection.status = QBConnectionStatus.CONNECTED;
      connection.qbRealmId = realmId;
      connection.qbCompanyName = userInfo.email; // Use email as placeholder until we fetch company name
      connection.encryptedAccessToken = encryptedAccessToken;
      connection.encryptedRefreshToken = encryptedRefreshToken;
      connection.accessTokenExpiresAt = accessTokenExpiresAt;
      connection.refreshTokenExpiresAt = refreshTokenExpiresAt;
      connection.connectedAt = now;
      connection.disconnectedAt = undefined;
      connection.lastSyncedAt = undefined;
      connection.lastError = undefined;
      connection.qbEnvironment = this.configService.getEnvironment();

      this.logger.log(`Updated connection for organization ${organizationId}`);
    } else {
      // Create new connection
      connection = this.connectionRepository.create({
        organizationId,
        status: QBConnectionStatus.CONNECTED,
        qbRealmId: realmId,
        qbCompanyName: userInfo.email,
        encryptedAccessToken,
        encryptedRefreshToken,
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
        connectedAt: now,
        qbEnvironment: this.configService.getEnvironment(),
      });

      this.logger.log(`Created new connection for organization ${organizationId}`);
    }

    await this.connectionRepository.save(connection);

    this.logger.log(`OAuth connection established for organization ${organizationId}`);

    return connection;
  }

  /**
   * Refresh access token
   *
   * Uses refresh token to obtain new access token (and possibly new refresh token).
   * Handles token rotation (QuickBooks may return new refresh token).
   *
   * @param organizationId Organization identifier
   * @returns Updated QBConnection
   * @throws NotFoundException if connection not found
   * @throws UnauthorizedException if refresh fails
   */
  async refreshAccessToken(organizationId: string): Promise<QBConnection> {
    this.logger.log(`Refreshing access token for organization ${organizationId}`);

    // Fetch connection
    const connection = await this.connectionRepository.findOne({
      where: { organizationId },
    });

    if (!connection) {
      throw new NotFoundException(
        `QuickBooks connection not found for organization ${organizationId}`,
      );
    }

    // Decrypt refresh token
    const refreshToken = this.encryptionUtil.decrypt(
      connection.encryptedRefreshToken,
    );

    try {
      // Request new tokens
      const tokens = await this.refreshTokens(refreshToken);

      // Calculate new expiration dates
      const now = new Date();
      const accessTokenExpiresAt = new Date(now.getTime() + tokens.expires_in * 1000);

      // Encrypt new access token
      const encryptedAccessToken = this.encryptionUtil.encrypt(tokens.access_token);

      // Update connection
      connection.encryptedAccessToken = encryptedAccessToken;
      connection.accessTokenExpiresAt = accessTokenExpiresAt;
      connection.status = QBConnectionStatus.CONNECTED;
      connection.lastError = undefined;

      // Handle refresh token rotation (QuickBooks may return new refresh token)
      if (tokens.refresh_token) {
        const encryptedRefreshToken = this.encryptionUtil.encrypt(tokens.refresh_token);
        const refreshTokenExpiresAt = new Date(
          now.getTime() + tokens.x_refresh_token_expires_in * 1000,
        );

        connection.encryptedRefreshToken = encryptedRefreshToken;
        connection.refreshTokenExpiresAt = refreshTokenExpiresAt;

        this.logger.log(
          `Refresh token rotated for organization ${organizationId}`,
        );
      }

      await this.connectionRepository.save(connection);

      this.logger.log(`Access token refreshed for organization ${organizationId}`);

      return connection;
    } catch (error) {
      // Update connection status to reflect error
      connection.status = QBConnectionStatus.AUTH_FAILED;
      connection.lastError = (error as Error).message;
      await this.connectionRepository.save(connection);

      this.logger.error(
        `Token refresh failed for organization ${organizationId}: ${(error as Error).message}`,
      );

      throw new UnauthorizedException('Failed to refresh access token');
    }
  }

  /**
   * Disconnect QuickBooks connection
   *
   * Revokes tokens and marks connection as disconnected.
   *
   * @param organizationId Organization identifier
   * @throws NotFoundException if connection not found
   */
  async disconnect(organizationId: string): Promise<void> {
    this.logger.log(`Disconnecting QuickBooks for organization ${organizationId}`);

    // Fetch connection
    const connection = await this.connectionRepository.findOne({
      where: { organizationId },
    });

    if (!connection) {
      throw new NotFoundException(
        `QuickBooks connection not found for organization ${organizationId}`,
      );
    }

    try {
      // Decrypt tokens
      const accessToken = this.encryptionUtil.decrypt(
        connection.encryptedAccessToken,
      );
      const refreshToken = this.encryptionUtil.decrypt(
        connection.encryptedRefreshToken,
      );

      // Revoke tokens (best effort - don't fail if revocation fails)
      await this.revokeToken(accessToken, 'access_token').catch(err => {
        this.logger.warn(`Failed to revoke access token: ${err.message}`);
      });

      await this.revokeToken(refreshToken, 'refresh_token').catch(err => {
        this.logger.warn(`Failed to revoke refresh token: ${err.message}`);
      });
    } catch (error) {
      this.logger.warn(
        `Error revoking tokens for organization ${organizationId}: ${(error as Error).message}`,
      );
    }

    // Update connection status
    connection.status = QBConnectionStatus.DISCONNECTED;
    connection.disconnectedAt = new Date();
    await this.connectionRepository.save(connection);

    this.logger.log(`QuickBooks disconnected for organization ${organizationId}`);
  }

  /**
   * Get valid access token for organization
   *
   * Returns cached token if still valid, otherwise refreshes automatically.
   *
   * @param organizationId Organization identifier
   * @returns Decrypted access token
   * @throws NotFoundException if connection not found
   * @throws UnauthorizedException if unable to get valid token
   */
  async getAccessToken(organizationId: string): Promise<string> {
    const connection = await this.connectionRepository.findOne({
      where: { organizationId },
    });

    if (!connection) {
      throw new NotFoundException(
        `QuickBooks connection not found for organization ${organizationId}`,
      );
    }

    if (connection.status !== QBConnectionStatus.CONNECTED) {
      throw new UnauthorizedException(
        `QuickBooks connection is not active (status: ${connection.status})`,
      );
    }

    // Check if access token is expired or will expire soon (5 minutes buffer)
    const now = new Date();
    const expiryBuffer = 5 * 60 * 1000; // 5 minutes
    const expiresAt = connection.accessTokenExpiresAt.getTime();

    if (now.getTime() + expiryBuffer >= expiresAt) {
      this.logger.log(
        `Access token expired or expiring soon for organization ${organizationId}, refreshing...`,
      );

      // Refresh token
      const updatedConnection = await this.refreshAccessToken(organizationId);
      return this.encryptionUtil.decrypt(updatedConnection.encryptedAccessToken);
    }

    // Decrypt and return cached token
    return this.encryptionUtil.decrypt(connection.encryptedAccessToken);
  }

  /**
   * Check if organization has active QuickBooks connection
   *
   * @param organizationId Organization identifier
   * @returns True if connected and tokens valid
   */
  async isConnected(organizationId: string): Promise<boolean> {
    const connection = await this.connectionRepository.findOne({
      where: { organizationId },
    });

    if (!connection || connection.status !== QBConnectionStatus.CONNECTED) {
      return false;
    }

    // Check if refresh token is expired
    const now = new Date();
    if (now >= connection.refreshTokenExpiresAt) {
      return false;
    }

    return true;
  }

  // Private helper methods

  private generateState(organizationId: string): string {
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(16).toString('hex');
    const payload = `${organizationId}:${timestamp}:${random}`;
    return Buffer.from(payload).toString('base64url');
  }

  private validateState(state: string): string {
    try {
      const payload = Buffer.from(state, 'base64url').toString('utf8');
      const [organizationId, timestamp, _random] = payload.split(':');

      // Validate timestamp (state should be used within 10 minutes)
      const stateAge = Date.now() - parseInt(timestamp, 10);
      if (stateAge > 10 * 60 * 1000) {
        throw new Error('State parameter expired');
      }

      return organizationId;
    } catch (error) {
      throw new UnauthorizedException('Invalid state parameter');
    }
  }

  private async exchangeCodeForTokens(code: string): Promise<QBTokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.configService.getRedirectUri(),
    });

    const authHeader = Buffer.from(
      `${this.configService.getClientId()}:${this.configService.getClientSecret()}`,
    ).toString('base64');

    try {
      const response = await this.httpClient.post<QBTokenResponse>(
        this.configService.getTokenEndpoint(),
        params.toString(),
        {
          headers: {
            'Authorization': `Basic ${authHeader}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Token exchange failed: ${(error as any).response?.data || (error as Error).message}`);
      throw new BadRequestException('Failed to exchange authorization code for tokens');
    }
  }

  private async refreshTokens(refreshToken: string): Promise<QBTokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const authHeader = Buffer.from(
      `${this.configService.getClientId()}:${this.configService.getClientSecret()}`,
    ).toString('base64');

    const response = await this.httpClient.post<QBTokenResponse>(
      this.configService.getTokenEndpoint(),
      params.toString(),
      {
        headers: {
          'Authorization': `Basic ${authHeader}`,
        },
      },
    );

    return response.data;
  }

  private async revokeToken(token: string, tokenType: 'access_token' | 'refresh_token'): Promise<void> {
    const params = new URLSearchParams({
      token,
    });

    const authHeader = Buffer.from(
      `${this.configService.getClientId()}:${this.configService.getClientSecret()}`,
    ).toString('base64');

    await this.httpClient.post(
      this.configService.getRevokeEndpoint(),
      params.toString(),
      {
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Accept': 'application/json',
        },
      },
    );
  }

  private async fetchUserInfo(accessToken: string): Promise<QBUserInfo> {
    try {
      const response = await this.httpClient.get<QBUserInfo>(
        this.configService.getUserInfoEndpoint(),
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.warn(`Failed to fetch user info: ${(error as Error).message}`);
      // Return minimal info if fetch fails
      return {
        sub: 'unknown',
        email: 'unknown',
        emailVerified: false,
      };
    }
  }
}
