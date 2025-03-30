/**
 * Path utility functions
 */
const path = require('path');

/**
 * Generate a clickable directory link based on the operating system
 * @param {string} dirPath - Directory path
 * @returns {string} - Clickable directory link
 */
function generateDirectoryLink(dirPath) {
  // Normalize the path for the current OS
  const normalizedPath = path.normalize(dirPath);

  // Different formats depending on the OS
  if (process.platform === 'win32') {
    // Windows format: file:///C:/path/to/directory
    const windowsPath = normalizedPath.replace(/\\/g, '/');
    return `file:///${windowsPath}`;
  } else if (process.platform === 'darwin') {
    // macOS format: file:///Users/username/path/to/directory
    return `file://${normalizedPath}`;
  } else {
    // Linux format: file:///home/username/path/to/directory
    return `file://${normalizedPath}`;
  }
}

module.exports = {
  generateDirectoryLink,
};
