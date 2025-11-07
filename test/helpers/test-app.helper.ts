import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { DataSource } from 'typeorm';
import * as request from 'supertest';

/**
 * Test application configuration
 */
export interface TestAppConfig {
  /**
   * Custom module to use instead of AppModule
   */
  module?: any;

  /**
   * Whether to enable validation pipe
   */
  enableValidation?: boolean;

  /**
   * Custom data source for database
   */
  dataSource?: DataSource;

  /**
   * Whether to enable CORS
   */
  enableCors?: boolean;

  /**
   * API prefix
   */
  apiPrefix?: string;

  /**
   * Whether to enable logging
   */
  enableLogging?: boolean;
}

/**
 * Test application helper for E2E and integration tests
 */
export class TestAppHelper {
  private app: INestApplication | null = null;
  private moduleRef: TestingModule | null = null;

  constructor(private config: TestAppConfig = {}) {}

  /**
   * Create and initialize the test application
   */
  async initialize(): Promise<INestApplication> {
    const moduleBuilder = Test.createTestingModule({
      imports: [this.config.module || AppModule],
    });

    // Override DataSource if provided
    if (this.config.dataSource) {
      moduleBuilder.overrideProvider(DataSource).useValue(this.config.dataSource);
    }

    this.moduleRef = await moduleBuilder.compile();

    this.app = this.moduleRef.createNestApplication({
      logger: this.config.enableLogging !== false ? undefined : false,
    });

    // Configure validation pipe
    if (this.config.enableValidation !== false) {
      this.app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        })
      );
    }

    // Enable CORS
    if (this.config.enableCors !== false) {
      this.app.enableCors();
    }

    // Set API prefix
    const apiPrefix = this.config.apiPrefix || process.env.API_PREFIX || 'api';
    this.app.setGlobalPrefix(apiPrefix);

    await this.app.init();

    return this.app;
  }

  /**
   * Get the application instance
   */
  getApp(): INestApplication {
    if (!this.app) {
      throw new Error('Application not initialized. Call initialize() first.');
    }
    return this.app;
  }

  /**
   * Get the module reference
   */
  getModule(): TestingModule {
    if (!this.moduleRef) {
      throw new Error('Module not initialized. Call initialize() first.');
    }
    return this.moduleRef;
  }

  /**
   * Get a service from the module
   */
  get<T>(service: any): T {
    if (!this.moduleRef) {
      throw new Error('Module not initialized. Call initialize() first.');
    }
    return this.moduleRef.get<T>(service);
  }

  /**
   * Get HTTP server for supertest
   */
  getHttpServer() {
    if (!this.app) {
      throw new Error('Application not initialized. Call initialize() first.');
    }
    return this.app.getHttpServer();
  }

  /**
   * Create a supertest request
   */
  request() {
    return request(this.getHttpServer());
  }

  /**
   * Close the application and cleanup
   */
  async close(): Promise<void> {
    if (this.app) {
      await this.app.close();
      this.app = null;
    }
    this.moduleRef = null;
  }

  /**
   * Get DataSource from the application
   */
  getDataSource(): DataSource {
    if (!this.app) {
      throw new Error('Application not initialized. Call initialize() first.');
    }
    return this.app.get(DataSource);
  }
}

/**
 * Factory function to create test application helper
 */
export function createTestApp(config: TestAppConfig = {}): TestAppHelper {
  return new TestAppHelper(config);
}

/**
 * Setup test application for E2E tests
 * This is a convenience function that initializes the app and returns both the app and helper
 */
export async function setupTestApp(
  config: TestAppConfig = {}
): Promise<{ app: INestApplication; helper: TestAppHelper }> {
  const helper = new TestAppHelper(config);
  const app = await helper.initialize();
  return { app, helper };
}

/**
 * Teardown test application
 */
export async function teardownTestApp(helper: TestAppHelper): Promise<void> {
  await helper.close();
}
