import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

/**
 * TypeORM DataSource Configuration
 *
 * This configuration is used by the TypeORM CLI for migration generation.
 * Note: Currently using synchronize:true in development, no active migrations.
 *
 * When ready for production:
 * 1. Create migrations folder: mkdir -p src/migrations
 * 2. Generate initial migration: npm run migration:generate -- -n InitialProductionSchema
 * 3. Set DB_SYNCHRONIZE=false in production environment
 */
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'builder_api_dev',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  entities: [
    __dirname + '/modules/**/*.entity{.ts,.js}',
    __dirname + '/workflows/**/*.entity{.ts,.js}',
  ],
  // Migrations will be stored here when generated for production
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

export default AppDataSource;
