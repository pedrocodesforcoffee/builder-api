import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
  ssl: boolean;
  synchronize: boolean;
  logging: boolean;
  poolSize: number;
  idleTimeout: number;
  connectionTimeout: number;
  statementTimeout: number;
}

export default registerAs(
  'database',
  (): DatabaseConfig => ({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'builder_api_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
    poolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10),
    idleTimeout: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '10000', 10),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000', 10),
    statementTimeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000', 10),
  })
);
