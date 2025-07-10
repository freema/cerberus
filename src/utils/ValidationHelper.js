/**
 * ValidationHelper - Centralized utility for validation functions
 */
const fs = require('fs-extra');
const path = require('path');
// const logger = require('./logger'); // TODO: Use if needed

class ValidationHelper {
  /**
   * Validates path existence
   * @param {string} input - Path to validate
   * @param {boolean} requireDirectory - Should path be a directory?
   * @returns {Promise<string|boolean>} - True if valid, otherwise error message
   */
  async validatePath(input, requireDirectory = false) {
    if (!input || input.trim() === '') {
      return 'Path cannot be empty';
    }

    try {
      const stats = await fs.stat(input);

      if (requireDirectory && !stats.isDirectory()) {
        return 'Path must be a directory';
      }

      return true;
    } catch (error) {
      return 'Path does not exist or is not accessible';
    }
  }

  /**
   * Validates writable path
   * @param {string} input - Path to validate
   * @returns {Promise<string|boolean>} - True if valid, otherwise error message
   */
  async validateWritablePath(input) {
    const pathExists = await this.validatePath(input);

    if (pathExists !== true) {
      // Try to create directory
      try {
        await fs.ensureDir(path.dirname(input));
        return true;
      } catch (error) {
        return `Cannot create directory: ${error.message}`;
      }
    }

    // Check if we can write
    try {
      await fs.access(input, fs.constants.W_OK);
      return true;
    } catch (error) {
      return 'Path is not writable';
    }
  }

  /**
   * Validates non-empty input
   * @param {string} input - Input to validate
   * @param {string} [errorMessage] - Custom error message
   * @returns {string|boolean} - True if valid, otherwise error message
   */
  validateNotEmpty(input, errorMessage = 'Input cannot be empty') {
    return input && input.trim() !== '' ? true : errorMessage;
  }

  /**
   * Validates URL
   * @param {string} input - URL to validate
   * @returns {string|boolean} - True if valid, otherwise error message
   */
  validateUrl(input) {
    if (!input || input.trim() === '') {
      return 'URL cannot be empty';
    }

    try {
      new URL(input);
      return true;
    } catch (error) {
      return 'Invalid URL format';
    }
  }

  /**
   * Validates GitLab merge request URL
   * @param {string} input - URL to validate
   * @returns {string|boolean} - True if valid, otherwise error message
   */
  validateMergeRequestUrl(input) {
    const urlValid = this.validateUrl(input);
    if (urlValid !== true) {
      return urlValid;
    }

    if (!input.includes('merge_requests')) {
      return 'Invalid GitLab merge request URL. Format: https://gitlab.com/path/to/project/-/merge_requests/ID';
    }

    return true;
  }

  /**
   * Validates numeric input
   * @param {string|number} input - Input to validate
   * @param {number} [min] - Minimum value
   * @param {number} [max] - Maximum value
   * @returns {string|boolean} - True if valid, otherwise error message
   */
  validateNumber(input, min = null, max = null) {
    const number = Number(input);

    if (isNaN(number)) {
      return 'Input must be a valid number';
    }

    if (min !== null && number < min) {
      return `Number must be at least ${min}`;
    }

    if (max !== null && number > max) {
      return `Number must be at most ${max}`;
    }

    return true;
  }

  /**
   * Validates file extensions
   * @param {string} input - Input to validate (comma-separated list of extensions)
   * @returns {string|boolean} - True if valid, otherwise error message
   */
  validateFileExtensions(input) {
    if (!input || input.trim() === '') {
      return 'Please enter at least one extension';
    }

    const extensions = input.split(',').map(ext => ext.trim());

    if (!extensions.every(ext => ext.startsWith('.'))) {
      return 'Each extension must start with a dot (.)';
    }

    return true;
  }

  /**
   * Validates project name
   * @param {string} input - Project name to validate
   * @returns {string|boolean} - True if valid, otherwise error message
   */
  validateProjectName(input) {
    if (!input || input.trim() === '') {
      return 'Project name cannot be empty';
    }

    // Check for forbidden characters in name
    const invalidChars = /[/\\:*?"<>|]/;
    if (invalidChars.test(input)) {
      return 'Project name contains invalid characters';
    }

    return true;
  }

  /**
   * Validates file existence
   * @param {string} filePath - File path to validate
   * @returns {Promise<boolean>} - True if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath, fs.constants.F_OK);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validates API key
   * @param {string} input - API key to validate
   * @returns {string|boolean} - True if valid, otherwise error message
   */
  validateApiKey(input) {
    const empty = this.validateNotEmpty(input, 'API key cannot be empty');
    if (empty !== true) {
      return empty;
    }

    // Additional validation could be added here based on key format

    return true;
  }
}

// Create singleton instance
const validationHelper = new ValidationHelper();

module.exports = validationHelper;
