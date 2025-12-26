import { ConfigService } from '@nestjs/config';
import { createMock, DeepMocked } from 'jest-mock-extended';

/**
 * Create a mock ConfigService
 */
export function createMockConfigService(config: Record<string, any> = {}): DeepMocked<ConfigService> {
  const mock = createMock<ConfigService>();

  // Setup get method to return values from config object
  mock.get.mockImplementation((key: string, defaultValue?: any) => {
    const keys = key.split('.');
    let value: any = config;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }

    return value !== undefined ? value : defaultValue;
  });

  // Setup getOrThrow to throw if value not found
  mock.getOrThrow.mockImplementation((key: string) => {
    const value = mock.get(key);
    if (value === undefined) {
      throw new Error(`Configuration key "${key}" does not exist`);
    }
    return value;
  });

  return mock;
}

/**
 * Create a mock ConfigService with default application config
 */
export function createMockConfigServiceWithDefaults(): DeepMocked<ConfigService> {
  return createMockConfigService({
    port: 3000,
    apiPrefix: 'api',
    nodeEnv: 'test',
    database: {
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'builder_test',
      synchronize: true,
      logging: false,
    },
    logging: {
      level: 'error',
      pretty: false,
    },
  });
}

/**
 * Update mock config values
 */
export function updateMockConfig(
  configService: DeepMocked<ConfigService>,
  updates: Record<string, any>
) {
  const currentConfig = { ...updates };

  configService.get.mockImplementation((key: string, defaultValue?: any) => {
    const keys = key.split('.');
    let value: any = currentConfig;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }

    return value !== undefined ? value : defaultValue;
  });
}
