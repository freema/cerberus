/**
 * Base model class for all data entities
 */
const path = require('path');
const config = require('../utils/config');
const fileSystem = require('../utils/fileSystem');
const logger = require('../utils/logger');

class BaseModel {
  /**
   * Create a new model instance
   * @param {string} type - Entity type (e.g. 'projects', 'merge-requests')
   * @param {string} id - Entity identifier
   * @param {Object} data - Entity data
   */
  constructor(type, id, data = {}) {
    this.type = type;
    this.id = id;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.lastUpdated = data.lastUpdated || new Date().toISOString();
  }

  /**
   * Get the entity path
   * @returns {string} - Path to the entity directory or file
   */
  getPath() {
    return path.join(config.getDataPathForType(this.type), this.id);
  }

  /**
   * Get the cache path
   * @returns {string} - Path to the cached entity directory or file
   */
  getCachePath() {
    return path.join(config.getCachePathForType(this.type), this.id);
  }

  /**
   * Update the last updated timestamp
   */
  updateTimestamp() {
    this.lastUpdated = new Date().toISOString();
  }

  /**
   * Convert to JSON representation
   * @returns {Object} - JSON representation of the entity
   */
  toJSON() {
    // Default implementation, should be overridden by subclasses
    return {
      id: this.id,
      type: this.type,
      createdAt: this.createdAt,
      lastUpdated: this.lastUpdated
    };
  }

  /**
   * Save the entity
   * @returns {Promise<void>}
   */
  async save() {
    try {
      this.updateTimestamp();
      
      // Ensure data directory exists
      await fileSystem.ensureDir(config.getDataPathForType(this.type));
      
      // Save to data directory
      const filePath = `${this.getPath()}${this.getFileExtension()}`;
      await this.saveToStorage(filePath);
      
      logger.debug(`Entity ${this.id} saved to ${filePath}`);
    } catch (error) {
      logger.error(`Error saving entity ${this.id}:`, error);
      throw error;
    }
  }

  /**
   * Get the file extension for this entity type
   * @returns {string} - File extension including dot
   */
  getFileExtension() {
    return '.json'; // Default extension
  }

  /**
   * Save to storage - implementation depends on storage format
   * @param {string} filePath - Path to save to
   * @returns {Promise<void>}
   */
  async saveToStorage(filePath) {
    await fileSystem.saveToJson(filePath, this.toJSON());
  }

  /**
   * Load data from storage
   * @param {string} filePath - Path to load from
   * @returns {Promise<Object>} - Loaded data
   */
  static async loadFromStorage(filePath, isJson = true) {
    if (isJson) {
      return await fileSystem.readJson(filePath);
    } else {
      return await fileSystem.readFile(filePath);
    }
  }

  /**
   * Check if entity exists
   * @param {string} type - Entity type
   * @param {string} id - Entity ID
   * @returns {Promise<boolean>} - Whether the entity exists
   */
  static async exists(type, id) {
    const filePath = path.join(config.getDataPathForType(type), `${id}.json`);
    return await fileSystem.fileExists(filePath);
  }

  /**
   * List all entities of a type
   * @param {string} type - Entity type
   * @returns {Promise<string[]>} - Array of entity IDs
   */
  static async listAll(type) {
    try {
      // Try to list entities from data directory
      const dataPath = config.getDataPathForType(type);
      let files = [];
      
      try {
        files = await fileSystem.listFiles(dataPath);
      } catch (error) {
        logger.debug(`No ${type} directory or error reading it`);
      }
      
      // Filter and remove extension
      return files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
    } catch (error) {
      logger.error(`Error listing ${type}:`, error);
      return [];
    }
  }
}

module.exports = BaseModel;
