/**
 * Global setup that runs once before all tests
 */

export default async function globalSetup() {
  console.log('\n🧪 Starting test suite...\n');

  // Set test environment
  process.env.NODE_ENV = 'test';

  // You can add any global setup here, such as:
  // - Starting test database
  // - Seeding initial data
  // - Starting mock servers
  // - etc.

  // Example: Wait for database to be ready
  // await waitForDatabase();
}
