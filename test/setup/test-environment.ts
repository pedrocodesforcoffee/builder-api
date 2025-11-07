/**
 * Test environment setup for integration and E2E tests
 * This file runs before each test file that includes it
 */

// Load test environment variables
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.test file
const envPath = path.resolve(process.cwd(), '.env.test');
dotenv.config({ path: envPath });

/**
 * Override environment variables for testing
 */
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error'; // Reduce log noise in tests
process.env.LOG_PRETTY = 'false'; // Disable pretty printing in tests

/**
 * Ensure test database settings
 */
if (!process.env.DB_DATABASE) {
  process.env.DB_DATABASE = 'builder_test';
}

// Use test database strategy from env or default to in-memory
if (!process.env.TEST_DB_STRATEGY) {
  process.env.TEST_DB_STRATEGY = 'in-memory';
}

/**
 * Test-specific configuration
 */
process.env.DB_SYNCHRONIZE = 'true'; // Auto-sync database schema in tests
process.env.DB_LOGGING = 'false'; // Disable database logging in tests
process.env.DB_DROP_SCHEMA = 'true'; // Drop schema before tests

// Disable external integrations in tests
process.env.ENABLE_EXTERNAL_SERVICES = 'false';

console.log('Test environment initialized:', {
  nodeEnv: process.env.NODE_ENV,
  database: process.env.DB_DATABASE,
  dbStrategy: process.env.TEST_DB_STRATEGY,
});
