const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');
const pathHelper = require('./pathHelper');

/**
 * Logger utility for consistent console output and file logging
 */
class Logger {
  constructor() {
    this.debugEnabled = false;
    this.logToFile = true;
    this.logFilePath = '';
    this.ensureLogDirectory();
    
    // Load debug mode from config if available (added this line)
    this.initializeDebugMode();
  }
  
  /**
   * Initialize debug mode from config if available
   */
  initializeDebugMode() {
    try {
      // Try to get config - we need to be careful to avoid circular dependencies
      const configPath = path.join(process.cwd(), 'config', 'app.json');
      if (fs.existsSync(configPath)) {
        const configData = fs.readJsonSync(configPath);
        if (configData && configData.debug === true) {
          this.setDebugMode(true);
          this.debug('Debug mode enabled from config');
        }
      }
    } catch (error) {
      // Ignore errors here - we'll just use the default (false)
      console.error('Error reading debug config:', error.message);
    }
  }

  /**
   * Ensure log directory exists and set log file path
   */
  ensureLogDirectory() {
    try {
      // Create log directory if it doesn't exist
      fs.ensureDirSync(pathHelper.getLogPath());
      
      // Set log file path with current date
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      this.logFilePath = path.join(pathHelper.getLogPath(), `cerberus-${dateStr}.log`);
    } catch (error) {
      console.error('Failed to setup log directory:', error);
      this.logToFile = false;
    }
  }

  /**
   * Set debug mode
   * @param {boolean} enabled - Enable debug mode
   */
  setDebugMode(enabled) {
    this.debugEnabled = enabled;
    if (enabled) {
      console.log(chalk.yellow('Debug mode is now ENABLED'));
    }
  }

  /**
   * Check if debug mode is enabled
   * @returns {boolean} - Debug mode status
   */
  isDebugMode() {
    return this.debugEnabled;
  }

  /**
   * Write a message to the log file
   * @param {string} level - Log level
   * @param {string} message - Message to log
   * @param {Error} [error] - Optional error object
   * @private
   */
  _writeToLogFile(level, message, error = null) {
    if (!this.logToFile || !this.logFilePath) return;
    
    try {
      const timestamp = new Date().toISOString();
      let logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
      
      if (error) {
        logEntry += `[${timestamp}] [${level.toUpperCase()}] ${error.message}\n`;
        if (error.stack) {
          logEntry += `[${timestamp}] [${level.toUpperCase()}] ${error.stack}\n`;
        }
      }
      
      fs.appendFileSync(this.logFilePath, logEntry);
    } catch (err) {
      console.error('Failed to write to log file:', err);
    }
  }

  /**
   * Log an info message
   * @param {string} message - Message to log
   */
  info(message) {
    console.log(chalk.blue(message));
    this._writeToLogFile('info', message);
  }

  /**
   * Log a success message
   * @param {string} message - Message to log
   */
  success(message) {
    console.log(chalk.green(message));
    this._writeToLogFile('success', message);
  }

  /**
   * Log a warning message
   * @param {string} message - Message to log
   */
  warn(message) {
    console.log(chalk.yellow(message));
    this._writeToLogFile('warn', message);
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
    this._writeToLogFile('error', message, error);
  }

  /**
   * Log a debug message (only in debug mode)
   * @param {string} message - Message to log
   * @param {any} [context] - Optional context data
   */
  debug(message, context = null) {
    if (this.debugEnabled) {
      // Format the debug message with the DEBUG prefix
      if (context !== null) {
        // When we have context data, print it properly
        console.log(chalk.gray('[DEBUG]'), message);
        console.log(context);
        
        // For the log file, try to include context as JSON if possible
        try {
          const contextStr = typeof context === 'object' ? JSON.stringify(context) : String(context);
          this._writeToLogFile('debug', `${message} - Context: ${contextStr}`);
        } catch (e) {
          this._writeToLogFile('debug', message);
        }
      } else {
        // Simple message without context
        console.log(chalk.gray('[DEBUG]'), message);
        this._writeToLogFile('debug', message);
      }
    }
  }
}

// Create a singleton instance
const loggerInstance = new Logger();

// Export the singleton
module.exports = loggerInstance;