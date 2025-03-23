const logger = require('../../src/utils/logger');

// Mock console methods
console.log = jest.fn();
console.error = jest.fn();
console.warn = jest.fn();

describe('Logger', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  test('info() should log message with blue color', () => {
    logger.info('Test info message');
    expect(console.log).toHaveBeenCalledTimes(1);
    // We can't test the exact chalk color here, but we can verify it was called
    expect(console.log).toHaveBeenCalled();
  });

  test('success() should log message with green color', () => {
    logger.success('Test success message');
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalled();
  });

  test('warn() should log message with yellow color', () => {
    logger.warn('Test warning message');
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalled();
  });

  test('error() should log message with red color', () => {
    logger.error('Test error message');
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalled();
  });

  test('error() with error object should log both message and error', () => {
    const error = new Error('Test error');
    logger.error('Test error message', error);
    expect(console.error).toHaveBeenCalledTimes(2);
  });

  test('debug() should not log when debug mode is disabled', () => {
    logger.setDebugMode(false);
    logger.debug('Test debug message');
    expect(console.log).not.toHaveBeenCalled();
  });

  test('debug() should log when debug mode is enabled', () => {
    logger.setDebugMode(true);
    logger.debug('Test debug message');
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalled();
  });
});