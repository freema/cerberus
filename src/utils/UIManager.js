/**
 * UI Manager for terminal interface
 */
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const logger = require('./logger');
const terminal = require('./terminal');
const figlet = require('figlet');

class UIManager {
  constructor() {
    this.currentSpinner = null;
  }

  /**
   * Show application banner
   * @param {string} text - Banner text
   * @param {string} font - Figlet font
   */
  showBanner(text = 'CERBERUS', font = 'Standard') {
    try {
      const banner = figlet.textSync(text, { font });
      console.log(chalk.cyan(banner));
    } catch (error) {
      console.log(chalk.cyan(`\n=== ${text} ===\n`));
    }
  }

  /**
   * Clear the terminal
   */
  clearScreen() {
    terminal.clearTerminal();
  }

  /**
   * Show a menu and get user selection
   * @param {string} message - Menu prompt message
   * @param {Array<Object>} choices - Menu choices
   * @returns {Promise<string>} - Selected choice value
   */
  async showMenu(message, choices) {
    const { selected } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selected',
        message,
        choices,
      },
    ]);
    return selected;
  }

  /**
   * Get user confirmation
   * @param {string} message - Confirmation message
   * @param {boolean} defaultValue - Default value
   * @returns {Promise<boolean>} - User confirmation
   */
  async confirm(message, defaultValue = true) {
    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message,
        default: defaultValue,
      },
    ]);
    return confirmed;
  }

  /**
   * Get user input
   * @param {string} message - Input message
   * @param {Function} validate - Validation function
   * @param {string} defaultValue - Default value
   * @returns {Promise<string>} - User input
   */
  async getInput(message, validate = null, defaultValue = '') {
    const { input } = await inquirer.prompt([
      {
        type: 'input',
        name: 'input',
        message,
        validate,
        default: defaultValue,
      },
    ]);
    return input;
  }

  /**
   * Get password input (masked)
   * @param {string} message - Input message
   * @returns {Promise<string>} - User input
   */
  async getPassword(message) {
    const { password } = await inquirer.prompt([
      {
        type: 'password',
        name: 'password',
        message,
      },
    ]);
    return password;
  }

  /**
   * Start a spinner
   * @param {string} text - Spinner text
   * @returns {ora.Ora} - Spinner instance
   */
  startSpinner(text) {
    if (this.currentSpinner) {
      this.stopSpinner();
    }

    this.currentSpinner = ora({
      text,
      color: 'cyan',
    }).start();

    return this.currentSpinner;
  }

  /**
   * Update spinner text
   * @param {string} text - New spinner text
   */
  updateSpinner(text) {
    if (this.currentSpinner) {
      this.currentSpinner.text = text;
    }
  }

  /**
   * Stop spinner with success
   * @param {string} text - Success text
   */
  succeedSpinner(text) {
    if (this.currentSpinner) {
      this.currentSpinner.succeed(text);
      this.currentSpinner = null;
    }
  }

  /**
   * Stop spinner with failure
   * @param {string} text - Failure text
   */
  failSpinner(text) {
    if (this.currentSpinner) {
      this.currentSpinner.fail(text);
      this.currentSpinner = null;
    }
  }

  /**
   * Stop spinner
   */
  stopSpinner() {
    if (this.currentSpinner) {
      this.currentSpinner.stop();
      this.currentSpinner = null;
    }
  }

  /**
   * Show a section header
   * @param {string} title - Section title
   */
  showHeader(title) {
    console.log(chalk.cyan(`\n=== ${title} ===`));
  }

  /**
   * Show a key-value pair
   * @param {string} key - Info key
   * @param {string} value - Info value
   */
  showKeyValue(key, value) {
    console.log(`${chalk.white(key)}: ${chalk.yellow(value || 'N/A')}`);
  }

  /**
   * Show a table of data
   * @param {Array<string>} headers - Table headers
   * @param {Array<Array<string>>} rows - Table rows
   */
  showTable(headers, rows) {
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

    // Print header
    let headerRow = '';
    headers.forEach((header, idx) => {
      headerRow += chalk.cyan(header.padEnd(widths[idx]));
    });
    console.log(headerRow);

    // Print separator
    const separator = widths.map(width => '-'.repeat(width)).join('');
    console.log(chalk.gray(separator));

    // Print rows
    rows.forEach(row => {
      let rowStr = '';
      row.forEach((cell, idx) => {
        rowStr += chalk.white(String(cell || '').padEnd(widths[idx]));
      });
      console.log(rowStr);
    });
  }
}

// Create a singleton instance
const uiManager = new UIManager();

module.exports = uiManager;
