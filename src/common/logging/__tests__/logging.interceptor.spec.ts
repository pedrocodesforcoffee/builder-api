import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from '../logging.interceptor';
import { LoggingService } from '../logging.service';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockLoggingService: jest.Mocked<LoggingService>;

  beforeEach(async () => {
    mockLoggingService = {
      logRequest: jest.fn(),
      logResponse: jest.fn(),
      error: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggingInterceptor,
        {
          provide: LoggingService,
          useValue: mockLoggingService,
        },
      ],
    }).compile();

    interceptor = module.get<LoggingInterceptor>(LoggingInterceptor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockExecutionContext = (url: string = '/api/test'): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          url,
          id: 'test-request-id',
          correlationId: 'test-correlation-id',
        }),
        getResponse: () => ({
          statusCode: 200,
        }),
      }),
    } as any;
  };

  const createMockCallHandler = (returnValue: any = {}): CallHandler => {
    return {
      handle: () => of(returnValue),
    } as any;
  };

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('successful request', () => {
    it('should log request and response', (done) => {
      const context = createMockExecutionContext();
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe({
        next: () => {
          expect(mockLoggingService.logRequest).toHaveBeenCalledWith(
            expect.objectContaining({
              method: 'GET',
              url: '/api/test',
            }),
            expect.objectContaining({
              correlationId: 'test-correlation-id',
              requestId: 'test-request-id',
            })
          );

          expect(mockLoggingService.logResponse).toHaveBeenCalledWith(
            expect.objectContaining({
              method: 'GET',
              url: '/api/test',
            }),
            expect.objectContaining({
              statusCode: 200,
            }),
            expect.any(Number),
            expect.objectContaining({
              correlationId: 'test-correlation-id',
              requestId: 'test-request-id',
            })
          );

          done();
        },
        error: done,
      });
    });

    it('should calculate duration', (done) => {
      const context = createMockExecutionContext();
      const next = createMockCallHandler();

      const startTime = Date.now();

      interceptor.intercept(context, next).subscribe({
        next: () => {
          const callArgs = mockLoggingService.logResponse.mock.calls[0];
          const duration = callArgs[2];

          expect(duration).toBeGreaterThanOrEqual(0);
          expect(duration).toBeLessThan(100);

          done();
        },
        error: done,
      });
    });
  });

  describe('failed request', () => {
    it('should log error when request fails', (done) => {
      const context = createMockExecutionContext();
      const testError = new Error('Test error') as any;
      testError.status = 500;

      const next: CallHandler = {
        handle: () => throwError(() => testError),
      } as any;

      interceptor.intercept(context, next).subscribe({
        next: () => {
          done(new Error('Should not reach here'));
        },
        error: (error) => {
          expect(mockLoggingService.error).toHaveBeenCalledWith(
            'Request failed with error',
            testError,
            expect.objectContaining({
              correlationId: 'test-correlation-id',
              requestId: 'test-request-id',
              method: 'GET',
              url: '/api/test',
              statusCode: 500,
              duration: expect.any(Number),
            })
          );

          expect(error).toBe(testError);
          done();
        },
      });
    });
  });

  describe('health check endpoints', () => {
    beforeEach(() => {
      process.env.LOG_SKIP_HEALTH_CHECK = 'true';
    });

    afterEach(() => {
      delete process.env.LOG_SKIP_HEALTH_CHECK;
    });

    it('should skip logging for health check endpoints', (done) => {
      const context = createMockExecutionContext('/api/health');
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe({
        next: () => {
          expect(mockLoggingService.logRequest).not.toHaveBeenCalled();
          expect(mockLoggingService.logResponse).not.toHaveBeenCalled();
          done();
        },
        error: done,
      });
    });

    it('should skip logging for liveness endpoint', (done) => {
      const context = createMockExecutionContext('/api/health/liveness');
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe({
        next: () => {
          expect(mockLoggingService.logRequest).not.toHaveBeenCalled();
          expect(mockLoggingService.logResponse).not.toHaveBeenCalled();
          done();
        },
        error: done,
      });
    });

    it('should log non-health endpoints even when skip is enabled', (done) => {
      const context = createMockExecutionContext('/api/users');
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe({
        next: () => {
          expect(mockLoggingService.logRequest).toHaveBeenCalled();
          expect(mockLoggingService.logResponse).toHaveBeenCalled();
          done();
        },
        error: done,
      });
    });
  });
});
