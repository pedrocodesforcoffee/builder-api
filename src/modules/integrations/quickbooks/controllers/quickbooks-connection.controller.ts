import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QBConnection } from '../entities';
import { QuickBooksAuthService } from '../services';

/**
 * QuickBooks Connection Management Controller
 *
 * Manages QuickBooks connection lifecycle.
 *
 * Features:
 * - View connection status
 * - Disconnect from QuickBooks
 * - Connection health check
 *
 * @controller
 */
@ApiTags('QuickBooks Connection')
@Controller('api/v1/organizations/:organizationId/integrations/quickbooks/connection')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuickBooksConnectionController {
  private readonly logger = new Logger(QuickBooksConnectionController.name);

  constructor(
    @InjectRepository(QBConnection)
    private readonly connectionRepository: Repository<QBConnection>,
    private readonly authService: QuickBooksAuthService,
  ) {}

  /**
   * Get connection status
   *
   * @param organizationId - Organization ID
   * @param user - Current user
   * @returns Connection details
   */
  @Get()
  @ApiOperation({
    summary: 'Get QuickBooks connection status',
    description: 'Retrieves current QuickBooks connection status and details',
  })
  @ApiResponse({ status: 200, description: 'Connection details retrieved' })
  @ApiResponse({ status: 404, description: 'No connection found' })
  async getConnection(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: any,
  ): Promise<QBConnection> {
    const connection = await this.connectionRepository.findOne({
      where: { organizationId },
    });

    if (!connection) {
      throw new NotFoundException('No QuickBooks connection found for this organization');
    }

    // Don't expose sensitive tokens in response
    const { accessToken, refreshToken, encryptionIv, ...safeConnection } = connection as any;

    return safeConnection;
  }

  /**
   * Disconnect from QuickBooks
   *
   * @param organizationId - Organization ID
   * @param user - Current user
   * @returns Success message
   */
  @Delete()
  @HttpCode(204)
  @ApiOperation({
    summary: 'Disconnect from QuickBooks',
    description: 'Disconnects the organization from QuickBooks and removes connection',
  })
  @ApiResponse({ status: 204, description: 'Successfully disconnected' })
  @ApiResponse({ status: 404, description: 'No connection found' })
  async disconnect(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: any,
  ): Promise<void> {
    const connection = await this.connectionRepository.findOne({
      where: { organizationId },
    });

    if (!connection) {
      throw new NotFoundException('No QuickBooks connection found for this organization');
    }

    this.logger.log(
      `Disconnecting QuickBooks for organization ${organizationId} by user ${user.id}`,
    );

    // Delete the connection (this will cascade delete related records based on schema)
    await this.connectionRepository.remove(connection);

    this.logger.log(`Successfully disconnected QuickBooks for organization ${organizationId}`);
  }

  /**
   * Check connection health
   *
   * @param organizationId - Organization ID
   * @param user - Current user
   * @returns Health status
   */
  @Get('health')
  @ApiOperation({
    summary: 'Check connection health',
    description: 'Verifies QuickBooks connection is active and tokens are valid',
  })
  @ApiResponse({ status: 200, description: 'Connection is healthy' })
  @ApiResponse({ status: 404, description: 'No connection found' })
  async checkHealth(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: any,
  ): Promise<{ healthy: boolean; status: string; message: string }> {
    const connection = await this.connectionRepository.findOne({
      where: { organizationId },
    });

    if (!connection) {
      return {
        healthy: false,
        status: 'NO_CONNECTION',
        message: 'No QuickBooks connection found',
      };
    }

    // Check if tokens are expired
    const now = new Date();
    const tokenExpiresAt = new Date(connection.accessTokenExpiresAt);

    if (tokenExpiresAt <= now) {
      return {
        healthy: false,
        status: 'TOKEN_EXPIRED',
        message: 'Access token has expired. Please reconnect.',
      };
    }

    // Check connection status
    if (connection.status !== 'CONNECTED') {
      return {
        healthy: false,
        status: connection.status,
        message: `Connection status is ${connection.status}`,
      };
    }

    return {
      healthy: true,
      status: 'CONNECTED',
      message: 'Connection is healthy',
    };
  }
}
