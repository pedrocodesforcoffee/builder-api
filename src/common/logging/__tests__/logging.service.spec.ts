import { Test, TestingModule } from '@nestjs/testing';
import { LoggingService } from '../logging.service';
import { PinoLogger } from 'nestjs-pino';

describe('LoggingService', () => {
  let service: LoggingService;
  let mockPinoLogger: jest.Mocked<PinoLogger>;

  beforeEach(async () => {
    // Create mock Pino logger
    mockPinoLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      setContext: jest.fn(),
      assign: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: LoggingService,
          useFactory: () => new LoggingService(mockPinoLogger),
        },
      ],
    }).compile();

    service = module.get<LoggingService>(LoggingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('debug', () => {
    it('should call pino logger debug with message and context', () => {
      const message = 'Test debug message';
      const context = { userId: '123' };

      service.debug(message, context);

      expect(mockPinoLogger.debug).toHaveBeenCalledWith(expect.objectContaining(context), message);
    });
  });

  describe('info', () => {
    it('should call pino logger info with message and context', () => {
      const message = 'Test info message';
      const context = { requestId: 'abc-123' };

      service.info(message, context);

      expect(mockPinoLogger.info).toHaveBeenCalledWith(expect.objectContaining(context), message);
    });
  });

  describe('log', () => {
    it('should call info method', () => {
      const message = 'Test log message';
      const context = { userId: '456' };

      const infoSpy = jest.spyOn(service, 'info');
      service.log(message, context);

      expect(infoSpy).toHaveBeenCalledWith(message, context);
    });
  });

  describe('warn', () => {
    it('should call pino logger warn with message and context', () => {
      const message = 'Test warning message';
      const context = { operation: 'test-operation' };

      service.warn(message, context);

      expect(mockPinoLogger.warn).toHaveBeenCalledWith(expect.objectContaining(context), message);
    });
  });

  describe('error', () => {
    it('should call pino logger error with message, error object, and context', () => {
      const message = 'Test error message';
      const error = new Error('Test error');
      const context = { requestId: 'xyz-789' };

      service.error(message, error, context);

      expect(mockPinoLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          ...context,
          err: error,
        }),
        message
      );
    });

    it('should handle error as string', () => {
      const message = 'Test error message';
      const errorTrace = 'Stack trace string';
      const context = { requestId: 'xyz-789' };

      service.error(message, errorTrace, context);

      expect(mockPinoLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          ...context,
          errorTrace,
        }),
        message
      );
    });

    it('should handle no error object', () => {
      const message = 'Test error message';
      const context = { requestId: 'xyz-789' };

      service.error(message, undefined, context);

      expect(mockPinoLogger.error).toHaveBeenCalledWith(expect.objectContaining(context), message);
    });
  });

  describe('startTimer', () => {
    it('should return a function that calculates elapsed time', (done) => {
      const endTimer = service.startTimer();

      setTimeout(() => {
        const duration = endTimer();
        expect(duration).toBeGreaterThanOrEqual(50);
        expect(duration).toBeLessThan(150);
        done();
      }, 50);
    });
  });

  describe('logDatabaseQuery', () => {
    it('should log slow query as warning', () => {
      const query = 'SELECT * FROM users WHERE id = $1';
      const parameters = ['123'];
      const duration = 150; // > 100ms threshold

      service.logDatabaseQuery(query, parameters, duration);

      expect(mockPinoLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          query,
          parameterCount: 1,
          duration,
          threshold: 100,
        }),
        'Slow database query detected'
      );
    });

    it('should log fast query as debug', () => {
      const query = 'SELECT * FROM users WHERE id = $1';
      const parameters = ['123'];
      const duration = 50; // < 100ms threshold

      service.logDatabaseQuery(query, parameters, duration);

      expect(mockPinoLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          query,
          parameterCount: 1,
          duration,
        }),
        'Database query executed'
      );
    });
  });

  describe('logHttpCall', () => {
    it('should log slow HTTP request as warning', () => {
      const url = 'https://api.example.com/users';
      const method = 'GET';
      const status = 200;
      const duration = 1500; // > 1000ms threshold

      service.logHttpCall(url, method, status, duration);

      expect(mockPinoLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          url,
          method,
          status,
          duration,
          threshold: 1000,
        }),
        'Slow HTTP request detected'
      );
    });

    it('should log 5xx error', () => {
      const url = 'https://api.example.com/users';
      const method = 'POST';
      const status = 500;
      const duration = 100;

      service.logHttpCall(url, method, status, duration);

      expect(mockPinoLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          url,
          method,
          status,
          duration,
        }),
        'HTTP request failed'
      );
    });

    it('should log 4xx error as warning', () => {
      const url = 'https://api.example.com/users';
      const method = 'GET';
      const status = 404;
      const duration = 100;

      service.logHttpCall(url, method, status, duration);

      expect(mockPinoLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          url,
          method,
          status,
          duration,
        }),
        'HTTP request returned client error'
      );
    });
  });

  describe('logPerformance', () => {
    it('should log performance metrics', () => {
      const operation = 'data-processing';
      const duration = 250;
      const metadata = { recordsProcessed: 100 };

      service.logPerformance(operation, duration, metadata);

      expect(mockPinoLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          operation,
          duration,
          recordsProcessed: 100,
        }),
        `Performance: ${operation}`
      );
    });
  });

  describe('logBusinessEvent', () => {
    it('should log business event with data', () => {
      const event = 'user-registered';
      const data = { userId: '123', email: 'test@example.com' };

      service.logBusinessEvent(event, data);

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event,
          data,
        }),
        `Business event: ${event}`
      );
    });
  });
});
