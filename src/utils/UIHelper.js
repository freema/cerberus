/**
 * UIHelper - Centralized class for CLI interactions
 * Replaces repetitive inquirer.prompt calls
 */
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const logger = require('./logger');
const i18n = require('./i18n');
const { generateDirectoryLink } = require('./pathHelper');
const clipboard = require('./clipboard');

class UIHelper {
  /**
   * Gets confirmation from user
   * @param {string} message - Question for user
   * @param {boolean} defaultValue - Default value (true/false)
   * @returns {Promise<boolean>} - User's answer
   */
  async confirm(message, defaultValue = true) {
    const { confirmed } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirmed',
      message,
      default: defaultValue
    }]);
    return confirmed;
  }

  /**
   * Gets text input from user
   * @param {string} message - Prompt for user
   * @param {Function|null} validate - Validation function
   * @param {string} defaultValue - Default value
   * @returns {Promise<string>} - User input
   */
  async input(message, validate = null, defaultValue = '') {
    const { value } = await inquirer.prompt([{
      type: 'input',
      name: 'value',
      message,
      validate,
      default: defaultValue
    }]);
    return value;
  }

  /**
   * Gets password from user (hidden)
   * @param {string} message - Prompt for user
   * @param {Function|null} validate - Validation function
   * @returns {Promise<string>} - User password
   */
  async password(message, validate = null) {
    const { value } = await inquirer.prompt([{
      type: 'password',
      name: 'value',
      message,
      validate
    }]);
    return value;
  }

  /**
   * Gets single choice selection from menu
   * @param {string} message - Prompt for user
   * @param {Array<Object>} choices - Available choices
   * @param {string|null} defaultValue - Default value
   * @returns {Promise<any>} - Selected value
   */
  async select(message, choices, defaultValue = null) {
    const { selected } = await inquirer.prompt([{
      type: 'list',
      name: 'selected',
      message,
      choices,
      default: defaultValue
    }]);
    return selected;
  }

  /**
   * Gets multiple choice selection from menu
   * @param {string} message - Prompt for user
   * @param {Array<Object>} choices - Available choices
   * @param {Array<any>} defaultValue - Default selected values
   * @returns {Promise<Array<any>>} - Selected values
   */
  async multiSelect(message, choices, defaultValue = []) {
    const { selected } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'selected',
      message,
      choices,
      default: defaultValue
    }]);
    return selected;
  }

  /**
   * Shows spinner during async operation
   * @param {string} message - Message displayed with spinner
   * @param {Function} asyncFunction - Async function to execute
   * @param {string} successMessage - Success message
   * @param {string} errorMessage - Error message
   * @returns {Promise<any>} - Result of async function
   */
  async withSpinner(message, asyncFunction, successMessage = null, errorMessage = null) {
    const spinner = ora(message).start();
    try {
      const result = await asyncFunction();
      if (successMessage) {
        spinner.succeed(successMessage);
      } else {
        spinner.succeed();
      }
      return result;
    } catch (error) {
      if (errorMessage) {
        spinner.fail(errorMessage);
      } else {
        spinner.fail(`Error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Displays section header
   * @param {string} title - Section title
   */
  displayHeader(title) {
    logger.info(chalk.cyan(`\n=== ${title} ===`));
  }

  /**
   * Displays info line (key: value)
   * @param {string} label - Label
   * @param {string} value - Value
   */
  displayInfo(label, value) {
    logger.info(`${chalk.white(label)}: ${chalk.yellow(value || 'N/A')}`);
  }

  /**
   * Displays warning message
   * @param {string} message - Message
   */
  displayWarning(message) {
    logger.warn(`⚠️  ${message}`);
  }

  /**
   * Displays error message
   * @param {string} message - Message
   */
  displayError(message) {
    logger.error(`❌ ${message}`);
  }

  /**
   * Displays success message
   * @param {string} message - Message
   */
  displaySuccess(message) {
    logger.success(`✓ ${message}`);
  }

  /**
   * Displays description with possible truncation
   * @param {string} text - Description text
   * @param {number} maxLength - Maximum length before truncation
   */
  displayDescription(text, maxLength = 500) {
    if (!text) return;
    
    logger.info(chalk.cyan('\nDescription:'));
    logger.info(chalk.gray(text.substring(0, maxLength) + 
      (text.length > maxLength ? '...' : '')));
  }

  /**
   * Displays data table
   * @param {Array<string>} headers - Table headers
   * @param {Array<Array<string>>} rows - Table rows
   */
  displayTable(headers, rows) {
    // Calculate column widths
    const widths = headers.map((header, idx) => {
      let maxWidth = header.length;
      rows.forEach(row => {
        const cellValue = String(row[idx] || '');
        if (cellValue.length > maxWidth) {
          maxWidth = cellValue.length;
        }
      });
      return maxWidth + 2; // Add padding
    });
    
    // Print headers
    let headerRow = '';
    headers.forEach((header, idx) => {
      headerRow += chalk.cyan(header.padEnd(widths[idx]));
    });
    logger.info(headerRow);
    
    // Print separator
    const separator = widths.map(width => '-'.repeat(width)).join('');
    logger.info(chalk.gray(separator));
    
    // Print rows
    rows.forEach(row => {
      let rowStr = '';
      row.forEach((cell, idx) => {
        rowStr += chalk.white(String(cell || '').padEnd(widths[idx]));
      });
      logger.info(rowStr);
    });
  }

  /**
   * Displays directory link
   * @param {string} dirPath - Directory path
   * @param {string} [label] - Optional label
   */
  displayDirectoryLink(dirPath, label = null) {
    const dirLink = generateDirectoryLink(dirPath);
    if (label) {
      logger.info(chalk.cyan(`\n${label}: `));
    } else {
      logger.info(chalk.cyan('\nDirectory: '));
    }
    logger.info(chalk.blue.underline(dirLink));
    logger.info(chalk.white(dirPath));
  }

  /**
   * Copies text to clipboard and displays message
   * @param {string} text - Text to copy
   * @param {string} [successMessage] - Success message
   */
  copyToClipboard(text, successMessage = 'Copied to clipboard.') {
    try {
      clipboard.copyWithFeedback(text, successMessage);
      return true;
    } catch (error) {
      logger.error('Failed to copy to clipboard:', error);
      return false;
    }
  }

  /**
   * Asks user if they want to copy text to clipboard
   * @param {string} text - Text to copy
   * @param {string} [message] - Question message
   * @param {string} [successMessage] - Success message
   */
  async askToCopyToClipboard(text, message = 'Would you like to copy this to your clipboard?', successMessage = 'Copied to clipboard.') {
    const shouldCopy = await this.confirm(message, true);
    if (shouldCopy) {
      return this.copyToClipboard(text, successMessage);
    }
    return false;
  }

  /**
   * Formats file size to readable format
   * @param {number} bytes - Size in bytes
   * @returns {string} - Formatted size
   */
  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }
}

// Create singleton instance
const uiHelper = new UIHelper();

module.exports = uiHelper;