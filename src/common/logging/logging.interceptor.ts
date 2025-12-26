import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { LoggingService } from './logging.service';
import { SKIP_LOGGING_PATHS } from './constants/logging.constants';

/**
 * Global interceptor for logging HTTP requests and responses
 *
 * Features:
 * - Logs all incoming requests
 * - Logs all outgoing responses with duration
 * - Logs errors with full stack traces
 * - Calculates request/response times
 * - Skips health check endpoints (configurable)
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // Skip logging for certain paths (e.g., health checks)
    const skipLogging =
      process.env.LOG_SKIP_HEALTH_CHECK === 'true' &&
      SKIP_LOGGING_PATHS.some((path) => request.url.includes(path));

    if (skipLogging) {
      return next.handle();
    }

    const startTime = Date.now();

    // Log incoming request
    this.logger.logRequest(request, {
      correlationId: (request as any).correlationId,
      requestId: String((request as any).id || ''),
    });

    return next.handle().pipe(
      tap(() => {
        // Log successful response
        const duration = Date.now() - startTime;
        this.logger.logResponse(request, response, duration, {
          correlationId: (request as any).correlationId,
          requestId: String((request as any).id || ''),
        });
      }),
      catchError((error) => {
        // Log error
        const duration = Date.now() - startTime;

        this.logger.error(
          'Request failed with error',
          error,
          {
            correlationId: (request as any).correlationId,
            requestId: String((request as any).id || ''),
            method: request.method,
            url: request.url,
            statusCode: error?.status || 500,
            duration,
          }
        );

        return throwError(() => error);
      })
    );
  }
}
