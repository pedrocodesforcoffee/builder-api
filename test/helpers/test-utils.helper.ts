import { DataSource, EntityManager, Repository } from 'typeorm';

/**
 * Sleep utility for async operations
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Wait for condition to be true with timeout
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await condition();
    if (result) {
      return;
    }
    await sleep(interval);
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, initialDelay = 100, maxDelay = 5000, factor = 2 } = options;

  let lastError: Error | undefined;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxAttempts) {
        await sleep(delay);
        delay = Math.min(delay * factor, maxDelay);
      }
    }
  }

  throw new Error(
    `Operation failed after ${maxAttempts} attempts. Last error: ${lastError?.message}`
  );
}

/**
 * Clean all tables in database
 */
export async function cleanDatabase(dataSource: DataSource): Promise<void> {
  const entities = dataSource.entityMetadatas;

  // Disable foreign key checks
  await dataSource.query('SET session_replication_role = replica;');

  // Truncate all tables
  for (const entity of entities) {
    const repository = dataSource.getRepository(entity.name);
    await repository.clear();
  }

  // Re-enable foreign key checks
  await dataSource.query('SET session_replication_role = DEFAULT;');
}

/**
 * Create multiple entities in the database
 */
export async function createMany<T>(
  repository: Repository<T>,
  count: number,
  factory: (index: number) => Partial<T>
): Promise<T[]> {
  const entities = Array.from({ length: count }, (_, i) => factory(i));
  return repository.save(entities as any[]);
}

/**
 * Run in transaction and rollback
 * Useful for tests that need to verify database operations without persisting
 */
export async function runInTransactionAndRollback<T>(
  dataSource: DataSource,
  work: (entityManager: EntityManager) => Promise<T>
): Promise<T> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const result = await work(queryRunner.manager);
    await queryRunner.rollbackTransaction();
    return result;
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}

/**
 * Get random element from array
 */
export function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Get random number between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Shuffle array (Fisher-Yates algorithm)
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generate random string
 */
export function randomString(length: number, charset?: string): string {
  const chars = charset || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate random email
 */
export function randomEmail(): string {
  return `test-${randomString(8)}@example.com`;
}

/**
 * Generate random UUID v4
 */
export function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Deep clone object using JSON
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Compare objects by deep equality
 */
export function deepEqual(obj1: any, obj2: any): boolean {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}

/**
 * Create a mock logger for tests
 */
export function createMockLogger() {
  return {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    setContext: jest.fn(),
  };
}

/**
 * Suppress console output during test
 */
export function suppressConsole() {
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
  };

  beforeAll(() => {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    console.info = jest.fn();
    console.debug = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
    console.debug = originalConsole.debug;
  });
}

/**
 * Get timestamp N days ago
 */
export function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * Get timestamp N days from now
 */
export function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Format date as ISO string without milliseconds
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split('.')[0] + 'Z';
}

/**
 * Assert that a promise rejects with specific error
 */
export async function expectToReject(
  promise: Promise<any>,
  errorMatch?: string | RegExp
): Promise<void> {
  let error: Error | undefined;

  try {
    await promise;
  } catch (e) {
    error = e as Error;
  }

  expect(error).toBeDefined();

  if (errorMatch) {
    if (typeof errorMatch === 'string') {
      expect(error?.message).toContain(errorMatch);
    } else {
      expect(error?.message).toMatch(errorMatch);
    }
  }
}

/**
 * Create a deferred promise for manual resolution
 */
export function createDeferred<T>() {
  let resolve: (value: T) => void;
  let reject: (reason?: any) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    resolve: resolve!,
    reject: reject!,
  };
}
