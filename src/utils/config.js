const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

/**
 * Simple configuration storage that saves to JSON files
 */
class SimpleConfig {
  /**
   * Create a simple configuration storage
   * @param {Object} options - Configuration options
   * @param {string} options.name - Name of the configuration file
   * @param {string} options.dir - Directory to store the configuration
   * @param {Object} options.defaults - Default configuration values
   * @param {string} [options.encryptionKey] - Optional encryption key for sensitive data
   */
  constructor(options) {
    this.name = options.name || 'config';
    this.dir = options.dir || path.join(process.cwd(), 'config');
    this.defaults = options.defaults || {};
    this.encryptionKey = options.encryptionKey || null;
    this.store = { ...this.defaults };
    
    // Create directory if it doesn't exist
    fs.ensureDirSync(this.dir);
    
    // Try to load existing config
    this.load();
  }
  
  /**
   * Get full path to the config file
   * @returns {string} - Full path
   */
  getFilePath() {
    return path.join(this.dir, `${this.name}.json`);
  }
  
  /**
   * Load configuration from disk
   */
  load() {
    try {
      const filePath = this.getFilePath();
      if (fs.existsSync(filePath)) {
        let data = fs.readFileSync(filePath, 'utf8');
        
        // Decrypt if necessary
        if (this.encryptionKey && this.isEncrypted(data)) {
          data = this.decrypt(data);
        }
        
        // Parse and merge with defaults
        const parsed = JSON.parse(data);
        this.store = {
          ...this.defaults,
          ...parsed
        };
      }
    } catch (error) {
      console.error(`Error loading configuration from ${this.getFilePath()}:`, error.message);
      // If there's an error, use defaults
      this.store = { ...this.defaults };
    }
  }
  
  /**
   * Save configuration to disk
   */
  save() {
    try {
      const filePath = this.getFilePath();
      let data = JSON.stringify(this.store, null, 2);
      
      // Encrypt if necessary
      if (this.encryptionKey) {
        data = this.encrypt(data);
      }
      
      fs.writeFileSync(filePath, data);
    } catch (error) {
      console.error(`Error saving configuration to ${this.getFilePath()}:`, error.message);
    }
  }
  
  /**
   * Check if data is encrypted
   * @param {string} data - Data to check
   * @returns {boolean} - Whether the data is encrypted
   */
  isEncrypted(data) {
    try {
      const json = JSON.parse(data);
      return json && json.encrypted === true;
    } catch (error) {
      return true; // If we can't parse it as JSON, assume it's encrypted
    }
  }
  
  /**
   * Encrypt data
   * @param {string} data - Data to encrypt
   * @returns {string} - Encrypted data
   */
  encrypt(data) {
    try {
      if (!this.encryptionKey) return data;
      
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey.slice(0, 32)), iv);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Return JSON object with encrypted data
      return JSON.stringify({
        encrypted: true,
        iv: iv.toString('hex'),
        data: encrypted
      });
    } catch (error) {
      console.error('Encryption error:', error.message);
      return data; // Return original data on error
    }
  }
  
  /**
   * Decrypt data
   * @param {string} encrypted - Encrypted data
   * @returns {string} - Decrypted data
   */
  decrypt(encrypted) {
    try {
      if (!this.encryptionKey) return encrypted;
      
      const json = JSON.parse(encrypted);
      if (!json.encrypted) return encrypted;
      
      const iv = Buffer.from(json.iv, 'hex');
      const encryptedData = json.data;
      
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey.slice(0, 32)), iv);
      
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error.message);
      return encrypted; // Return original data on error
    }
  }
  
  /**
   * Get a configuration value
   * @param {string} key - Key to get
   * @param {any} defaultValue - Default value if key doesn't exist
   * @returns {any} - Configuration value
   */
  get(key, defaultValue = undefined) {
    const keys = key.split('.');
    let value = this.store;
    
    for (const k of keys) {
      if (value === undefined || value === null || typeof value !== 'object') {
        return defaultValue;
      }
      value = value[k];
    }
    
    return value !== undefined ? value : defaultValue;
  }
  
  /**
   * Set a configuration value
   * @param {string} key - Key to set
   * @param {any} value - Value to set
   */
  set(key, value) {
    const keys = key.split('.');
    let target = this.store;
    
    // Navigate to the right nested object
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (target[k] === undefined || target[k] === null || typeof target[k] !== 'object') {
        target[k] = {};
      }
      target = target[k];
    }
    
    // Set the value
    target[keys[keys.length - 1]] = value;
    
    // Save to disk
    this.save();
  }
  
  /**
   * Delete a configuration value
   * @param {string} key - Key to delete
   */
  delete(key) {
    const keys = key.split('.');
    let target = this.store;
    
    // Navigate to the right nested object
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (target[k] === undefined || target[k] === null || typeof target[k] !== 'object') {
        return; // Key path doesn't exist
      }
      target = target[k];
    }
    
    // Delete the value
    delete target[keys[keys.length - 1]];
    
    // Save to disk
    this.save();
  }
  
  /**
   * Clear all configuration
   */
  clear() {
    this.store = { ...this.defaults };
    this.save();
  }
}

/**
 * Configuration service for the application
 */
class ConfigService {
  constructor() {
    // Ensure logger is initialized first to avoid circular dependency
    this.initializeLogger();
    
    try {
      // Generate encryption key
      const encryptionKey = this.getEncryptionKey();
      
      // Setup configuration stores
      this.appConfig = new SimpleConfig({
        name: 'app',
        dir: path.join(process.cwd(), 'config'),
        defaults: {
          cacheTTL: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
          supportedExtensions: ['.php', '.js', '.jsx', '.ts', '.tsx', '.py'],
          excludedDirs: ['node_modules', 'vendor', '.git', 'dist', 'build'],
          gitlab: {
            baseUrl: 'https://gitlab.com/api/v4',
            timeout: 10000
          },
          claude: {
            model: 'claude-3-opus-20240229',
            maxTokens: 4000
          },
          debug: false
        }
      });

      // Credentials store with encryption
      this.credentialsConfig = new SimpleConfig({
        name: 'credentials',
        dir: path.join(process.cwd(), 'config'),
        defaults: {
          gitlabToken: null,
          claudeApiKey: null
        },
        encryptionKey: encryptionKey
      });
      
      this.logger.info('Configuration initialized successfully');
    } catch (error) {
      console.error('Error initializing configuration:', error);
      throw error;
    }

    // Ensure required directories exist
    this.ensureDirectories();
  }
  
  /**
   * Initialize logger to avoid circular dependencies
   */
  initializeLogger() {
    // If logger is used within this file, we'll use console instead
    // to avoid circular dependencies
    this.logger = {
      info: (msg) => console.log(msg),
      error: (msg, err) => console.error(msg, err),
      warn: (msg) => console.warn(msg),
      success: (msg) => console.log(msg),
      debug: (msg) => console.debug(msg)
    };
  }

  /**
   * Get a simple encryption key based on machine-specific info
   * This is not high security but helps avoid storing tokens in plaintext
   */
  getEncryptionKey() {
    const machineName = require('os').hostname();
    const userName = require('os').userInfo().username;
    return crypto.createHash('sha256').update(`${machineName}-${userName}-cerberus`).digest('hex').substring(0, 32);
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
      timeout: 10000
    });
  }

  /**
   * Set GitLab configuration
   * @param {Object} config - GitLab configuration
   */
  setGitlabConfig(config) {
    this.set('gitlab', {
      ...this.getGitlabConfig(),
      ...config
    });
  }

  /**
   * Get Claude configuration
   * @returns {Object} - Claude configuration
   */
  getClaudeConfig() {
    return this.get('claude', {
      model: 'claude-3-opus-20240229',
      maxTokens: 4000
    });
  }

  /**
   * Set Claude configuration
   * @param {Object} config - Claude configuration
   */
  setClaudeConfig(config) {
    this.set('claude', {
      ...this.getClaudeConfig(),
      ...config
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
   * Ensure that required directories exist
   */
  ensureDirectories() {
    const rootDir = path.resolve(process.cwd());
    const dirs = [
      path.join(rootDir, 'cache', 'projects'),
      path.join(rootDir, 'cache', 'merge-requests'),
      path.join(rootDir, 'config')
    ];

    dirs.forEach(dir => {
      try {
        fs.ensureDirSync(dir);
      } catch (error) {
        console.error(`Failed to create directory: ${dir}`, error);
      }
    });
  }

  /**
   * Get the base path for cache storage
   * @returns {string} - Cache base path
   */
  getCachePath() {
    return path.join(process.cwd(), 'cache');
  }

  /**
   * Get the path for a specific cache type
   * @param {string} type - Cache type (e.g., 'projects', 'merge-requests')
   * @returns {string} - Path to the cache directory
   */
  getCachePathForType(type) {
    return path.join(this.getCachePath(), type);
  }
}

module.exports = new ConfigService();