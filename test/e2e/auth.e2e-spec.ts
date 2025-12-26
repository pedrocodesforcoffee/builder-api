/**
 * Authentication E2E Tests
 *
 * Tests all authentication endpoints including:
 * - Login
 * - Registration
 * - Token refresh
 * - Logout
 * - Session management
 */

import * as request from 'supertest';
import {
  testApp,
  TEST_CREDENTIALS,
  authenticatedRequest,
  getToken,
} from './setup';

describe('Authentication E2E', () => {
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials (John Doe)', async () => {
      const response = await request(testApp.getHttpServer())
        .post('/api/auth/login')
        .send(TEST_CREDENTIALS.johnDoe)
        .expect(200);

      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: {
          email: TEST_CREDENTIALS.johnDoe.email,
          role: expect.any(String),
        },
      });

      // Access token should be a valid JWT
      expect(response.body.accessToken.split('.')).toHaveLength(3);
    });

    it('should login with valid credentials (System Admin)', async () => {
      const response = await request(testApp.getHttpServer())
        .post('/api/auth/login')
        .send(TEST_CREDENTIALS.admin)
        .expect(200);

      expect(response.body.user.email).toBe(TEST_CREDENTIALS.admin.email);
      expect(response.body.user.role).toBe('system_admin');
    });

    it('should reject invalid password', async () => {
      await request(testApp.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: TEST_CREDENTIALS.johnDoe.email,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should reject non-existent user', async () => {
      await request(testApp.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'Password123!',
        })
        .expect(401);
    });

    it('should reject missing email', async () => {
      await request(testApp.getHttpServer())
        .post('/api/auth/login')
        .send({
          password: 'Password123!',
        })
        .expect(400);
    });

    it('should reject missing password', async () => {
      await request(testApp.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: TEST_CREDENTIALS.johnDoe.email,
        })
        .expect(400);
    });

    it('should reject invalid email format', async () => {
      await request(testApp.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'not-an-email',
          password: 'Password123!',
        })
        .expect(400);
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const timestamp = Date.now();
      const newUser = {
        firstName: 'New',
        lastName: 'User',
        email: `newuser${timestamp}@test.com`,
        password: 'NewPassword123!',
        phoneNumber: '+1-555-999-0001',
      };

      const response = await request(testApp.getHttpServer())
        .post('/api/auth/register')
        .send(newUser)
        .expect(201);

      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        user: {
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
        },
      });
    });

    it('should reject duplicate email', async () => {
      await request(testApp.getHttpServer())
        .post('/api/auth/register')
        .send({
          firstName: 'Duplicate',
          lastName: 'User',
          email: TEST_CREDENTIALS.johnDoe.email, // Already exists
          password: 'Password123!',
        })
        .expect(409);
    });

    it('should reject weak password', async () => {
      await request(testApp.getHttpServer())
        .post('/api/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: `test${Date.now()}@test.com`,
          password: '123', // Too short
        })
        .expect(400);
    });

    it('should reject missing required fields', async () => {
      await request(testApp.getHttpServer())
        .post('/api/auth/register')
        .send({
          firstName: 'Test',
          // Missing lastName, email, password
        })
        .expect(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/auth/me')
        .expect(200);

      expect(response.body).toMatchObject({
        email: TEST_CREDENTIALS.johnDoe.email,
        firstName: 'John',
        lastName: 'Doe',
        role: expect.any(String),
      });
    });

    it('should include organizations in user data', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/auth/me')
        .expect(200);

      expect(response.body).toHaveProperty('organizations');
      expect(Array.isArray(response.body.organizations)).toBe(true);
    });

    it('should reject request without token', async () => {
      await request(testApp.getHttpServer())
        .get('/api/auth/me')
        .expect(401);
    });

    it('should reject request with invalid token', async () => {
      await request(testApp.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject request with malformed token', async () => {
      await request(testApp.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat')
        .expect(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      const response = await request(testApp.getHttpServer())
        .post('/api/auth/login')
        .send(TEST_CREDENTIALS.janeSmith)
        .expect(200);

      refreshToken = response.body.refreshToken;
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(testApp.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');

      // New tokens should be different
      expect(response.body.accessToken).not.toBe(refreshToken);
    });

    it('should reject invalid refresh token', async () => {
      await request(testApp.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);
    });

    it('should reject missing refresh token', async () => {
      await request(testApp.getHttpServer())
        .post('/api/auth/refresh')
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      // Login first
      const loginResponse = await request(testApp.getHttpServer())
        .post('/api/auth/login')
        .send(TEST_CREDENTIALS.robertMiller)
        .expect(200);

      const token = loginResponse.body.accessToken;

      // Logout
      await request(testApp.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Token should be invalidated (if you have token blacklisting)
      // Note: This depends on your implementation
      // await request(testApp.getHttpServer())
      //   .get('/api/auth/me')
      //   .set('Authorization', `Bearer ${token}`)
      //   .expect(401);
    });

    it('should reject logout without token', async () => {
      await request(testApp.getHttpServer())
        .post('/api/auth/logout')
        .expect(401);
    });
  });

  describe('Session Persistence', () => {
    it('should maintain session across multiple requests', async () => {
      const token = getToken(TEST_CREDENTIALS.mikeJohnson.email);

      // Make multiple requests with same token
      await request(testApp.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(testApp.getHttpServer())
        .get('/api/organizations')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(testApp.getHttpServer())
        .get('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('Multiple Concurrent Logins', () => {
    it('should allow same user to login from multiple devices', async () => {
      // Login from "device 1"
      const response1 = await request(testApp.getHttpServer())
        .post('/api/auth/login')
        .send(TEST_CREDENTIALS.sarahWilliams)
        .expect(200);

      // Login from "device 2"
      const response2 = await request(testApp.getHttpServer())
        .post('/api/auth/login')
        .send(TEST_CREDENTIALS.sarahWilliams)
        .expect(200);

      // Both tokens should be valid
      await request(testApp.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${response1.body.accessToken}`)
        .expect(200);

      await request(testApp.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${response2.body.accessToken}`)
        .expect(200);
    });
  });

  describe('Password Security', () => {
    it('should not return password in user responses', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.lisaWilson.email)
        .get('/api/auth/me')
        .expect(200);

      expect(response.body).not.toHaveProperty('password');
    });

    it('should not return password hash in login response', async () => {
      const response = await request(testApp.getHttpServer())
        .post('/api/auth/login')
        .send(TEST_CREDENTIALS.davidBrown)
        .expect(200);

      expect(response.body.user).not.toHaveProperty('password');
    });
  });
});
