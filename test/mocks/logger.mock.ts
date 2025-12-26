import { LoggingService } from '@common/logging/logging.service';

/**
 * Create a mock LoggingService for testing
 */
export function createMockLogger(): jest.Mocked<LoggingService> {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    startTimer: jest.fn(() => jest.fn(() => 100)),
    logDatabaseQuery: jest.fn(),
    logHttpCall: jest.fn(),
    logPerformance: jest.fn(),
    logBusinessEvent: jest.fn(),
    setContext: jest.fn(),
  } as any;
}

/**
 * Create a spy on LoggingService methods
 */
export function spyOnLogger(logger: LoggingService) {
  return {
    debug: jest.spyOn(logger, 'debug'),
    info: jest.spyOn(logger, 'info'),
    log: jest.spyOn(logger, 'log'),
    warn: jest.spyOn(logger, 'warn'),
    error: jest.spyOn(logger, 'error'),
  };
}

/**
 * Verify logger was called with specific message
 */
export function expectLoggerCalled(
  logger: jest.Mocked<LoggingService>,
  level: 'debug' | 'info' | 'log' | 'warn' | 'error',
  message: string | RegExp
) {
  if (typeof message === 'string') {
    expect(logger[level]).toHaveBeenCalledWith(expect.stringContaining(message), expect.anything());
  } else {
    expect(logger[level]).toHaveBeenCalledWith(expect.stringMatching(message), expect.anything());
  }
}

/**
 * Verify logger was not called
 */
export function expectLoggerNotCalled(
  logger: jest.Mocked<LoggingService>,
  level?: 'debug' | 'info' | 'log' | 'warn' | 'error'
) {
  if (level) {
    expect(logger[level]).not.toHaveBeenCalled();
  } else {
    expect(logger.debug).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.log).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  }
}
