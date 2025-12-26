import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { DatabaseHealthIndicator } from './indicators/database-health.indicator';
import { MemoryHealthIndicator } from './indicators/memory-health.indicator';
import { CpuHealthIndicator } from './indicators/cpu-health.indicator';
import { HealthStatus } from './dto/health-response.dto';
import configuration from '../../config/configuration';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: HealthService;

  const mockResponse = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
        }),
      ],
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: DatabaseHealthIndicator,
          useValue: {
            isHealthy: jest.fn(),
          },
        },
        {
          provide: MemoryHealthIndicator,
          useValue: {
            check: jest.fn(),
          },
        },
        {
          provide: CpuHealthIndicator,
          useValue: {
            check: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /health', () => {
    it('should return 200 when all systems are healthy', async () => {
      const mockHealthStatus: HealthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: 100,
        details: {
          database: { status: 'up' },
          memory: { status: 'up' },
          cpu: { status: 'up' },
        },
        version: '1.0.0',
        environment: 'test',
      };

      jest.spyOn(healthService, 'getFullHealth').mockResolvedValue(mockHealthStatus);

      const res = mockResponse();
      await controller.getHealth(res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ok',
          details: expect.any(Object),
        })
      );
    });

    it('should return 200 when system is degraded', async () => {
      const mockHealthStatus: HealthStatus = {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        uptime: 100,
        details: {
          database: { status: 'degraded' },
          memory: { status: 'up' },
          cpu: { status: 'up' },
        },
        version: '1.0.0',
        environment: 'test',
      };

      jest.spyOn(healthService, 'getFullHealth').mockResolvedValue(mockHealthStatus);

      const res = mockResponse();
      await controller.getHealth(res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('should return 503 when system is down', async () => {
      const mockHealthStatus: HealthStatus = {
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: 100,
        details: {
          database: { status: 'down' },
          memory: { status: 'up' },
          cpu: { status: 'up' },
        },
        version: '1.0.0',
        environment: 'test',
      };

      jest.spyOn(healthService, 'getFullHealth').mockResolvedValue(mockHealthStatus);

      const res = mockResponse();
      await controller.getHealth(res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    });

    it('should return response in less than 100ms', async () => {
      const mockHealthStatus: HealthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: 100,
        details: {},
        version: '1.0.0',
        environment: 'test',
      };

      jest.spyOn(healthService, 'getFullHealth').mockResolvedValue(mockHealthStatus);

      const res = mockResponse();
      const startTime = Date.now();
      await controller.getHealth(res);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
    });
  });

  describe('GET /health/liveness', () => {
    it('should always return 200 when application is running', async () => {
      const mockHealthStatus: HealthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: 100,
        details: {
          liveness: { status: 'up' },
        },
        version: '1.0.0',
        environment: 'test',
      };

      jest.spyOn(healthService, 'getLivenessHealth').mockResolvedValue(mockHealthStatus);

      const res = mockResponse();
      await controller.getLiveness(res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ok',
        })
      );
    });

    it('should return response in less than 50ms', async () => {
      const mockHealthStatus: HealthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: 100,
        details: {},
        version: '1.0.0',
        environment: 'test',
      };

      jest.spyOn(healthService, 'getLivenessHealth').mockResolvedValue(mockHealthStatus);

      const res = mockResponse();
      const startTime = Date.now();
      await controller.getLiveness(res);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50);
    });
  });

  describe('GET /health/readiness', () => {
    it('should return 200 when database is available', async () => {
      const mockHealthStatus: HealthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: 100,
        details: {
          database: { status: 'up' },
          readiness: { status: 'up' },
        },
        version: '1.0.0',
        environment: 'test',
      };

      jest.spyOn(healthService, 'getReadinessHealth').mockResolvedValue(mockHealthStatus);

      const res = mockResponse();
      await controller.getReadiness(res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('should return 503 when database is unavailable', async () => {
      const mockHealthStatus: HealthStatus = {
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: 100,
        details: {
          database: { status: 'down' },
          readiness: { status: 'down' },
        },
        version: '1.0.0',
        environment: 'test',
      };

      jest.spyOn(healthService, 'getReadinessHealth').mockResolvedValue(mockHealthStatus);

      const res = mockResponse();
      await controller.getReadiness(res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    });

    it('should return 200 when database is degraded', async () => {
      const mockHealthStatus: HealthStatus = {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        uptime: 100,
        details: {
          database: { status: 'degraded' },
          readiness: { status: 'degraded' },
        },
        version: '1.0.0',
        environment: 'test',
      };

      jest.spyOn(healthService, 'getReadinessHealth').mockResolvedValue(mockHealthStatus);

      const res = mockResponse();
      await controller.getReadiness(res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    });
  });
});
