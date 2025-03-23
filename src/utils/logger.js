const chalk = require('chalk');

/**
 * Logger utility for consistent console output
 */
class Logger {
  constructor() {
    this.debugEnabled = false;
  }

  /**
   * Set debug mode
   * @param {boolean} enabled - Enable debug mode
   */
  setDebugMode(enabled) {
    this.debugEnabled = enabled;
  }

  /**
   * Log an info message
   * @param {string} message - Message to log
   */
  info(message) {
    console.log(chalk.blue(message));
  }

  /**
   * Log a success message
   * @param {string} message - Message to log
   */
  success(message) {
    console.log(chalk.green(message));
  }

  /**
   * Log a warning message
   * @param {string} message - Message to log
   */
  warn(message) {
    console.log(chalk.yellow(message));
  }

  /**
   * Log an error message
   * @param {string} message - Message to log
   * @param {Error} [error] - Optional error object
   */
  error(message, error = null) {
    console.error(chalk.red(message));
    if (error) {
      console.error(chalk.red(error.message));
    }
  }

  /**
   * Log a debug message (only in debug mode)
   * @param {string} message - Message to log
   */
  debug(message) {
    if (this.debugEnabled) {
      console.log(chalk.gray(`[DEBUG] ${message}`));
    }
  }
}

// Create a singleton instance
const loggerInstance = new Logger();

// Export the singleton
module.exports = loggerInstance;