import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

interface DatabaseHealthDetails {
  status: 'up' | 'degraded' | 'down';
  responseTime: number;
  message: string;
  connectionPool?: {
    active: number;
    idle: number;
    total: number;
  };
}

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(DatabaseHealthIndicator.name);
  private lastCheckTime: Date | null = null;
  private lastCheckResult: HealthIndicatorResult | null = null;
  private readonly cacheTimeMs: number;
  private readonly responseTimeThreshold: number;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly configService: ConfigService
  ) {
    super();
    this.cacheTimeMs = this.configService.get<number>('HEALTH_CHECK_CACHE_TTL', 5000);
    this.responseTimeThreshold = this.configService.get<number>('HEALTH_DB_RESPONSE_TIME_THRESHOLD', 500);
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    // Return cached result if available and fresh
    if (this.lastCheckResult && this.lastCheckTime) {
      const timeSinceLastCheck = Date.now() - this.lastCheckTime.getTime();
      if (timeSinceLastCheck < this.cacheTimeMs) {
        return this.lastCheckResult;
      }
    }

    try {
      const startTime = Date.now();

      // Perform a simple query with timeout
      await Promise.race([
        this.dataSource.query('SELECT 1 as health_check'),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Query timeout')),
            this.configService.get<number>('HEALTH_CHECK_TIMEOUT', 1000)
          )
        ),
      ]);

      const responseTime = Date.now() - startTime;

      // Get connection pool statistics
      const poolStats = this.getConnectionPoolStats();

      // Determine status based on response time
      let status: 'up' | 'degraded' = 'up';
      let message = 'PostgreSQL connection healthy';

      if (responseTime > this.responseTimeThreshold) {
        status = 'degraded';
        message = `PostgreSQL connection slow (${responseTime}ms > ${this.responseTimeThreshold}ms threshold)`;
        this.logger.warn(message);
      }

      const details: DatabaseHealthDetails = {
        status,
        responseTime,
        message,
        connectionPool: poolStats,
      };

      const result = this.getStatus(key, true, details);

      // Cache the result
      this.lastCheckTime = new Date();
      this.lastCheckResult = result;

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Database health check failed: ${errorMessage}`);

      const details: DatabaseHealthDetails = {
        status: 'down',
        responseTime: 0,
        message: `Database connection failed: ${errorMessage}`,
      };

      const result = this.getStatus(key, false, details);
      throw new HealthCheckError('Database health check failed', result);
    }
  }

  private getConnectionPoolStats(): { active: number; idle: number; total: number } | undefined {
    try {
      const driver = this.dataSource.driver;
      if (driver && 'master' in driver && driver.master) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pool = (driver.master as any).pool;
        if (pool) {
          return {
            active: pool.totalCount - pool.idleCount,
            idle: pool.idleCount,
            total: pool.totalCount,
          };
        }
      }
    } catch {
      this.logger.warn('Could not retrieve connection pool statistics');
    }
    return undefined;
  }
}
