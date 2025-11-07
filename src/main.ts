import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

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

  // Get port from environment variable
  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}/${apiPrefix}`);
}

bootstrap();
