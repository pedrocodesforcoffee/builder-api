const baseConfig = require('./jest.config');

module.exports = {
  ...baseConfig,
  displayName: 'integration',
  testMatch: ['<rootDir>/test/integration/**/*.spec.ts'],
  setupFilesAfterEnv: [
    '<rootDir>/test/setup/jest.setup.ts',
    '<rootDir>/test/setup/test-environment.ts',
  ],
  maxWorkers: 1, // Run sequentially for database tests
  testTimeout: 60000, // Longer timeout for integration tests with database operations
};
