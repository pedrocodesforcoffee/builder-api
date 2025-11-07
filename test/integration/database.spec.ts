/**
 * Example integration test demonstrating database test infrastructure
 *
 * NOTE: pg-mem has limitations with TypeORM's synchronize feature.
 * For integration tests with database, use one of these strategies:
 *
 * 1. TEST_DB_STRATEGY=test-container (requires Docker)
 * 2. TEST_DB_STRATEGY=dedicated-db (requires PostgreSQL database)
 *
 * Example usage:
 * TEST_DB_STRATEGY=test-container npm run test:integration
 *
 * For unit tests that don't need full database functionality,
 * use repository mocks from @test/mocks/repository.mock.ts instead.
 */
import { DataSource } from 'typeorm';
import {
  TestDatabaseHelper,
  createTestDatabase,
  DatabaseStrategy,
} from '@test/helpers/test-database.helper';
import { HealthCheck } from '@modules/database/healthcheck.entity';

describe.skip('Database Integration Test (Example)', () => {
  let dbHelper: TestDatabaseHelper;
  let dataSource: DataSource;

  beforeAll(async () => {
    // Initialize test database
    dbHelper = createTestDatabase({
      strategy: getDatabaseStrategy(),
      entities: [HealthCheck],
      synchronize: true,
      logging: false,
    });

    dataSource = await dbHelper.initialize();
  });

  afterAll(async () => {
    await dbHelper.destroy();
  });

  afterEach(async () => {
    await dbHelper.cleanup();
  });

  describe('HealthCheck Entity', () => {
    it('should save and retrieve a healthcheck record', async () => {
      const repository = dbHelper.getRepository(HealthCheck);

      const healthCheck = repository.create({
        status: 'healthy',
        checkedAt: new Date(),
      });

      const saved = await repository.save(healthCheck);

      expect(saved.id).toBeDefined();
      expect(saved.status).toBe('healthy');
      expect(saved.checkedAt).toBeInstanceOf(Date);

      const found = await repository.findOne({ where: { id: saved.id } });
      expect(found).toBeDefined();
      expect(found?.status).toBe('healthy');
    });

    it('should count healthcheck records', async () => {
      const repository = dbHelper.getRepository(HealthCheck);

      await repository.save([
        { status: 'healthy', checkedAt: new Date() },
        { status: 'unhealthy', checkedAt: new Date() },
        { status: 'degraded', checkedAt: new Date() },
      ]);

      const count = await repository.count();
      expect(count).toBe(3);
    });

    it('should delete healthcheck records', async () => {
      const repository = dbHelper.getRepository(HealthCheck);

      const healthCheck = await repository.save({
        status: 'healthy',
        checkedAt: new Date(),
      });

      await repository.delete(healthCheck.id);

      const found = await repository.findOne({ where: { id: healthCheck.id } });
      expect(found).toBeNull();
    });
  });
});
