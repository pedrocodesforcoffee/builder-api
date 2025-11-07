import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseHealthService extends HealthIndicator {
  private lastCheckTime: Date | null = null;
  private lastCheckResult: HealthIndicatorResult | null = null;
  private readonly cacheTimeMs = 5000; // 5 seconds cache

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    super();
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
        this.dataSource.query('SELECT 1'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), 1000)),
      ]);

      const responseTime = Date.now() - startTime;

      // Get connection pool statistics
      const isInitialized = this.dataSource.isInitialized;
      const driver = this.dataSource.driver;

      // Extract pool statistics if available (pg driver specific)
      let poolStats = { active: 0, idle: 0, total: 0 };
      if (driver && 'master' in driver && driver.master) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pool = (driver.master as any).pool;
        if (pool) {
          poolStats = {
            active: pool.totalCount - pool.idleCount,
            idle: pool.idleCount,
            total: pool.totalCount,
          };
        }
      }

      const result = this.getStatus(key, true, {
        status: 'connected',
        responseTime: `${responseTime}ms`,
        isInitialized,
        connectionPool: poolStats,
        lastCheck: new Date().toISOString(),
      });

      // Cache the result
      this.lastCheckTime = new Date();
      this.lastCheckResult = result;

      return result;
    } catch (error) {
      const result = this.getStatus(key, false, {
        status: 'disconnected',
        message: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date().toISOString(),
      });

      throw new HealthCheckError('Database health check failed', result);
    }
  }
}
