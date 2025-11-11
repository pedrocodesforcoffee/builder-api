/**
 * E2E Test Setup
 *
 * This file sets up the test environment for E2E tests including:
 * - Test database initialization
 * - Test data seeding
 * - Authentication token generation for all test users
 */

import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { setupTestApp, TestAppHelper } from '../helpers/test-app.helper';

export let testApp: INestApplication;
export let testHelper: TestAppHelper;
export let testDataSource: DataSource;

// Test user tokens (populated during setup)
export const testTokens = new Map<string, string>();
export const testUsers = new Map<string, any>();

// Test credentials from our seed data
export const TEST_CREDENTIALS = {
  admin: { email: 'admin@bobbuilder.com', password: 'Admin123!' },
  johnDoe: { email: 'john.doe@acme.com', password: 'Password123!' },
  janeSmith: { email: 'jane.smith@acme.com', password: 'Password123!' },
  robertMiller: { email: 'robert.miller@acme.com', password: 'Password123!' },
  mikeJohnson: { email: 'mike.johnson@summit.com', password: 'Password123!' },
  sarahWilliams: { email: 'sarah.williams@summit.com', password: 'Password123!' },
  lisaWilson: { email: 'lisa.wilson@summit.com', password: 'Password123!' },
  davidBrown: { email: 'david.brown@elite.com', password: 'Password123!' },
  emilyDavis: { email: 'emily.davis@elite.com', password: 'Password123!' },
  jamesMoore: { email: 'james.moore@elite.com', password: 'Password123!' },
};

/**
 * Global setup for E2E tests
 * Runs once before all test suites
 */
export async function globalSetup() {
  console.log('🔧 Setting up E2E test environment...\n');

  // Initialize test application
  const { app, helper } = await setupTestApp({
    enableLogging: false,
  });

  testApp = app;
  testHelper = helper;
  testDataSource = helper.getDataSource();

  console.log('✅ Test application initialized');

  // Login all test users and store tokens
  await loginAllTestUsers();

  console.log('✅ Test user tokens generated');
  console.log(`📊 Total test users authenticated: ${testTokens.size}\n`);
}

/**
 * Global teardown for E2E tests
 * Runs once after all test suites
 */
export async function globalTeardown() {
  console.log('\n🧹 Tearing down E2E test environment...');

  if (testHelper) {
    await testHelper.close();
  }

  // Clear test data
  testTokens.clear();
  testUsers.clear();

  console.log('✅ Test environment cleaned up\n');
}

/**
 * Login all test users and store their tokens
 */
async function loginAllTestUsers() {
  const credentials = Object.values(TEST_CREDENTIALS);

  for (const creds of credentials) {
    try {
      const response = await request(testApp.getHttpServer())
        .post('/api/auth/login')
        .send(creds)
        .expect(200);

      const { accessToken, user } = response.body;

      testTokens.set(creds.email, accessToken);
      testUsers.set(creds.email, user);

      console.log(`  ✓ Logged in: ${creds.email}`);
    } catch (error) {
      console.error(`  ✗ Failed to login: ${creds.email}`, error.message);
    }
  }
}

/**
 * Get authentication token for a test user
 */
export function getToken(email: string): string {
  const token = testTokens.get(email);
  if (!token) {
    throw new Error(`No token found for user: ${email}. Did globalSetup run?`);
  }
  return token;
}

/**
 * Get user data for a test user
 */
export function getUser(email: string): any {
  const user = testUsers.get(email);
  if (!user) {
    throw new Error(`No user data found for: ${email}. Did globalSetup run?`);
  }
  return user;
}

/**
 * Helper to make authenticated requests
 */
export function authenticatedRequest(email: string) {
  const token = getToken(email);
  return request(testApp.getHttpServer()).set('Authorization', `Bearer ${token}`);
}

/**
 * Reset specific test data (useful for specific test suites)
 */
export async function resetTestData(entities: string[]) {
  for (const entity of entities) {
    await testDataSource.query(`TRUNCATE TABLE "${entity}" RESTART IDENTITY CASCADE`);
  }
}
