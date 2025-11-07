import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import { CORRELATION_ID_HEADER } from '../constants/logging.constants';

export interface LogContext {
  correlationId?: string;
  requestId?: string;
  userId?: string;
  [key: string]: any;
}

/**
 * AsyncLocalStorage instance for storing request context
 * This allows accessing correlation ID and other context anywhere in the request lifecycle
 */
export const asyncLocalStorage = new AsyncLocalStorage<LogContext>();

/**
 * Middleware to manage correlation IDs for distributed tracing
 *
 * This middleware:
 * - Accepts correlation ID from incoming request headers
 * - Generates new correlation ID if not provided
 * - Stores correlation ID in AsyncLocalStorage for access throughout request
 * - Adds correlation ID to response headers
 * - Enables distributed tracing across services
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Get correlation ID from header or generate new one
    const correlationId = (req.headers[CORRELATION_ID_HEADER] as string) || randomUUID();

    // Attach to request object
    (req as any).correlationId = correlationId;

    // Add to response headers for downstream services
    res.setHeader('X-Correlation-Id', correlationId);

    // Create context with correlation ID and request ID
    const context: LogContext = {
      correlationId,
      requestId: String((req as any).id || ''),
    };

    // Store context in AsyncLocalStorage for access throughout request lifecycle
    asyncLocalStorage.run(context, () => {
      next();
    });
  }
}

/**
 * Get current log context from AsyncLocalStorage
 */
export function getLogContext(): LogContext | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * Set values in current log context
 */
export function setLogContext(values: Partial<LogContext>): void {
  const store = asyncLocalStorage.getStore();
  if (store) {
    Object.assign(store, values);
  }
}
