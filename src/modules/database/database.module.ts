import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseHealthService } from './database-health.service';
import { HealthCheck } from './healthcheck.entity';

/**
 * Database Module
 *
 * Configures TypeORM for the application.
 *
 * IMPORTANT: Schema Management Strategy
 * -------------------------------------
 * Currently using synchronize:true for development (no production users yet).
 * TypeORM automatically creates and updates database schema from entity definitions.
 *
 * See src/modules/financials/DATABASE-WORKFLOW.md for full documentation on:
 * - Development workflow (entity-first with synchronize: true)
 * - Production transition plan (will generate migrations before launch)
 * - When and how to generate migrations
 *
 * Before production: Set DB_SYNCHRONIZE=false and generate fresh migrations!
 */

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        database: configService.get<string>('database.name'),
        username: configService.get<string>('database.user'),
        password: configService.get<string>('database.password'),
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: configService.get<boolean>('database.synchronize'),
        logging: configService.get<boolean>('database.logging'),
        ssl: configService.get<boolean>('database.ssl') ? { rejectUnauthorized: false } : false,
        extra: {
          max: configService.get<number>('database.poolSize'),
          min: 2,
          idleTimeoutMillis: configService.get<number>('database.idleTimeout'),
          connectionTimeoutMillis: configService.get<number>('database.connectionTimeout'),
          statement_timeout: configService.get<number>('database.statementTimeout'),
        },
        retryAttempts: 3,
        retryDelay: 3000,
      }),
    }),
    TypeOrmModule.forFeature([HealthCheck]),
  ],
  providers: [DatabaseHealthService],
  exports: [TypeOrmModule, DatabaseHealthService],
})
export class DatabaseModule {}
