export const LOG_LEVELS = {
  development: 'debug',
  staging: 'info',
  production: 'warn',
  test: 'error',
} as const;

export const REQUEST_ID_HEADER = 'x-request-id';
export const CORRELATION_ID_HEADER = 'x-correlation-id';

export const ASYNC_CONTEXT_KEY = 'logging-context';

export const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
];

export const SKIP_LOGGING_PATHS = [
  '/health',
  '/health/liveness',
  '/health/readiness',
];

export const PERFORMANCE_THRESHOLDS = {
  slowQuery: 100, // ms
  slowHttp: 1000, // ms
} as const;

export const LOG_CONTEXT_STORAGE = Symbol('LOG_CONTEXT_STORAGE');
