/**
 * Clipboard management functions for different operating systems
 */
const { spawn } = require('child_process');
const logger = require('./logger');

/**
 * Copy text to clipboard based on the operating system
 * @param {string} text - Text to copy to clipboard
 * @returns {boolean} - Whether the operation was successful
 */
function copyToClipboard(text) {
  try {
    if (process.platform === 'darwin') {
      // macOS
      const proc = spawn('pbcopy');
      proc.stdin.write(text);
      proc.stdin.end();
      return true;
    } else if (process.platform === 'win32') {
      // Windows
      const proc = spawn('clip');
      proc.stdin.write(text);
      proc.stdin.end();
      return true;
    } else {
      // Linux - requires xclip or similar
      // Could try to detect and use xclip or xsel here
      return false;
    }
  } catch (error) {
    logger.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Copy text to clipboard and log the result
 * @param {string} text - Text to copy
 * @param {string} [successMessage='Copied to clipboard.'] - Message on success
 * @param {string} [failMessage='Automatic clipboard copy not supported on this platform.'] - Message on failure
 */
function copyWithFeedback(text, successMessage = 'Copied to clipboard.', failMessage = 'Automatic clipboard copy not supported on this platform.') {
  const success = copyToClipboard(text);
  
  if (success) {
    logger.success(successMessage);
  } else {
    logger.warn(failMessage);
  }
  
  return success;
}

module.exports = {
  copyToClipboard,
  copyWithFeedback
};