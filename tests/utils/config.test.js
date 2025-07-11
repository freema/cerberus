// Mock the fs-extra module first
jest.mock('fs-extra', () => ({
  ensureDirSync: jest.fn(),
  existsSync: jest.fn(() => false),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(() => '{}'),
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

// Import the config service
const config = require('../../src/utils/config');

describe('Config Service', () => {
  test('should return default value when key not found', () => {
    const result = config.get('nonexistent', 'default');
    expect(result).toBe('default');
  });

  test('should set and get a value', () => {
    config.set('testKey', 'testValue');
    const result = config.get('testKey');
    expect(result).toBe('testValue');
  });

  test('should set and get nested values', () => {
    config.set('nested.test', 'nestedValue');
    const result = config.get('nested.test');
    expect(result).toBe('nestedValue');
  });

  test('should get Claude configuration', () => {
    const claudeConfig = config.getClaudeConfig();
    expect(claudeConfig).toHaveProperty('model');
    expect(claudeConfig).toHaveProperty('maxTokens');
  });

  test('should set Claude configuration', () => {
    const newConfig = { model: 'claude-3-haiku-20240307' };
    config.setClaudeConfig(newConfig);
    const claudeConfig = config.getClaudeConfig();
    expect(claudeConfig.model).toBe('claude-3-haiku-20240307');
  });

  test('should set and get debug mode', () => {
    config.setDebugMode(true);
    expect(config.isDebugMode()).toBe(true);

    config.setDebugMode(false);
    expect(config.isDebugMode()).toBe(false);
  });

  test('should have cache path methods', () => {
    const cachePath = config.getCachePath();
    expect(typeof cachePath).toBe('string');
    expect(cachePath).toContain('cache');

    const projectsCachePath = config.getCachePathForType('projects');
    expect(projectsCachePath).toContain('projects');
  });

  // Tests for credential management
  test('should handle credentials', () => {
    config.setCredential('testCredential', 'secret');
    const credential = config.getCredential('testCredential');
    expect(credential).toBe('secret');
  });

  test('should set and get Claude API key', () => {
    config.setClaudeApiKey('claude_key456');
    const apiKey = config.getClaudeApiKey();
    expect(apiKey).toBe('claude_key456');
  });

  test('should handle configuration get/set operations', () => {
    // Test that config can handle general configuration operations
    config.set('test.nested.key', 'testValue');
    const value = config.get('test.nested.key');
    expect(value).toBe('testValue');
    
    // Test default value
    const defaultValue = config.get('nonexistent.key', 'default');
    expect(defaultValue).toBe('default');
  });
});
