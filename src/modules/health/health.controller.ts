import { Controller, Get, HttpStatus, Res, Logger } from '@nestjs/common';
import { Response } from 'express';
import { HealthService } from './health.service';
import { HealthStatus } from './dto/health-response.dto';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth(@Res() res: Response): Promise<Response> {
    try {
      const startTime = Date.now();
      const health: HealthStatus = await this.healthService.getFullHealth();
      const responseTime = Date.now() - startTime;

      const statusCode =
        health.status === 'ok' || health.status === 'degraded' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

      this.logger.log(`Health check completed in ${responseTime}ms with status: ${health.status}`);

      return res.status(statusCode).json({
        ...health,
        responseTime: `${responseTime}ms`,
      });
    } catch (error) {
      this.logger.error('Health check failed', error);
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        message: error instanceof Error ? error.message : 'Health check failed',
      });
    }
  }

  @Get('liveness')
  async getLiveness(@Res() res: Response): Promise<Response> {
    try {
      const startTime = Date.now();
      const health: HealthStatus = await this.healthService.getLivenessHealth();
      const responseTime = Date.now() - startTime;

      this.logger.debug(`Liveness check completed in ${responseTime}ms`);

      return res.status(HttpStatus.OK).json({
        ...health,
        responseTime: `${responseTime}ms`,
      });
    } catch (error) {
      this.logger.error('Liveness check failed', error);
      // Liveness should almost never fail - if it does, something is very wrong
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        message: error instanceof Error ? error.message : 'Liveness check failed',
      });
    }
  }

  @Get('readiness')
  async getReadiness(@Res() res: Response): Promise<Response> {
    try {
      const startTime = Date.now();
      const health: HealthStatus = await this.healthService.getReadinessHealth();
      const responseTime = Date.now() - startTime;

      const statusCode =
        health.status === 'ok' || health.status === 'degraded' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

      this.logger.log(`Readiness check completed in ${responseTime}ms with status: ${health.status}`);

      return res.status(statusCode).json({
        ...health,
        responseTime: `${responseTime}ms`,
      });
    } catch (error) {
      this.logger.error('Readiness check failed', error);
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        message: error instanceof Error ? error.message : 'Readiness check failed',
      });
    }
  }
}
