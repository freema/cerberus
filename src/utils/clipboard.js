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
      // Linux - try xclip (X11) or wl-copy (Wayland)
      try {
        // Try xclip for X11 first
        const xclipProc = spawn('xclip', ['-selection', 'clipboard']);
        xclipProc.stdin.write(text);
        xclipProc.stdin.end();
        return true;
      } catch (xclipError) {
        try {
          // Try wl-copy for Wayland as fallback
          const wlProc = spawn('wl-copy');
          wlProc.stdin.write(text);
          wlProc.stdin.end();
          return true;
        } catch (wlError) {
          logger.debug('Linux clipboard utilities not available: xclip or wl-copy required');
          return false;
        }
      }
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
 * @param {string} [failMessage='Automatic clipboard copy failed. On Linux, install xclip or wl-copy.'] - Message on failure
 */
function copyWithFeedback(
  text,
  successMessage = 'Copied to clipboard.',
  failMessage = 'Automatic clipboard copy failed. On Linux, install xclip or wl-copy.'
) {
  const success = copyToClipboard(text);

  if (success) {
    logger.success(successMessage);
  } else {
    logger.warn(failMessage);
  }

  return success;
}

/**
 * Write text to clipboard (alias for copyToClipboard)
 * @param {string} text - Text to write to clipboard
 * @returns {boolean} - Whether the operation was successful
 */
function write(text) {
  return copyToClipboard(text);
}

module.exports = {
  copyToClipboard,
  copyWithFeedback,
  write,
};
