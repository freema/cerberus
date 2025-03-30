const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const logger = require('./logger');

/**
 * File system utility functions
 */
class FileSystem {
  /**
   * Create a directory if it doesn't exist
   * @param {string} dirPath - Path to directory
   * @returns {Promise<string>} - Path to the created directory
   */
  async ensureDir(dirPath) {
    try {
      await fs.ensureDir(dirPath);
      return dirPath;
    } catch (error) {
      logger.error(`Error creating directory ${dirPath}:`, error);
      throw error;
    }
  }

  /**
   * Save data to a JSON file
   * @param {string} filePath - Path to the file
   * @param {Object} data - Data to save
   * @returns {Promise<string>} - Path to the saved file
   */
  async saveToJson(filePath, data) {
    try {
      await this.ensureDir(path.dirname(filePath));
      await fs.writeJson(filePath, data, { spaces: 2 });
      return filePath;
    } catch (error) {
      logger.error(`Error saving data to ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Read a JSON file
   * @param {string} filePath - Path to the file
   * @returns {Promise<Object>} - Parsed JSON data
   */
  async readJson(filePath) {
    try {
      return await fs.readJson(filePath);
    } catch (error) {
      logger.error(`Error reading file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Write content to a file
   * @param {string} filePath - Path to the file
   * @param {string} content - Content to write
   * @returns {Promise<string>} - Path to the saved file
   */
  async writeFile(filePath, content) {
    try {
      await this.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, content, 'utf8');
      return filePath;
    } catch (error) {
      logger.error(`Error writing to ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Read content from a file
   * @param {string} filePath - Path to the file
   * @returns {Promise<string>} - File content
   */
  async readFile(filePath) {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      logger.error(`Error reading file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Check if a file exists
   * @param {string} filePath - Path to the file
   * @returns {Promise<boolean>} - Whether the file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * List all files in a directory
   * @param {string} dirPath - Path to directory
   * @returns {Promise<string[]>} - Array of file names
   */
  async listFiles(dirPath) {
    try {
      await this.ensureDir(dirPath);
      return await fs.readdir(dirPath);
    } catch (error) {
      logger.error(`Error listing files in ${dirPath}:`, error);
      return [];
    }
  }

  /**
   * Find files matching a pattern
   * @param {string} pattern - Glob pattern to match
   * @param {Object} options - Glob options
   * @returns {Promise<string[]>} - Array of matching files
   */
  async findFiles(pattern, options = {}) {
    try {
      return await glob.glob(pattern, options);
    } catch (error) {
      logger.error(`Error finding files with pattern ${pattern}:`, error);
      return [];
    }
  }

  /**
   * Copy a file
   * @param {string} src - Source path
   * @param {string} dest - Destination path
   * @returns {Promise<void>}
   */
  async copyFile(src, dest) {
    try {
      await this.ensureDir(path.dirname(dest));
      await fs.copy(src, dest);
    } catch (error) {
      logger.error(`Error copying file from ${src} to ${dest}:`, error);
      throw error;
    }
  }
}

module.exports = new FileSystem();
