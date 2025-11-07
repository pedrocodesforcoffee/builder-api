/**
 * Example E2E test demonstrating test app infrastructure
 *
 * NOTE: E2E tests require a PostgreSQL database to be available.
 * Make sure you have created the test database before running E2E tests:
 *
 * ```bash
 * createdb builder_api_test
 * ```
 *
 * Or use Docker:
 * ```bash
 * docker run -d --name postgres-test -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16-alpine
 * createdb -h localhost -U postgres builder_api_test
 * ```
 *
 * Then run:
 * ```bash
 * npm run test:e2e
 * ```
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import * as request from 'supertest';

describe.skip('Health Endpoint (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/health (GET)', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('info');
      expect(response.body).toHaveProperty('details');
      expect(['ok', 'error', 'shutting_down']).toContain(response.body.status);
    });

    it('should return database health', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(response.body.info).toHaveProperty('database');
      expect(response.body.details).toHaveProperty('database');
    });

    it('should return memory health', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(response.body.info).toHaveProperty('memory');
      expect(response.body.details).toHaveProperty('memory');
    });

    it('should return disk health', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(response.body.info).toHaveProperty('disk');
      expect(response.body.details).toHaveProperty('disk');
    });
  });

  describe('/api/health/liveness (GET)', () => {
    it('should return liveness status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health/liveness')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
    });
  });

  describe('/api/health/readiness (GET)', () => {
    it('should return readiness status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health/readiness')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('info');
      expect(['ok', 'error', 'shutting_down']).toContain(response.body.status);
    });
  });
});
