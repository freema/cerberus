const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

// Import logger but handle potential circular dependency
let logger;
try {
  logger = require('./logger');
} catch (e) {
  // Simple fallback logger in case of circular dependency
  logger = {
    error: (msg, err) => console.error(msg, err),
    info: msg => console.log(msg),
    warn: msg => console.warn(msg),
  };
}

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
   * @param {number} [options.expiresIn] - Optional expiration time in milliseconds
   */
  constructor(options) {
    this.name = options.name || 'config';
    this.dir = options.dir || path.join(process.cwd(), 'config');
    this.defaults = options.defaults || {};
    this.encryptionKey = options.encryptionKey || null;
    this.expiresIn = options.expiresIn || null;
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

        // Check if the configuration has expired
        if (this.expiresIn && parsed._timestamp) {
          const now = Date.now();
          const createdAt = parsed._timestamp;
          const expirationTime = createdAt + this.expiresIn;

          if (now > expirationTime) {
            logger.info(`Configuration ${this.name} has expired, using defaults`);
            this.store = { ...this.defaults };
            return;
          }
        }

        this.store = {
          ...this.defaults,
          ...parsed,
        };
      }
    } catch (error) {
      logger.error(`Error loading configuration from ${this.getFilePath()}:`, error);
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

      // Add timestamp for expiration check
      if (this.expiresIn) {
        this.store._timestamp = Date.now();
      }

      let data = JSON.stringify(this.store, null, 2);

      // Encrypt if necessary
      if (this.encryptionKey) {
        data = this.encrypt(data);
      }

      fs.writeFileSync(filePath, data);
    } catch (error) {
      logger.error(`Error saving configuration to ${this.getFilePath()}:`, error);
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
      const cipher = crypto.createCipheriv(
        'aes-256-cbc',
        Buffer.from(this.encryptionKey.slice(0, 32)),
        iv
      );

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Return JSON object with encrypted data
      return JSON.stringify({
        encrypted: true,
        iv: iv.toString('hex'),
        data: encrypted,
      });
    } catch (error) {
      logger.error('Encryption error:', error);
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

      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        Buffer.from(this.encryptionKey.slice(0, 32)),
        iv
      );

      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Decryption error:', error);
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

module.exports = SimpleConfig;
