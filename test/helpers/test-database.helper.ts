import { DataSource, DataSourceOptions } from 'typeorm';
import { newDb, IMemoryDb } from 'pg-mem';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

/**
 * Database strategy types for testing
 */
export enum DatabaseStrategy {
  IN_MEMORY = 'in-memory',
  TEST_CONTAINER = 'test-container',
  DEDICATED_DB = 'dedicated-db',
}

/**
 * Test database configuration
 */
export interface TestDatabaseConfig {
  strategy: DatabaseStrategy;
  entities?: any[];
  migrations?: string[];
  synchronize?: boolean;
  logging?: boolean;
}

/**
 * Test database helper for managing test databases
 */
export class TestDatabaseHelper {
  private dataSource: DataSource | null = null;
  private memoryDb: IMemoryDb | null = null;
  private testContainer: StartedPostgreSqlContainer | null = null;
  private strategy: DatabaseStrategy;

  constructor(private config: TestDatabaseConfig) {
    this.strategy = config.strategy;
  }

  /**
   * Initialize the test database based on strategy
   */
  async initialize(): Promise<DataSource> {
    switch (this.strategy) {
      case DatabaseStrategy.IN_MEMORY:
        return this.initializeInMemory();
      case DatabaseStrategy.TEST_CONTAINER:
        return this.initializeTestContainer();
      case DatabaseStrategy.DEDICATED_DB:
        return this.initializeDedicatedDb();
      default:
        throw new Error(`Unknown database strategy: ${this.strategy}`);
    }
  }

  /**
   * Initialize in-memory database using pg-mem
   * Fast, isolated, no external dependencies
   */
  private async initializeInMemory(): Promise<DataSource> {
    this.memoryDb = newDb({
      autoCreateForeignKeyIndices: true,
    });

    // Register required PostgreSQL functions that pg-mem doesn't support by default
    this.memoryDb.public.registerFunction({
      name: 'version',
      implementation: () => 'PostgreSQL 16.0 (pg-mem)',
    });

    this.memoryDb.public.registerFunction({
      name: 'current_database',
      implementation: () => 'test',
    });

    this.memoryDb.public.registerFunction({
      name: 'uuid_generate_v4',
      implementation: () => {
        // Simple UUID v4 generator
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      },
    });

    this.memoryDb.public.registerFunction({
      name: 'now',
      implementation: () => new Date(),
    });

    // Backup database for fast resets
    const backup = this.memoryDb.backup();

    // Create TypeORM data source from pg-mem
    this.dataSource = await this.memoryDb.adapters.createTypeormDataSource({
      type: 'postgres',
      entities: this.config.entities || [],
      synchronize: this.config.synchronize ?? true,
      logging: this.config.logging ?? false,
    });

    await this.dataSource.initialize();
    await this.dataSource.synchronize();

    return this.dataSource;
  }

  /**
   * Initialize test container database
   * Isolated PostgreSQL instance in Docker
   */
  private async initializeTestContainer(): Promise<DataSource> {
    // Start PostgreSQL container
    this.testContainer = await new PostgreSqlContainer('postgres:16-alpine')
      .withExposedPorts(5432)
      .withEnvironment({
        POSTGRES_USER: 'test',
        POSTGRES_PASSWORD: 'test',
        POSTGRES_DB: 'test_db',
      })
      .start();

    const options: DataSourceOptions = {
      type: 'postgres',
      host: this.testContainer.getHost(),
      port: this.testContainer.getPort(),
      username: this.testContainer.getUsername(),
      password: this.testContainer.getPassword(),
      database: this.testContainer.getDatabase(),
      entities: this.config.entities || [],
      migrations: this.config.migrations || [],
      synchronize: this.config.synchronize ?? true,
      logging: this.config.logging ?? false,
      dropSchema: true, // Drop schema on connection
    };

    this.dataSource = new DataSource(options);
    await this.dataSource.initialize();

    return this.dataSource;
  }

  /**
   * Initialize dedicated test database
   * Uses existing PostgreSQL instance with test database
   */
  private async initializeDedicatedDb(): Promise<DataSource> {
    const options: DataSourceOptions = {
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'builder_test',
      entities: this.config.entities || [],
      migrations: this.config.migrations || [],
      synchronize: this.config.synchronize ?? true,
      logging: this.config.logging ?? false,
      dropSchema: true, // Drop schema on connection for clean state
    };

    this.dataSource = new DataSource(options);
    await this.dataSource.initialize();

    return this.dataSource;
  }

  /**
   * Get the current data source
   */
  getDataSource(): DataSource {
    if (!this.dataSource) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.dataSource;
  }

  /**
   * Clean all data from tables (keeps schema)
   */
  async cleanup(): Promise<void> {
    if (!this.dataSource) {
      return;
    }

    const entities = this.dataSource.entityMetadatas;

    // Disable foreign key checks
    await this.dataSource.query('SET session_replication_role = replica;');

    // Truncate all tables
    for (const entity of entities) {
      const repository = this.dataSource.getRepository(entity.name);
      await repository.clear();
    }

    // Re-enable foreign key checks
    await this.dataSource.query('SET session_replication_role = DEFAULT;');
  }

  /**
   * Reset database to initial state
   */
  async reset(): Promise<void> {
    if (!this.dataSource) {
      return;
    }

    if (this.strategy === DatabaseStrategy.IN_MEMORY && this.memoryDb) {
      // For in-memory, we can use backup/restore
      const backup = this.memoryDb.backup();
      backup.restore();
    } else {
      // For other strategies, drop and recreate schema
      await this.dataSource.dropDatabase();
      await this.dataSource.synchronize();
    }
  }

  /**
   * Destroy the database connection and cleanup resources
   */
  async destroy(): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.dataSource.destroy();
      this.dataSource = null;
    }

    if (this.testContainer) {
      await this.testContainer.stop();
      this.testContainer = null;
    }

    this.memoryDb = null;
  }

  /**
   * Execute raw SQL query
   */
  async query(sql: string, parameters?: any[]): Promise<any> {
    if (!this.dataSource) {
      throw new Error('Database not initialized');
    }
    return this.dataSource.query(sql, parameters);
  }

  /**
   * Get repository for entity
   */
  getRepository<T>(entity: new () => T) {
    if (!this.dataSource) {
      throw new Error('Database not initialized');
    }
    return this.dataSource.getRepository(entity);
  }

  /**
   * Run in transaction
   */
  async runInTransaction<T>(work: (entityManager: any) => Promise<T>): Promise<T> {
    if (!this.dataSource) {
      throw new Error('Database not initialized');
    }
    return this.dataSource.transaction(work);
  }
}

/**
 * Factory function to create test database helper
 */
export function createTestDatabase(config: TestDatabaseConfig): TestDatabaseHelper {
  return new TestDatabaseHelper(config);
}

/**
 * Get database strategy from environment variable
 */
export function getDatabaseStrategy(): DatabaseStrategy {
  const strategy = process.env.TEST_DB_STRATEGY;

  switch (strategy) {
    case 'in-memory':
      return DatabaseStrategy.IN_MEMORY;
    case 'test-container':
      return DatabaseStrategy.TEST_CONTAINER;
    case 'dedicated-db':
      return DatabaseStrategy.DEDICATED_DB;
    default:
      // Default to in-memory for unit tests
      return DatabaseStrategy.IN_MEMORY;
  }
}
