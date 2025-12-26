import { LoggingService } from '../logging.service';

/**
 * Method decorator to automatically log method entry, exit, and execution time
 *
 * Usage:
 * @Log()
 * async someMethod(param1: string) {
 *   // method implementation
 * }
 *
 * This will log:
 * - Method entry with parameters
 * - Method exit with return value
 * - Execution time
 * - Any errors thrown
 */
export function Log(): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const methodName = String(propertyKey);

    descriptor.value = async function (...args: any[]) {
      // Get or create logger instance
      const logger: LoggingService = (this as any).logger || new LoggingService((this as any).pinoLogger);

      const startTime = Date.now();

      // Log method entry
      logger.debug(`${className}.${methodName} - Entry`, {
        className,
        methodName,
        arguments: sanitizeArguments(args),
      });

      try {
        // Execute original method
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        // Log method exit
        logger.debug(`${className}.${methodName} - Exit`, {
          className,
          methodName,
          duration,
          hasResult: result !== undefined,
        });

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        // Log error
        logger.error(`${className}.${methodName} - Error`, error as Error, {
          className,
          methodName,
          duration,
          arguments: sanitizeArguments(args),
        });

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Sanitize arguments to remove sensitive data and limit size
 */
function sanitizeArguments(args: any[]): any[] {
  const maxArgLength = 100;

  return args.map((arg) => {
    if (arg === null || arg === undefined) {
      return arg;
    }

    if (typeof arg === 'object') {
      const sanitized = { ...arg };

      // Remove sensitive fields
      const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];
      sensitiveFields.forEach((field) => {
        if (field in sanitized) {
          sanitized[field] = '[REDACTED]';
        }
      });

      const stringified = JSON.stringify(sanitized);
      if (stringified.length > maxArgLength) {
        return stringified.substring(0, maxArgLength) + '...';
      }
      return sanitized;
    }

    if (typeof arg === 'string' && arg.length > maxArgLength) {
      return arg.substring(0, maxArgLength) + '...';
    }

    return arg;
  });
}
