import { LoggerOptions } from 'pino';
import { Params } from 'nestjs-pino';
import { LOG_LEVELS, SENSITIVE_FIELDS } from './constants/logging.constants';

/**
 * Redact sensitive headers from request/response
 */
function redactHeaders(headers: Record<string, any>): Record<string, any> {
  if (!headers) return {};

  const redacted = { ...headers };
  SENSITIVE_FIELDS.forEach((field) => {
    const lowerField = field.toLowerCase();
    Object.keys(redacted).forEach((key) => {
      if (key.toLowerCase() === lowerField || key.toLowerCase().includes(lowerField)) {
        redacted[key] = '[REDACTED]';
      }
    });
  });

  return redacted;
}

/**
 * Create Pino logger configuration based on environment
 */
export function createLoggerConfig(): Params {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const logLevel = process.env.LOG_LEVEL || LOG_LEVELS[nodeEnv as keyof typeof LOG_LEVELS] || 'info';
  const prettyPrint = process.env.LOG_PRETTY === 'true' || nodeEnv === 'development';

  const pinoConfig: LoggerOptions = {
    level: logLevel,
    formatters: {
      level: (label) => ({ level: label }),
      bindings: (bindings) => ({
        pid: bindings.pid,
        hostname: process.env.LOG_INCLUDE_HOSTNAME === 'true' ? bindings.hostname : undefined,
        service: 'builder-api',
        version: process.env.npm_package_version || '1.0.0',
        environment: nodeEnv,
      }),
    },
    serializers: {
      req: (req: any) => {
        if (!req) return req;
        return {
          id: req.id,
          method: req.method,
          url: req.url,
          query: req.query,
          params: req.params,
          headers: process.env.LOG_REDACT_SENSITIVE !== 'false' ? redactHeaders(req.headers) : req.headers,
          correlationId: req.correlationId,
          remoteAddress: req.remoteAddress,
          remotePort: req.remotePort,
        };
      },
      res: (res: any) => {
        if (!res) return res;
        return {
          statusCode: res.statusCode,
          headers: process.env.LOG_REDACT_SENSITIVE !== 'false' ? redactHeaders(res.getHeaders?.() || {}) : res.getHeaders?.() || {},
        };
      },
      err: (err: any) => {
        if (!err) return err;
        return {
          type: err.constructor?.name,
          message: err.message,
          stack: err.stack,
          code: err.code,
          ...err,
        };
      },
    },
    redact: {
      paths: SENSITIVE_FIELDS.map((field) => `*.${field}`).concat([
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["set-cookie"]',
        'req.headers["x-api-key"]',
      ]),
      censor: '[REDACTED]',
    },
    timestamp: process.env.LOG_INCLUDE_TIMESTAMP !== 'false' ? () => `,"timestamp":"${new Date().toISOString()}"` : false,
  };

  // Add pretty printing for development
  if (prettyPrint) {
    pinoConfig.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        singleLine: false,
        messageFormat: '{msg}',
      },
    };
  }

  return {
    pinoHttp: pinoConfig,
  };
}
