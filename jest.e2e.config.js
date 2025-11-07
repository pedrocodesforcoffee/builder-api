const baseConfig = require('./jest.config');

module.exports = {
  ...baseConfig,
  displayName: 'e2e',
  testMatch: ['<rootDir>/test/e2e/**/*.spec.ts'],
  setupFilesAfterEnv: [
    '<rootDir>/test/setup/jest.setup.ts',
    '<rootDir>/test/setup/test-environment.ts',
  ],
  globalSetup: '<rootDir>/test/setup/global-setup.ts',
  globalTeardown: '<rootDir>/test/setup/global-teardown.ts',
  maxWorkers: 1, // Run sequentially for full application tests
  testTimeout: 60000, // Longer timeout for E2E tests
};
