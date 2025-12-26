import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Res,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { QuickBooksAuthService } from '../services/quickbooks-auth.service';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import {
  QBAuthUrlResponseDto,
  QBOAuthCallbackDto,
  QBConnectionResponseDto,
  QBConnectionStatusDto,
} from '../dto';

/**
 * QuickBooks Authentication Controller
 *
 * REST API endpoints for QuickBooks OAuth 2.0 authentication flow.
 *
 * Flow:
 * 1. GET /connect/:organizationId - Generate authorization URL
 * 2. User grants permission on QuickBooks website
 * 3. GET /callback - Handle OAuth callback (QuickBooks redirects here)
 * 4. POST /disconnect/:organizationId - Disconnect integration
 * 5. GET /status/:organizationId - Check connection status
 */
@ApiTags('QuickBooks Authentication')
@Controller('integrations/quickbooks/auth')
export class QuickBooksAuthController {
  private readonly logger = new Logger(QuickBooksAuthController.name);

  constructor(
    private readonly authService: QuickBooksAuthService,
  ) {}

  /**
   * Get QuickBooks authorization URL
   *
   * Generates OAuth 2.0 authorization URL for user to grant permission.
   * User should be redirected to this URL in their browser.
   *
   * @param organizationId Organization ID
   * @returns Authorization URL and state parameter
   */
  @Get('connect/:organizationId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get QuickBooks authorization URL',
    description: 'Generate OAuth 2.0 authorization URL. Redirect user to this URL to grant QuickBooks access.',
  })
  @ApiResponse({
    status: 200,
    description: 'Authorization URL generated successfully',
    type: QBAuthUrlResponseDto,
  })
  async getAuthorizationUrl(
    @Param('organizationId') organizationId: string,
  ): Promise<QBAuthUrlResponseDto> {
    this.logger.log(`Generating authorization URL for organization ${organizationId}`);

    const result = await this.authService.getAuthorizationUrl(organizationId);

    return result;
  }

  /**
   * Handle OAuth 2.0 callback
   *
   * QuickBooks redirects to this endpoint after user grants/denies permission.
   * Exchanges authorization code for access/refresh tokens.
   *
   * @param code Authorization code from QuickBooks
   * @param realmId Company ID (Realm ID) from QuickBooks
   * @param state State parameter for CSRF protection
   * @param res Express response for redirect
   */
  @Get('callback')
  @ApiOperation({
    summary: 'OAuth callback handler',
    description: 'Handles OAuth 2.0 callback from QuickBooks. This endpoint is called by QuickBooks after user authorization.',
  })
  @ApiQuery({ name: 'code', description: 'Authorization code' })
  @ApiQuery({ name: 'realmId', description: 'QuickBooks Company ID' })
  @ApiQuery({ name: 'state', description: 'State parameter for CSRF validation' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to success/error page',
  })
  async handleCallback(
    @Query() query: QBOAuthCallbackDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      this.logger.log(`Handling OAuth callback for realm ${query.realmId}`);

      // Exchange code for tokens and create connection
      const connection = await this.authService.handleOAuthCallback(
        query.code,
        query.realmId,
        query.state,
      );

      this.logger.log(
        `OAuth callback successful for organization ${connection.organizationId}`,
      );

      // Redirect to success page
      // TODO: Replace with actual frontend URL
      const successUrl = `/app/settings/integrations/quickbooks/success`;
      res.redirect(HttpStatus.FOUND, successUrl);
    } catch (error) {
      this.logger.error(`OAuth callback failed: ${(error as Error).message}`, (error as Error).stack);

      // Redirect to error page
      const errorUrl = `/app/settings/integrations/quickbooks/error?message=${encodeURIComponent((error as Error).message)}`;
      res.redirect(HttpStatus.FOUND, errorUrl);
    }
  }

  /**
   * Disconnect QuickBooks integration
   *
   * Revokes OAuth tokens and marks connection as disconnected.
   *
   * @param organizationId Organization ID
   */
  @Post('disconnect/:organizationId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Disconnect QuickBooks',
    description: 'Revoke OAuth tokens and disconnect QuickBooks integration.',
  })
  @ApiResponse({
    status: 204,
    description: 'Successfully disconnected',
  })
  @ApiResponse({
    status: 404,
    description: 'Connection not found',
  })
  async disconnect(
    @Param('organizationId') organizationId: string,
  ): Promise<void> {
    this.logger.log(`Disconnecting QuickBooks for organization ${organizationId}`);

    await this.authService.disconnect(organizationId);

    this.logger.log(`QuickBooks disconnected for organization ${organizationId}`);
  }

  /**
   * Get connection status
   *
   * Returns current QuickBooks connection status and token expiration info.
   *
   * @param organizationId Organization ID
   * @returns Connection status
   */
  @Get('status/:organizationId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get connection status',
    description: 'Get current QuickBooks connection status and token expiration information.',
  })
  @ApiResponse({
    status: 200,
    description: 'Connection status retrieved',
    type: QBConnectionStatusDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Connection not found',
  })
  async getStatus(
    @Param('organizationId') organizationId: string,
  ): Promise<QBConnectionStatusDto> {
    this.logger.log(`Getting connection status for organization ${organizationId}`);

    const isConnected = await this.authService.isConnected(organizationId);

    // If not connected, return basic status
    if (!isConnected) {
      return {
        id: '',
        status: 'DISCONNECTED',
        isActive: false,
        accessTokenExpiresInDays: 0,
        refreshTokenExpiresInDays: 0,
      } as QBConnectionStatusDto;
    }

    // Fetch full connection details
    // Note: This is a simplified implementation
    // In production, you'd want to fetch the connection and calculate expiry
    return {
      id: 'connection-id',
      status: 'CONNECTED',
      isActive: true,
      accessTokenExpiresInDays: 0,
      refreshTokenExpiresInDays: 90,
    } as QBConnectionStatusDto;
  }

  /**
   * Refresh access token
   *
   * Manually trigger access token refresh.
   * (Normally happens automatically when needed)
   *
   * @param organizationId Organization ID
   * @returns Updated connection
   */
  @Post('refresh/:organizationId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Manually refresh QuickBooks access token. Normally this happens automatically.',
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: QBConnectionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Connection not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Token refresh failed',
  })
  async refreshToken(
    @Param('organizationId') organizationId: string,
  ): Promise<QBConnectionResponseDto> {
    this.logger.log(`Manually refreshing token for organization ${organizationId}`);

    const connection = await this.authService.refreshAccessToken(organizationId);

    return {
      id: connection.id,
      organizationId: connection.organizationId,
      status: connection.status,
      qbRealmId: connection.qbRealmId,
      qbCompanyName: connection.qbCompanyName,
      accessTokenExpiresAt: connection.accessTokenExpiresAt,
      refreshTokenExpiresAt: connection.refreshTokenExpiresAt,
      connectedAt: connection.connectedAt,
      disconnectedAt: connection.disconnectedAt,
      lastSyncedAt: connection.lastSyncedAt,
      lastError: connection.lastError,
      qbEnvironment: connection.qbEnvironment,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };
  }
}
