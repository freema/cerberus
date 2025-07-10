const fs = require('fs');
const path = require('path');

/**
 * Get current application version
 * @returns {string} Current version
 */
function getVersion() {
  try {
    // Try to read from VERSION file first
    const versionPath = path.join(__dirname, '../../VERSION');
    if (fs.existsSync(versionPath)) {
      return fs.readFileSync(versionPath, 'utf8').trim();
    }
    
    // Fallback to package.json
    const packagePath = path.join(__dirname, '../../package.json');
    if (fs.existsSync(packagePath)) {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      return packageJson.version;
    }
    
    return '1.0.0'; // Default fallback
  } catch (error) {
    return '1.0.0'; // Default fallback on error
  }
}

module.exports = {
  getVersion
};