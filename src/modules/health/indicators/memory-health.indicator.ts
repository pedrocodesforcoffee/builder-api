import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import * as os from 'os';

interface MemoryHealthDetails {
  status: 'up' | 'degraded' | 'down';
  rss: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  percentUsed: number;
  systemMemory: {
    total: number;
    free: number;
    used: number;
    percentUsed: number;
  };
}

@Injectable()
export class MemoryHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(MemoryHealthIndicator.name);
  private readonly threshold: number;
  private readonly degradedThreshold: number;

  constructor(private readonly configService: ConfigService) {
    super();
    this.threshold = this.configService.get<number>('HEALTH_MEMORY_THRESHOLD', 80);
    this.degradedThreshold = this.threshold; // Start degraded at threshold
  }

  async check(key: string): Promise<HealthIndicatorResult> {
    const memoryUsage = process.memoryUsage();
    const systemMemory = {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem(),
      percentUsed: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100,
    };

    // Calculate percentage of heap used
    const percentUsed = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    // Determine status
    let status: 'up' | 'degraded' | 'down' = 'up';
    let isHealthy = true;

    if (percentUsed > 90 || systemMemory.percentUsed > 90) {
      status = 'down';
      isHealthy = false;
      this.logger.error(
        `Memory usage critical: ${percentUsed.toFixed(2)}% heap, ${systemMemory.percentUsed.toFixed(2)}% system`
      );
    } else if (percentUsed > this.degradedThreshold || systemMemory.percentUsed > this.degradedThreshold) {
      status = 'degraded';
      this.logger.warn(
        `Memory usage high: ${percentUsed.toFixed(2)}% heap, ${systemMemory.percentUsed.toFixed(2)}% system`
      );
    }

    const details: MemoryHealthDetails = {
      status,
      rss: memoryUsage.rss,
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      percentUsed: Math.round(percentUsed * 100) / 100,
      systemMemory: {
        total: systemMemory.total,
        free: systemMemory.free,
        used: systemMemory.used,
        percentUsed: Math.round(systemMemory.percentUsed * 100) / 100,
      },
    };

    return this.getStatus(key, isHealthy, details);
  }
}
