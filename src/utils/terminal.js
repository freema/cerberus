/**
 * Terminal utility functions
 */
// const logger = require('./logger'); // TODO: Use if needed

/**
 * Clear the terminal screen
 */
function clearTerminal() {
  // Different command based on operating system
  if (process.platform === 'win32') {
    // For Windows
    process.stdout.write('\x1Bc');
  } else {
    // For Unix-like systems (Linux, macOS)
    process.stdout.write('\x1B[2J\x1B[0f\n');
  }
}

module.exports = {
  clearTerminal,
};
