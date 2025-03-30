/**
 * Terminal utility functions
 */

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
    console.log('\x1B[2J\x1B[0f');
  }
}

module.exports = {
  clearTerminal,
};
