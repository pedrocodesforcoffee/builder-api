import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { REQUEST_ID_HEADER } from '../constants/logging.constants';

/**
 * Middleware to generate and attach request IDs to incoming requests
 *
 * This middleware:
 * - Generates a unique UUID for each request
 * - Uses existing request ID from header if provided
 * - Adds request ID to request object
 * - Adds request ID to response headers
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Use existing request ID from header or generate new one
    const requestId = (req.headers[REQUEST_ID_HEADER] as string) || randomUUID();

    // Attach to request object
    req['id'] = requestId;

    // Add to response headers
    res.setHeader('X-Request-Id', requestId);

    next();
  }
}
