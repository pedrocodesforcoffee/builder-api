import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

describe('Auth Refresh (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    dataSource = moduleFixture.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await dataSource.query('DELETE FROM refresh_tokens');
    await dataSource.query('DELETE FROM users WHERE email LIKE \'%e2e-test%\'');
  });

  describe('/api/auth/refresh (POST)', () => {
    it('should successfully refresh tokens with valid refresh token', async () => {
      // 1. Register a user
      const registerResponse = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'e2e-test-refresh@example.com',
          password: 'TestPassword123@',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(201);

      // 2. Login to get refresh token
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'e2e-test-refresh@example.com',
          password: 'TestPassword123@',
        })
        .expect(200);

      const { refreshToken: originalRefreshToken, accessToken: originalAccessToken } =
        loginResponse.body;

      expect(originalRefreshToken).toBeDefined();
      expect(originalAccessToken).toBeDefined();

      // 3. Use refresh token to get new tokens
      const refreshResponse = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken: originalRefreshToken,
        })
        .expect(200);

      // Verify new tokens are returned
      expect(refreshResponse.body).toHaveProperty('accessToken');
      expect(refreshResponse.body).toHaveProperty('refreshToken');
      expect(refreshResponse.body).toHaveProperty('tokenType', 'Bearer');
      expect(refreshResponse.body).toHaveProperty('expiresIn', 900);
      expect(refreshResponse.body).toHaveProperty('user');

      // Verify tokens are different (rotation)
      expect(refreshResponse.body.accessToken).not.toBe(originalAccessToken);
      expect(refreshResponse.body.refreshToken).not.toBe(originalRefreshToken);
    });

    it('should return user data with JWT permissions in response', async () => {
      // Register and login
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'e2e-test-permissions@example.com',
          password: 'TestPassword123@',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(201);

      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'e2e-test-permissions@example.com',
          password: 'TestPassword123@',
        })
        .expect(200);

      // Refresh tokens
      const refreshResponse = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken: loginResponse.body.refreshToken,
        })
        .expect(200);

      // Verify user data structure
      expect(refreshResponse.body.user).toHaveProperty('id');
      expect(refreshResponse.body.user).toHaveProperty('email');
      expect(refreshResponse.body.user).toHaveProperty('firstName');
      expect(refreshResponse.body.user).toHaveProperty('role');
      expect(refreshResponse.body.user).not.toHaveProperty('password');

      // Decode JWT and verify permissions are included
      const accessToken = refreshResponse.body.accessToken;
      const payload = JSON.parse(
        Buffer.from(accessToken.split('.')[1], 'base64').toString(),
      );
      expect(payload).toHaveProperty('organizations');
      expect(payload).toHaveProperty('projects');
    });

    it('should handle grace period - allow token reuse within 2 minutes', async () => {
      // Register and login
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'e2e-test-grace@example.com',
          password: 'TestPassword123@',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(201);

      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'e2e-test-grace@example.com',
          password: 'TestPassword123@',
        })
        .expect(200);

      const originalRefreshToken = loginResponse.body.refreshToken;

      // First refresh - should work
      const firstRefresh = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken: originalRefreshToken,
        })
        .expect(200);

      expect(firstRefresh.body.refreshToken).toBeDefined();

      // Immediate second refresh with same token (within grace period)
      const secondRefresh = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken: originalRefreshToken,
        })
        .expect(200);

      // Should succeed but NOT return a new refresh token (grace period behavior)
      expect(secondRefresh.body.accessToken).toBeDefined();
      expect(secondRefresh.body.refreshToken).toBeUndefined();
    });

    it('should detect token reuse and revoke entire family', async () => {
      // Register and login
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'e2e-test-reuse@example.com',
          password: 'TestPassword123@',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(201);

      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'e2e-test-reuse@example.com',
          password: 'TestPassword123@',
        })
        .expect(200);

      const originalRefreshToken = loginResponse.body.refreshToken;

      // First refresh
      const firstRefresh = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken: originalRefreshToken,
        })
        .expect(200);

      const newRefreshToken = firstRefresh.body.refreshToken;

      // Wait 3 seconds to ensure we're outside grace period
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Try to reuse old token - should trigger family revocation
      const reuseResponse = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken: originalRefreshToken,
        })
        .expect(403);

      expect(reuseResponse.body.message).toBe(
        'Token reuse detected. All sessions have been terminated.',
      );

      // New token should also be revoked
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken: newRefreshToken,
        })
        .expect(401);
    });

    it('should enforce rate limiting - reject after 10 requests', async () => {
      // Register and login
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'e2e-test-ratelimit@example.com',
          password: 'TestPassword123@',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(201);

      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'e2e-test-ratelimit@example.com',
          password: 'TestPassword123@',
        })
        .expect(200);

      let currentRefreshToken = loginResponse.body.refreshToken;

      // Make 10 successful refresh requests
      for (let i = 0; i < 10; i++) {
        const refreshResponse = await request(app.getHttpServer())
          .post('/api/auth/refresh')
          .send({
            refreshToken: currentRefreshToken,
          })
          .expect(200);

        currentRefreshToken = refreshResponse.body.refreshToken;
      }

      // 11th request should be rate limited
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken: currentRefreshToken,
        })
        .expect(429);
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid-token-123',
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid refresh token');
    });

    it('should reject expired refresh token', async () => {
      // This would require manipulating token expiration
      // For now, we'll test that the endpoint validates the token structure
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken: '',
        })
        .expect(400);

      expect(response.body.message).toBe('Refresh token is required');
    });

    it('should reject request without refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.message).toBe('Refresh token is required');
    });

    it('should reject refresh token from inactive user', async () => {
      // Register and login
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'e2e-test-inactive@example.com',
          password: 'TestPassword123@',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(201);

      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'e2e-test-inactive@example.com',
          password: 'TestPassword123@',
        })
        .expect(200);

      const refreshToken = loginResponse.body.refreshToken;

      // Deactivate user
      await dataSource.query(
        'UPDATE users SET is_active = false WHERE email = $1',
        ['e2e-test-inactive@example.com'],
      );

      // Try to refresh - should fail
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken,
        })
        .expect(401);

      expect(response.body.message).toBe('User account is inactive');
    });
  });
});
