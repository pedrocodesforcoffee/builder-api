import { Global, Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { LoggingService } from './logging.service';
import { LoggingInterceptor } from './logging.interceptor';
import { RequestIdMiddleware } from './middleware/request-id.middleware';
import { CorrelationIdMiddleware } from './middleware/correlation-id.middleware';
import { createLoggerConfig } from './logging.config';

/**
 * Global logging module
 *
 * Provides:
 * - Structured logging with Pino
 * - Request ID generation and tracking
 * - Correlation ID for distributed tracing
 * - Automatic request/response logging
 * - Performance tracking
 * - Error logging with stack traces
 */
@Global()
@Module({
  imports: [
    LoggerModule.forRoot(createLoggerConfig()),
  ],
  providers: [
    LoggingService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
  exports: [LoggingService, LoggerModule],
})
export class LoggingModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Apply request ID and correlation ID middleware to all routes
    consumer.apply(RequestIdMiddleware, CorrelationIdMiddleware).forRoutes('*');
  }
}
