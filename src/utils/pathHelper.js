/**
 * Path and directory helper functions
 */
const path = require('path');
const fs = require('fs-extra');

/**
 * Get the base path for cache storage
 * @returns {string} - Cache base path
 */
function getCachePath() {
  return path.join(process.cwd(), 'cache');
}

/**
 * Get the base path for data storage
 * @returns {string} - Data base path
 */
function getDataPath() {
  return path.join(process.cwd(), 'data');
}

/**
 * Get the path for a specific cache type
 * @param {string} type - Cache type (e.g., 'merge-requests')
 * @returns {string} - Path to the cache directory
 */
function getCachePathForType(type) {
  return path.join(getCachePath(), type);
}

/**
 * Get the path for a specific data type
 * @param {string} type - Data type (e.g., 'projects')
 * @returns {string} - Path to the data directory
 */
function getDataPathForType(type) {
  return path.join(getDataPath(), type);
}

/**
 * Ensure that required directories exist
 */
function ensureDirectories() {
  const rootDir = path.resolve(process.cwd());
  const dirs = [
    // Cache directories
    path.join(rootDir, 'cache', 'merge-requests'),
    path.join(rootDir, 'cache', 'security'),
    path.join(rootDir, 'cache', 'projects'),  // Added projects directory in cache
    // Data directories
    path.join(rootDir, 'data', 'projects'),
    // Config directory
    path.join(rootDir, 'config')
  ];

  dirs.forEach(dir => {
    try {
      fs.ensureDirSync(dir);
    } catch (error) {
      console.error(`Failed to create directory: ${dir}`, error);
    }
  });
}

module.exports = {
  getCachePath,
  getDataPath,
  getCachePathForType,
  getDataPathForType,
  ensureDirectories
};