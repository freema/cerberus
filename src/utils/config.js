/**
 * Configuration service for the application
 * Refactored to use smaller, modular components
 */
const path = require('path');
const SimpleConfig = require('./simpleConfig');
const pathHelper = require('./pathHelper');
const encryption = require('./encryption');

/**
 * Configuration service for the application
 */
class ConfigService {
  constructor() {
    // Ensure logger is initialized first to avoid circular dependency
    this.initializeLogger();

    try {
      // Generate encryption key
      const encryptionKey = encryption.getEncryptionKey();

      // Ensure required directories exist
      pathHelper.ensureDirectories();

      // Setup configuration stores
      this.appConfig = new SimpleConfig({
        name: 'app',
        dir: path.join(process.cwd(), 'config'),
        defaults: {
          supportedExtensions: ['.php', '.js', '.jsx', '.ts', '.tsx', '.py'],
          excludedDirs: ['node_modules', 'vendor', '.git', 'dist', 'build'],
          gitlab: {
            baseUrl: 'https://gitlab.com/api/v4',
            timeout: 10000,
          },
          claude: {
            model: 'claude-3-opus-20240229',
            maxTokens: 4000,
          },
          activeAIService: 'claude',
          debug: false,
        },
      });

      // Credentials store with encryption - MOVED TO VAR/CACHE DIRECTORY
      this.credentialsConfig = new SimpleConfig({
        name: 'credentials',
        dir: path.join(pathHelper.getCachePath(), 'security'), // Store in var/cache/security instead of config
        defaults: {
          gitlabToken: null,
          claudeApiKey: null,
        },
        encryptionKey: encryptionKey,
        expiresIn: 365 * 24 * 60 * 60 * 1000, // 1 year in milliseconds
      });

      this.logger.info('Configuration initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing configuration:', error);
      throw error;
    }
  }

  /**
   * Initialize logger to avoid circular dependencies
   */
  initializeLogger() {
    // If logger is used within this file, we'll use console instead
    // to avoid circular dependencies
    this.logger = {
      info: msg => console.log(msg),
      error: (msg, err) => console.error(msg, err),
      warn: msg => console.warn(msg),
      success: msg => console.log(msg),
      debug: msg => console.debug(msg),
    };
  }

  /**
   * Get a configuration value
   * @param {string} key - Configuration key
   * @param {any} defaultValue - Default value if key doesn't exist
   * @returns {any} - Configuration value
   */
  get(key, defaultValue = null) {
    return this.appConfig.get(key, defaultValue);
  }

  /**
   * Set a configuration value
   * @param {string} key - Configuration key
   * @param {any} value - Value to set
   */
  set(key, value) {
    this.appConfig.set(key, value);
  }

  /**
   * Get a credential value
   * @param {string} key - Credential key
   * @returns {string|null} - Credential value or null
   */
  getCredential(key) {
    return this.credentialsConfig.get(key);
  }

  /**
   * Set a credential value
   * @param {string} key - Credential key
   * @param {string} value - Value to set
   */
  setCredential(key, value) {
    this.credentialsConfig.set(key, value);
  }

  /**
   * Get the GitLab token
   * @returns {string|null} - GitLab token or null
   */
  getGitlabToken() {
    return this.getCredential('gitlabToken');
  }

  /**
   * Set the GitLab token
   * @param {string} token - GitLab token
   */
  setGitlabToken(token) {
    this.setCredential('gitlabToken', token);
  }

  /**
   * Get the Claude API key
   * @returns {string|null} - Claude API key or null
   */
  getClaudeApiKey() {
    return this.getCredential('claudeApiKey');
  }

  /**
   * Set the Claude API key
   * @param {string} apiKey - Claude API key
   */
  setClaudeApiKey(apiKey) {
    this.setCredential('claudeApiKey', apiKey);
  }

  /**
   * Check if debug mode is enabled
   * @returns {boolean} - Debug mode status
   */
  isDebugMode() {
    return this.get('debug', false);
  }

  /**
   * Set debug mode
   * @param {boolean} enabled - Enable debug mode
   */
  setDebugMode(enabled) {
    this.set('debug', enabled);
  }

  /**
   * Get GitLab configuration
   * @returns {Object} - GitLab configuration
   */
  getGitlabConfig() {
    return this.get('gitlab', {
      baseUrl: 'https://gitlab.com/api/v4',
      timeout: 10000,
    });
  }

  /**
   * Set GitLab configuration
   * @param {Object} config - GitLab configuration
   */
  setGitlabConfig(config) {
    this.set('gitlab', {
      ...this.getGitlabConfig(),
      ...config,
    });
  }

  /**
   * Get Claude configuration
   * @returns {Object} - Claude configuration
   */
  getClaudeConfig() {
    return this.get('claude', {
      model: 'claude-3-opus-20240229',
      maxTokens: 4000,
    });
  }

  /**
   * Set Claude configuration
   * @param {Object} config - Claude configuration
   */
  setClaudeConfig(config) {
    this.set('claude', {
      ...this.getClaudeConfig(),
      ...config,
    });
  }

  /**
   * Delete a configuration value
   * @param {string} key - Configuration key
   */
  delete(key) {
    this.appConfig.delete(key);
  }

  /**
   * Get the base path for var storage
   * @returns {string} - Var base path
   */
  getVarPath() {
    return pathHelper.getVarPath();
  }

  /**
   * Get the base path for cache storage
   * @returns {string} - Cache base path
   */
  getCachePath() {
    return pathHelper.getCachePath();
  }

  /**
   * Get the base path for log storage
   * @returns {string} - Log base path
   */
  getLogPath() {
    return pathHelper.getLogPath();
  }

  /**
   * Get the base path for data storage
   * @returns {string} - Data base path
   */
  getDataPath() {
    return pathHelper.getDataPath();
  }

  /**
   * Get the path for a specific cache type
   * @param {string} type - Cache type (e.g., 'merge-requests')
   * @returns {string} - Path to the cache directory
   */
  getCachePathForType(type) {
    return pathHelper.getCachePathForType(type);
  }

  /**
   * Get the path for a specific data type
   * @param {string} type - Data type (e.g., 'projects')
   * @returns {string} - Path to the data directory
   */
  getDataPathForType(type) {
    return pathHelper.getDataPathForType(type);
  }
}

module.exports = new ConfigService();
