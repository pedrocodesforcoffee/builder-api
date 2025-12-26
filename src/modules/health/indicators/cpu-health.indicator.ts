import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import * as os from 'os';

interface CpuHealthDetails {
  status: 'up' | 'degraded' | 'down';
  usage: number;
  loadAverage: number[];
  cores: number;
  userTime: number;
  systemTime: number;
}

@Injectable()
export class CpuHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(CpuHealthIndicator.name);
  private readonly threshold: number;
  private readonly degradedThreshold: number;
  private lastCpuUsage: NodeJS.CpuUsage | null = null;
  private lastCheckTime: number | null = null;

  constructor(private readonly configService: ConfigService) {
    super();
    this.threshold = this.configService.get<number>('HEALTH_CPU_THRESHOLD', 70);
    this.degradedThreshold = this.threshold;
  }

  async check(key: string): Promise<HealthIndicatorResult> {
    const cores = os.cpus().length;
    const loadAverage = os.loadavg();

    // Calculate CPU usage percentage
    const usage = await this.calculateCpuUsage();

    // Determine status based on CPU usage and load average
    let status: 'up' | 'degraded' | 'down' = 'up';
    let isHealthy = true;

    // Check if load average is too high (compared to number of cores)
    const loadPerCore = loadAverage[0] / cores;

    if (usage > 85 || loadPerCore > 1.0) {
      status = 'down';
      isHealthy = false;
      this.logger.error(`CPU usage critical: ${usage.toFixed(2)}%, load: ${loadAverage[0].toFixed(2)}`);
    } else if (usage > this.degradedThreshold || loadPerCore > 0.7) {
      status = 'degraded';
      this.logger.warn(`CPU usage high: ${usage.toFixed(2)}%, load: ${loadAverage[0].toFixed(2)}`);
    }

    const currentCpuUsage = process.cpuUsage();

    const details: CpuHealthDetails = {
      status,
      usage: Math.round(usage * 100) / 100,
      loadAverage: loadAverage.map((load) => Math.round(load * 100) / 100),
      cores,
      userTime: currentCpuUsage.user,
      systemTime: currentCpuUsage.system,
    };

    return this.getStatus(key, isHealthy, details);
  }

  private async calculateCpuUsage(): Promise<number> {
    const currentUsage = process.cpuUsage(this.lastCpuUsage || undefined);
    const currentTime = Date.now();

    if (this.lastCheckTime) {
      const timeDiff = (currentTime - this.lastCheckTime) * 1000; // Convert to microseconds
      const totalUsage = currentUsage.user + currentUsage.system;
      const usagePercent = (totalUsage / timeDiff) * 100;

      this.lastCpuUsage = process.cpuUsage();
      this.lastCheckTime = currentTime;

      return Math.min(usagePercent, 100); // Cap at 100%
    }

    // First run - initialize and return 0
    this.lastCpuUsage = process.cpuUsage();
    this.lastCheckTime = currentTime;

    // Wait a bit and calculate
    await new Promise((resolve) => setTimeout(resolve, 100));

    const newUsage = process.cpuUsage(this.lastCpuUsage);
    const newTime = Date.now();
    const timeDiff = (newTime - currentTime) * 1000;
    const totalUsage = newUsage.user + newUsage.system;
    const usagePercent = (totalUsage / timeDiff) * 100;

    this.lastCpuUsage = process.cpuUsage();
    this.lastCheckTime = newTime;

    return Math.min(usagePercent, 100);
  }
}
