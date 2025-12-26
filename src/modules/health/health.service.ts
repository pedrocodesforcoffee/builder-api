import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseHealthIndicator } from './indicators/database-health.indicator';
import { MemoryHealthIndicator } from './indicators/memory-health.indicator';
import { CpuHealthIndicator } from './indicators/cpu-health.indicator';
import { HealthStatus, HealthCheckDetails } from './dto/health-response.dto';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly version: string;
  private readonly environment: string;
  private readonly startTime: number;

  constructor(
    private readonly databaseHealth: DatabaseHealthIndicator,
    private readonly memoryHealth: MemoryHealthIndicator,
    private readonly cpuHealth: CpuHealthIndicator,
    private readonly configService: ConfigService
  ) {
    this.version = '1.0.0'; // TODO: Read from package.json
    this.environment = this.configService.get<string>('NODE_ENV', 'development');
    this.startTime = Date.now();
  }

  async getFullHealth(): Promise<HealthStatus> {
    const results = await Promise.allSettled([
      this.databaseHealth.isHealthy('database'),
      this.memoryHealth.check('memory'),
      this.cpuHealth.check('cpu'),
    ]);

    const details: { [key: string]: unknown } = {};
    const statuses: ('up' | 'degraded' | 'down')[] = [];

    // Process database health
    if (results[0].status === 'fulfilled') {
      details.database = results[0].value.database;
      const dbStatus = (results[0].value.database as HealthCheckDetails)?.status;
      statuses.push(dbStatus || 'down');
    } else {
      details.database = { status: 'down', message: 'Health check failed' };
      statuses.push('down');
    }

    // Process memory health
    if (results[1].status === 'fulfilled') {
      details.memory = results[1].value.memory;
      const memStatus = (results[1].value.memory as HealthCheckDetails)?.status;
      statuses.push(memStatus || 'down');
    } else {
      details.memory = { status: 'down', message: 'Health check failed' };
      statuses.push('down');
    }

    // Process CPU health
    if (results[2].status === 'fulfilled') {
      details.cpu = results[2].value.cpu;
      const cpuStatus = (results[2].value.cpu as HealthCheckDetails)?.status;
      statuses.push(cpuStatus || 'down');
    } else {
      details.cpu = { status: 'down', message: 'Health check failed' };
      statuses.push('down');
    }

    // Determine overall status (worst status wins)
    let overallStatus: 'ok' | 'error' | 'degraded' = 'ok';
    if (statuses.includes('down')) {
      overallStatus = 'error';
    } else if (statuses.includes('degraded')) {
      overallStatus = 'degraded';
    }

    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime,
      details,
      version: this.version,
      environment: this.environment,
    };
  }

  async getLivenessHealth(): Promise<HealthStatus> {
    // Liveness only checks if the application is running
    // No external dependencies checked
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime,
      details: {
        liveness: {
          status: 'up',
          message: 'Application is running',
        },
      },
      version: this.version,
      environment: this.environment,
    };
  }

  async getReadinessHealth(): Promise<HealthStatus> {
    // Readiness checks if the application is ready to serve traffic
    // Includes database check as critical dependency
    try {
      const dbHealth = await this.databaseHealth.isHealthy('database');
      const dbStatus = (dbHealth.database as HealthCheckDetails)?.status;

      const uptime = Math.floor((Date.now() - this.startTime) / 1000);

      if (dbStatus === 'down') {
        return {
          status: 'error',
          timestamp: new Date().toISOString(),
          uptime,
          details: {
            database: dbHealth.database,
            readiness: {
              status: 'down',
              message: 'Application not ready - database unavailable',
            },
          },
          version: this.version,
          environment: this.environment,
        };
      }

      return {
        status: dbStatus === 'degraded' ? 'degraded' : 'ok',
        timestamp: new Date().toISOString(),
        uptime,
        details: {
          database: dbHealth.database,
          readiness: {
            status: dbStatus === 'degraded' ? 'degraded' : 'up',
            message: 'Application ready to serve traffic',
          },
        },
        version: this.version,
        environment: this.environment,
      };
    } catch (error) {
      const uptime = Math.floor((Date.now() - this.startTime) / 1000);
      this.logger.error('Readiness check failed', error);

      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime,
        details: {
          readiness: {
            status: 'down',
            message: 'Application not ready',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
        version: this.version,
        environment: this.environment,
      };
    }
  }
}
