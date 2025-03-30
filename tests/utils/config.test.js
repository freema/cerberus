// Mock the fs-extra module first
jest.mock('fs-extra', () => ({
  ensureDirSync: jest.fn(),
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

  test('should get GitLab configuration', () => {
    const gitlabConfig = config.getGitlabConfig();
    expect(gitlabConfig).toHaveProperty('baseUrl');
    expect(gitlabConfig).toHaveProperty('timeout');
  });

  test('should set GitLab configuration', () => {
    const newConfig = { baseUrl: 'https://example.gitlab.com/api/v4' };
    config.setGitlabConfig(newConfig);
    const gitlabConfig = config.getGitlabConfig();
    expect(gitlabConfig.baseUrl).toBe('https://example.gitlab.com/api/v4');
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

  test('should set and get GitLab token', () => {
    config.setGitlabToken('gl_token123');
    const token = config.getGitlabToken();
    expect(token).toBe('gl_token123');
  });

  test('should set and get Claude API key', () => {
    config.setClaudeApiKey('claude_key456');
    const apiKey = config.getClaudeApiKey();
    expect(apiKey).toBe('claude_key456');
  });
});
