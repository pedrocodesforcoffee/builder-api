import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { getLogContext } from '../middleware/correlation-id.middleware';

/**
 * Parameter decorator to inject correlation ID into controller methods
 *
 * Usage:
 * @Get()
 * async someMethod(@CorrelationId() correlationId: string) {
 *   // Use correlation ID
 * }
 */
export const CorrelationId = createParamDecorator((data: unknown, ctx: ExecutionContext): string | undefined => {
  const request = ctx.switchToHttp().getRequest();

  // Try to get from request object first
  if (request.correlationId) {
    return request.correlationId;
  }

  // Fall back to AsyncLocalStorage
  const context = getLogContext();
  return context?.correlationId;
});

/**
 * Parameter decorator to inject request ID into controller methods
 *
 * Usage:
 * @Get()
 * async someMethod(@RequestId() requestId: string) {
 *   // Use request ID
 * }
 */
export const RequestId = createParamDecorator((data: unknown, ctx: ExecutionContext): string | undefined => {
  const request = ctx.switchToHttp().getRequest();

  // Try to get from request object first
  if (request.id) {
    return request.id;
  }

  // Fall back to AsyncLocalStorage
  const context = getLogContext();
  return context?.requestId;
});
