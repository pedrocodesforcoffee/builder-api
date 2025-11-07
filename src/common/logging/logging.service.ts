import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Request, Response } from 'express';
import { getLogContext } from './middleware/correlation-id.middleware';
import { PERFORMANCE_THRESHOLDS } from './constants/logging.constants';

export interface LogContext {
  correlationId?: string;
  requestId?: string;
  userId?: string;
  method?: string;
  url?: string;
  duration?: number;
  [key: string]: any;
}

/**
 * Custom logging service that wraps Pino logger
 * Provides structured logging with automatic context enrichment
 */
@Injectable({ scope: Scope.TRANSIENT })
export class LoggingService implements LoggerService {
  constructor(@InjectPinoLogger(LoggingService.name) private readonly logger: PinoLogger) {}

  /**
   * Enhance context with request information from AsyncLocalStorage
   */
  private enrichContext(context?: LogContext): LogContext {
    const asyncContext = getLogContext();
    return {
      ...asyncContext,
      ...context,
    };
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    this.logger.debug(this.enrichContext(context), message);
  }

  /**
   * Log info message
   */
  log(message: string, context?: LogContext): void {
    this.info(message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.logger.info(this.enrichContext(context), message);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.logger.warn(this.enrichContext(context), message);
  }

  /**
   * Log error message with optional error object
   */
  error(message: string, error?: Error | string, context?: LogContext): void {
    if (error instanceof Error) {
      this.logger.error(
        {
          ...this.enrichContext(context),
          err: error,
        },
        message
      );
    } else if (typeof error === 'string') {
      this.logger.error(
        {
          ...this.enrichContext(context),
          errorTrace: error,
        },
        message
      );
    } else {
      this.logger.error(this.enrichContext(context), message);
    }
  }

  /**
   * Log fatal message
   */
  fatal(message: string, error?: Error, context?: LogContext): void {
    this.logger.fatal(
      {
        ...this.enrichContext(context),
        err: error,
      },
      message
    );
  }

  /**
   * Log incoming HTTP request
   */
  logRequest(req: Request, context?: LogContext): void {
    this.info('Incoming request', {
      ...context,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  /**
   * Log HTTP response with duration
   */
  logResponse(req: Request, res: Response, duration: number, context?: LogContext): void {
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    const logContext = {
      ...context,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      contentLength: res.get('content-length'),
    };

    if (logLevel === 'error') {
      this.error('Request completed with error', undefined, logContext);
    } else if (logLevel === 'warn') {
      this.warn('Request completed with client error', logContext);
    } else {
      this.info('Request completed', logContext);
    }
  }

  /**
   * Log database query with execution time
   */
  logDatabaseQuery(query: string, parameters: any[], duration: number, context?: LogContext): void {
    const logContext = {
      ...context,
      query: query.substring(0, 200), // Truncate long queries
      parameterCount: parameters?.length || 0,
      duration,
    };

    if (duration > PERFORMANCE_THRESHOLDS.slowQuery) {
      this.warn('Slow database query detected', {
        ...logContext,
        threshold: PERFORMANCE_THRESHOLDS.slowQuery,
      });
    } else {
      this.debug('Database query executed', logContext);
    }
  }

  /**
   * Log outgoing HTTP call
   */
  logHttpCall(url: string, method: string, status: number, duration: number, context?: LogContext): void {
    const logContext = {
      ...context,
      url,
      method,
      status,
      duration,
    };

    if (duration > PERFORMANCE_THRESHOLDS.slowHttp) {
      this.warn('Slow HTTP request detected', {
        ...logContext,
        threshold: PERFORMANCE_THRESHOLDS.slowHttp,
      });
    } else if (status >= 500) {
      this.error('HTTP request failed', undefined, logContext);
    } else if (status >= 400) {
      this.warn('HTTP request returned client error', logContext);
    } else {
      this.debug('HTTP request completed', logContext);
    }
  }

  /**
   * Log business event
   */
  logBusinessEvent(event: string, data: any, context?: LogContext): void {
    this.info(`Business event: ${event}`, {
      ...context,
      event,
      data,
    });
  }

  /**
   * Log performance metrics
   */
  logPerformance(operation: string, duration: number, metadata?: any, context?: LogContext): void {
    this.debug(`Performance: ${operation}`, {
      ...context,
      operation,
      duration,
      ...metadata,
    });
  }

  /**
   * Start a timer for performance tracking
   * Returns a function that when called, returns elapsed time in milliseconds
   */
  startTimer(): () => number {
    const startTime = Date.now();
    return () => Date.now() - startTime;
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): LoggingService {
    const childLogger = new LoggingService(this.logger);
    // Store the additional context
    (childLogger as any).additionalContext = context;
    return childLogger;
  }

  /**
   * Override enrichContext to include additional context from child logger
   */
  private get additionalContext(): LogContext {
    return (this as any).additionalContext || {};
  }
}
