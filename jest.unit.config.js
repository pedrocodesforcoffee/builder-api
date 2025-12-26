const baseConfig = require('./jest.config');

module.exports = {
  ...baseConfig,
  displayName: 'unit',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  coveragePathIgnorePatterns: ['/test/'],
  maxWorkers: '50%', // Use half of available CPU cores for faster unit tests
};
