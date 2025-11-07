import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  // Create app with buffered logs until custom logger is ready
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Use Pino logger
  app.useLogger(app.get(Logger));

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
      // Database connection logged by DatabaseModule
    }
  } catch (error) {
    console.error('Failed to connect to database', error);
    process.exit(1);
  }

  // Enable graceful shutdown hooks
  app.enableShutdownHooks();

  // Handle shutdown signals
  const gracefulShutdown = async (signal: string) => {
    console.log(`Received ${signal}, closing application gracefully...`);
    try {
      const dataSource = app.get(DataSource);
      if (dataSource.isInitialized) {
        await dataSource.destroy();
        console.log('Database connection closed');
      }
      await app.close();
      console.log('Application closed successfully');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Get port from environment variable
  const port = process.env.PORT || 3000;
  await app.listen(port);

  // Application startup is logged by Pino logger
}

bootstrap().catch((error) => {
  console.error('Failed to start application', error);
  process.exit(1);
});
