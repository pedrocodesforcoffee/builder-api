/**
 * Global teardown that runs once after all tests
 */

export default async function globalTeardown() {
  console.log('\n✅ Test suite completed\n');

  // You can add any global cleanup here, such as:
  // - Stopping test database
  // - Cleaning up test data
  // - Stopping mock servers
  // - etc.

  // Example: Close database connections
  // await closeDatabase();
}
