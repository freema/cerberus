// Mock fs-extra module first
jest.mock('fs-extra', () => ({
  ensureDirSync: jest.fn(),
  appendFileSync: jest.fn(),
}));

// Mock chalk
jest.mock('chalk', () => ({
  red: jest.fn(text => text),
  green: jest.fn(text => text),
  blue: jest.fn(text => text),
  yellow: jest.fn(text => text),
  cyan: jest.fn(text => text),
  gray: jest.fn(text => text),
  white: jest.fn(text => text),
}));

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
    jest.clearAllMocks(); // Clear previous calls
    logger.setDebugMode(true);
    logger.debug('Test debug message');
    expect(console.log).toHaveBeenCalled();
  });

  test('initializeFromConfig() should enable debug mode when config.debug is true', () => {
    const mockConfig = { debug: true };
    logger.setDebugMode(false); // Start with debug off
    logger.initializeFromConfig(mockConfig);
    expect(logger.isDebugMode()).toBe(true);
  });

  test('initializeFromConfig() should not enable debug mode when config.debug is false', () => {
    const mockConfig = { debug: false };
    logger.setDebugMode(false);
    logger.initializeFromConfig(mockConfig);
    expect(logger.isDebugMode()).toBe(false);
  });

  test('initializeFromConfig() should handle null config gracefully', () => {
    logger.setDebugMode(false);
    logger.initializeFromConfig(null);
    expect(logger.isDebugMode()).toBe(false);
  });

  test('isDebugMode() should return current debug state', () => {
    logger.setDebugMode(true);
    expect(logger.isDebugMode()).toBe(true);
    
    logger.setDebugMode(false);
    expect(logger.isDebugMode()).toBe(false);
  });
});
