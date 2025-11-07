import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for development
  app.enableCors();

  // Set global API prefix
  const apiPrefix = process.env.API_PREFIX || 'api';
  app.setGlobalPrefix(apiPrefix);

  // Enable validation pipe globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Validate database connection on startup
  try {
    const dataSource = app.get(DataSource);
    if (dataSource.isInitialized) {
      const dbName = dataSource.options.database;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dbHost = (dataSource.options as any).host;
      logger.log(`Database connected successfully: ${dbName}@${dbHost}`);
    }
  } catch (error) {
    logger.error('Failed to connect to database', error);
    process.exit(1);
  }

  // Enable graceful shutdown hooks
  app.enableShutdownHooks();

  // Handle shutdown signals
  const gracefulShutdown = async (signal: string) => {
    logger.log(`Received ${signal}, closing application gracefully...`);
    try {
      const dataSource = app.get(DataSource);
      if (dataSource.isInitialized) {
        await dataSource.destroy();
        logger.log('Database connection closed');
      }
      await app.close();
      logger.log('Application closed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Get port from environment variable
  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}/${apiPrefix}`);
}

bootstrap().catch((error) => {
  logger.error('Failed to start application', error);
  process.exit(1);
});
