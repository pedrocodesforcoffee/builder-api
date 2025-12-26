import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

/**
 * Database test module for testing
 * This module provides a separate test database configuration
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'builder_api_test',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
      synchronize: true, // Only for tests
      dropSchema: true, // Clean database before each test run
      logging: false,
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseTestModule {}
