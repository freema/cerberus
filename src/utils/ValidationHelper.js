/**
 * ValidationHelper - Centralizovaná utilita pro validační funkce
 */
const fs = require('fs-extra');
const path = require('path');
const logger = require('./logger');

class ValidationHelper {
  /**
   * Validace existence cesty
   * @param {string} input - Cesta k ověření
   * @param {boolean} requireDirectory - Má být cesta adresář?
   * @returns {Promise<string|boolean>} - True pokud validní, jinak chybová zpráva
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
   * Validace nezapisovatelné cesty
   * @param {string} input - Cesta k ověření
   * @returns {Promise<string|boolean>} - True pokud validní, jinak chybová zpráva
   */
  async validateWritablePath(input) {
    const pathExists = await this.validatePath(input);
    
    if (pathExists !== true) {
      // Zkusíme vytvořit adresář
      try {
        await fs.ensureDir(path.dirname(input));
        return true;
      } catch (error) {
        return `Cannot create directory: ${error.message}`;
      }
    }
    
    // Zkontrolujeme, zda můžeme zapisovat
    try {
      await fs.access(input, fs.constants.W_OK);
      return true;
    } catch (error) {
      return 'Path is not writable';
    }
  }

  /**
   * Validace neprázdného vstupu
   * @param {string} input - Vstup k ověření
   * @param {string} [errorMessage] - Vlastní chybová zpráva
   * @returns {string|boolean} - True pokud validní, jinak chybová zpráva
   */
  validateNotEmpty(input, errorMessage = 'Input cannot be empty') {
    return input && input.trim() !== '' ? true : errorMessage;
  }

  /**
   * Validace URL
   * @param {string} input - URL k ověření
   * @returns {string|boolean} - True pokud validní, jinak chybová zpráva
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
   * Validace GitLab merge request URL
   * @param {string} input - URL k ověření
   * @returns {string|boolean} - True pokud validní, jinak chybová zpráva
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
   * Validace číselného vstupu
   * @param {string|number} input - Vstup k ověření
   * @param {number} [min] - Minimální hodnota
   * @param {number} [max] - Maximální hodnota
   * @returns {string|boolean} - True pokud validní, jinak chybová zpráva
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
   * Validace koncovek souborů
   * @param {string} input - Vstup k ověření (seznam koncovek oddělených čárkou)
   * @returns {string|boolean} - True pokud validní, jinak chybová zpráva
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
   * Validace názvu projektu
   * @param {string} input - Název projektu k ověření
   * @returns {string|boolean} - True pokud validní, jinak chybová zpráva
   */
  validateProjectName(input) {
    if (!input || input.trim() === '') {
      return 'Project name cannot be empty';
    }
    
    // Kontrola zakázaných znaků v názvu
    const invalidChars = /[\/\\:*?"<>|]/;
    if (invalidChars.test(input)) {
      return 'Project name contains invalid characters';
    }
    
    return true;
  }

  /**
   * Validace existence souboru
   * @param {string} filePath - Cesta k souboru k ověření
   * @returns {Promise<boolean>} - True pokud soubor existuje
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
   * Validace API klíče
   * @param {string} input - API klíč k ověření
   * @returns {string|boolean} - True pokud validní, jinak chybová zpráva
   */
  validateApiKey(input) {
    const empty = this.validateNotEmpty(input, 'API key cannot be empty');
    if (empty !== true) {
      return empty;
    }
    
    // Zde by mohla být další validace podle formátu klíče
    
    return true;
  }
}

// Vytvoření singleton instance
const validationHelper = new ValidationHelper();

module.exports = validationHelper;