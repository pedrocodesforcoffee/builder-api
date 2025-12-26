import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QBConnection } from '../entities';
import { QuickBooksAuthService } from '../services';

/**
 * QuickBooks Token Refresh Processor
 *
 * Background processor for proactive OAuth token refresh.
 * Handles:
 * - Checking for tokens expiring soon
 * - Automatically refreshing tokens before expiration
 * - Handling refresh failures
 *
 * Queue: quickbooks-token-refresh
 * Jobs: check-tokens, refresh-token
 *
 * QuickBooks access tokens expire after 1 hour.
 * Refresh tokens expire after 100 days.
 *
 * This processor:
 * 1. Runs periodically (e.g., every 30 minutes)
 * 2. Finds connections with tokens expiring in next 15 minutes
 * 3. Proactively refreshes those tokens
 * 4. Emits events on success/failure
 */
@Processor('quickbooks-token-refresh')
export class QuickBooksTokenRefreshProcessor {
  private readonly logger = new Logger(QuickBooksTokenRefreshProcessor.name);

  // Refresh tokens if they expire within this many minutes
  private readonly REFRESH_THRESHOLD_MINUTES = 15;

  constructor(
    @InjectRepository(QBConnection)
    private readonly connectionRepository: Repository<QBConnection>,
    private readonly authService: QuickBooksAuthService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`Processing token refresh job ${job.id} of type ${job.name}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(`Token refresh job ${job.id} completed: ${JSON.stringify(result)}`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Token refresh job ${job.id} failed: ${error.message}`, error.stack);
  }

  /**
   * Check for tokens expiring soon and refresh them
   */
  @Process('check-tokens')
  async handleTokenCheck(job: Job) {
    this.logger.log('Checking for tokens expiring soon...');

    try {
      // Calculate threshold time
      const thresholdTime = new Date();
      thresholdTime.setMinutes(thresholdTime.getMinutes() + this.REFRESH_THRESHOLD_MINUTES);

      // Find connections with access tokens expiring soon
      const connections = await this.connectionRepository.find({
        where: {
          isActive: true,
          accessTokenExpiresAt: LessThan(thresholdTime),
        },
      });

      this.logger.log(`Found ${connections.length} connections with tokens expiring soon`);

      const results = {
        checked: connections.length,
        refreshed: 0,
        failed: 0,
      };

      for (const connection of connections) {
        try {
          this.logger.log(
            `Refreshing token for organization ${connection.organizationId} (expires at ${connection.accessTokenExpiresAt})`,
          );

          // Refresh the token
          await this.authService.refreshAccessToken(connection.organizationId);

          results.refreshed++;

          // Emit success event
          this.eventEmitter.emit('quickbooks.token.refreshed', {
            organizationId: connection.organizationId,
            realmId: connection.qbRealmId,
          });

          this.logger.log(`Successfully refreshed token for organization ${connection.organizationId}`);
        } catch (error: any) {
          this.logger.error(
            `Failed to refresh token for organization ${connection.organizationId}: ${error.message}`,
            error.stack,
          );

          results.failed++;

          // Emit failure event
          this.eventEmitter.emit('quickbooks.token.refresh.failed', {
            organizationId: connection.organizationId,
            realmId: connection.qbRealmId,
            error: error.message,
          });

          // If refresh token is expired or invalid, mark connection as inactive
          if (
            error.message?.includes('invalid_grant') ||
            error.message?.includes('refresh token') ||
            error.status === 401
          ) {
            this.logger.warn(
              `Refresh token invalid for organization ${connection.organizationId}, marking connection as inactive`,
            );

            connection.isActive = false;
            connection.errorMessage = 'Refresh token expired or invalid. Re-authentication required.';
            await this.connectionRepository.save(connection);

            // Emit disconnection event
            this.eventEmitter.emit('quickbooks.disconnected', {
              organizationId: connection.organizationId,
              realmId: connection.qbRealmId,
              reason: 'token_expired',
            });
          }
        }
      }

      this.logger.log(`Token check completed: ${JSON.stringify(results)}`);

      return results;
    } catch (error: any) {
      this.logger.error(`Token check failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Refresh a specific token
   */
  @Process('refresh-token')
  async handleTokenRefresh(job: Job<{
    organizationId: string;
  }>) {
    const { organizationId } = job.data;

    this.logger.log(`Refreshing token for organization ${organizationId}`);

    try {
      // Refresh the token
      const connection = await this.authService.refreshAccessToken(organizationId);

      // Emit success event
      this.eventEmitter.emit('quickbooks.token.refreshed', {
        organizationId,
        realmId: connection.qbRealmId,
      });

      this.logger.log(`Successfully refreshed token for organization ${organizationId}`);

      return {
        success: true,
        organizationId,
        expiresAt: connection.accessTokenExpiresAt,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to refresh token for organization ${organizationId}: ${error.message}`,
        error.stack,
      );

      // Emit failure event
      this.eventEmitter.emit('quickbooks.token.refresh.failed', {
        organizationId,
        error: error.message,
      });

      // If refresh token is expired or invalid, mark connection as inactive
      if (
        error.message?.includes('invalid_grant') ||
        error.message?.includes('refresh token') ||
        error.status === 401
      ) {
        const connection = await this.connectionRepository.findOne({
          where: { organizationId },
        });

        if (connection) {
          this.logger.warn(
            `Refresh token invalid for organization ${organizationId}, marking connection as inactive`,
          );

          connection.isActive = false;
          connection.errorMessage = 'Refresh token expired or invalid. Re-authentication required.';
          await this.connectionRepository.save(connection);

          // Emit disconnection event
          this.eventEmitter.emit('quickbooks.disconnected', {
            organizationId,
            realmId: connection.qbRealmId,
            reason: 'token_expired',
          });
        }
      }

      throw error;
    }
  }
}
