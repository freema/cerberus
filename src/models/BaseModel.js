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
   * Get file path with extension
   * @returns {string} - Full file path with extension
   */
  getFilePath() {
    return `${this.getPath()}${this.getFileExtension()}`;
  }

  /**
   * Get the cache path
   * @returns {string} - Path to the cached entity directory or file
   */
  getCachePath() {
    return path.join(config.getCachePathForType(this.type), this.id);
  }

  /**
   * Get cache file path with extension
   * @returns {string} - Full cache file path with extension
   */
  getCacheFilePath() {
    return `${this.getCachePath()}${this.getFileExtension()}`;
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
      lastUpdated: this.lastUpdated,
    };
  }

  /**
   * Save the entity
   * @returns {Promise<void>}
   */
  async save() {
    try {
      this.updateTimestamp();
      
      // Pre-save hook (can be overridden by subclasses)
      await this.beforeSave();
      
      // Ensure data directory exists
      await fileSystem.ensureDir(config.getDataPathForType(this.type));
      
      // Save to data directory
      const filePath = this.getFilePath();
      await this.saveToStorage(filePath);
      
      // Post-save hook (can be overridden by subclasses)
      await this.afterSave(filePath);
      
      logger.debug(`Entity ${this.id} saved to ${filePath}`);
    } catch (error) {
      logger.error(`Error saving entity ${this.id}:`, error);
      throw error;
    }
  }

  /**
   * Hook executed before saving the entity
   * @returns {Promise<void>}
   */
  async beforeSave() {
    // Empty by default, can be overridden by subclasses
    return;
  }

  /**
   * Hook executed after saving the entity
   * @param {string} filePath - Path where the entity was saved
   * @returns {Promise<void>}
   */
  async afterSave(filePath) {
    // Empty by default, can be overridden by subclasses
    return;
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
   * Load entity from storage
   * @param {string} id - Entity ID
   * @param {function} EntityClass - Entity constructor
   * @param {string} type - Entity type
   * @returns {Promise<BaseModel>} - Loaded entity instance
   */
  static async load(id, EntityClass, type) {
    try {
      // First try to load from data directory
      const filePath = path.join(config.getDataPathForType(type), `${id}${EntityClass.prototype.getFileExtension ? EntityClass.prototype.getFileExtension() : '.json'}`);
      
      try {
        const data = await BaseModel.loadFromStorage(filePath);
        return new EntityClass(data);
      } catch (dataError) {
        // If not in data directory, try cache directory
        logger.debug(`Entity not found in data directory, trying cache directory...`);
        const cacheFilePath = path.join(config.getCachePathForType(type), `${id}${EntityClass.prototype.getFileExtension ? EntityClass.prototype.getFileExtension() : '.json'}`);
        
        const data = await BaseModel.loadFromStorage(cacheFilePath);
        
        // Create new entity and migrate to data directory
        const entity = new EntityClass(data);
        logger.info(`Migrating entity ${id} from cache to data directory...`);
        await entity.save();
        
        return entity;
      }
    } catch (error) {
      logger.error(`Error loading entity ${id} of type ${type}:`, error);
      throw error;
    }
  }

  /**
   * Load data from storage
   * @param {string} filePath - Path to load from
   * @param {boolean} isJson - Whether the file is in JSON format
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
   * @param {string} extension - File extension (default: .json)
   * @returns {Promise<boolean>} - Whether the entity exists
   */
  static async exists(type, id, extension = '.json') {
    const filePath = path.join(config.getDataPathForType(type), `${id}${extension}`);
    return await fileSystem.fileExists(filePath);
  }

  /**
   * List all entities of a type from both data and cache directories
   * @param {string} type - Entity type
   * @param {string} extension - File extension (default: .json) 
   * @returns {Promise<string[]>} - Array of entity IDs
   */
  static async listAll(type, extension = '.json') {
    try {
      // Get entities from both data and cache directories
      let dataFiles = [];
      let cacheFiles = [];
      
      try {
        dataFiles = await fileSystem.listFiles(config.getDataPathForType(type));
      } catch (error) {
        logger.debug(`No data ${type} directory or error reading it`);
      }
      
      try {
        cacheFiles = await fileSystem.listFiles(config.getCachePathForType(type));
      } catch (error) {
        logger.debug(`No cache ${type} directory or error reading it`);
      }
      
      // Combine files from both directories
      const allFiles = [...dataFiles, ...cacheFiles];
      
      // Filter and remove duplicates and file extension
      return [...new Set(
        allFiles
          .filter(file => file.endsWith(extension))
          .map(file => file.replace(extension, ''))
      )];
    } catch (error) {
      logger.error(`Error listing ${type}:`, error);
      return [];
    }
  }

  /**
   * Create a new entity
   * @param {function} EntityClass - Entity constructor 
   * @param {string} type - Entity type
   * @param {string} id - Entity ID
   * @param {Object} data - Initial data
   * @returns {Promise<BaseModel>} - Created entity
   */
  static async create(EntityClass, type, id, data = {}) {
    try {
      // Ensure the directory exists
      await fileSystem.ensureDir(config.getDataPathForType(type));
      
      // Create entity
      const entity = new EntityClass(data);
      
      // Save entity
      await entity.save();
      
      return entity;
    } catch (error) {
      logger.error(`Error creating entity ${id} of type ${type}:`, error);
      throw error;
    }
  }
}

module.exports = BaseModel;