import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { DatabaseModule } from './database.module';
import { DatabaseHealthService } from './database-health.service';
import configuration from '../../config/configuration';

describe('DatabaseModule', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let healthService: DatabaseHealthService;

  beforeAll(async () => {
    // This test requires a running PostgreSQL instance
    // Skip if DB connection env vars are not set
    if (!process.env.DB_HOST && !process.env.CI) {
      console.log('Skipping database tests - no database configured');
      return;
    }

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
        }),
        DatabaseModule,
      ],
    }).compile();

    dataSource = module.get<DataSource>(DataSource);
    healthService = module.get<DatabaseHealthService>(DatabaseHealthService);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Database Connection', () => {
    it('should be defined', () => {
      if (!dataSource) {
        return; // Skip if no database
      }
      expect(dataSource).toBeDefined();
    });

    it('should be initialized', () => {
      if (!dataSource) {
        return; // Skip if no database
      }
      expect(dataSource.isInitialized).toBe(true);
    });

    it('should have correct database name', () => {
      if (!dataSource) {
        return; // Skip if no database
      }
      const dbName = dataSource.options.database;
      expect(dbName).toBeDefined();
    });
  });

  describe('Connection Pool', () => {
    it('should configure connection pool', () => {
      if (!dataSource) {
        return; // Skip if no database
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const options = dataSource.options as any;
      expect(options.extra).toBeDefined();
      expect(options.extra.max).toBeGreaterThan(0);
    });

    it('should set retry attempts', () => {
      if (!dataSource) {
        return; // Skip if no database
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const options = dataSource.options as any;
      expect(options.retryAttempts).toBe(3);
      expect(options.retryDelay).toBe(3000);
    });
  });

  describe('Database Health Check', () => {
    it('should have health service', () => {
      if (!healthService) {
        return; // Skip if no database
      }
      expect(healthService).toBeDefined();
    });

    it('should perform health check successfully', async () => {
      if (!healthService) {
        return; // Skip if no database
      }

      const result = await healthService.isHealthy('database');
      expect(result).toBeDefined();
      expect(result.database).toBeDefined();
      expect(result.database.status).toBe('up');
    });

    it('should return health check details', async () => {
      if (!healthService) {
        return; // Skip if no database
      }

      const result = await healthService.isHealthy('database');
      const details = result.database;

      expect(details.status).toBe('up');
      expect(details.responseTime).toBeDefined();
      expect(details.lastCheck).toBeDefined();
    });

    it('should cache health check results', async () => {
      if (!healthService) {
        return; // Skip if no database
      }

      const result1 = await healthService.isHealthy('database');
      const result2 = await healthService.isHealthy('database');

      // Second call should be faster (cached)
      expect(result1.database.lastCheck).toBe(result2.database.lastCheck);
    });
  });

  describe('Database Operations', () => {
    it('should execute a simple query', async () => {
      if (!dataSource) {
        return; // Skip if no database
      }

      const result = await dataSource.query('SELECT 1 as value');
      expect(result).toBeDefined();
      expect(result[0].value).toBe(1);
    });
  });
});
