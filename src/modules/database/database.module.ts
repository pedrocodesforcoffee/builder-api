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
 * See src/modules/financials/DATABASE-WORKFLOW.md for full documentation on:
 * - Development workflow (synchronize: true)
 * - Production transition plan (migrations)
 * - When and how to generate migrations
 *
 * Before production: Set DB_SYNCHRONIZE=false and generate migrations!
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
        migrations: [__dirname + '/../../migrations/*{.ts,.js}'],
        migrationsTableName: 'migrations',
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
