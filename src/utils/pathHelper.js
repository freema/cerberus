/**
 * Path and directory helper functions
 */
const path = require('path');
const fs = require('fs-extra');

// Import logger but handle potential circular dependency
let logger;
try {
  logger = require('./logger');
} catch (e) {
  // Simple fallback logger in case of circular dependency
  logger = {
    error: (msg, err) => console.error(msg, err),
    info: msg => console.log(msg),
    warn: msg => console.warn(msg)
  };
}

/**
 * Get the base path for var storage
 * @returns {string} - Var base path
 */
function getVarPath() {
  return path.join(process.cwd(), 'var');
}

/**
 * Get the base path for cache storage
 * @returns {string} - Cache base path
 */
function getCachePath() {
  return path.join(getVarPath(), 'cache');
}

/**
 * Get the base path for log storage
 * @returns {string} - Log base path
 */
function getLogPath() {
  return path.join(getVarPath(), 'log');
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
    // Var directory - parent directory for cache and logs
    path.join(rootDir, 'var'),
    // Cache directories - ONLY for temporary files
    path.join(rootDir, 'var', 'cache', 'merge-requests'),
    path.join(rootDir, 'var', 'cache', 'security'),
    path.join(rootDir, 'var', 'cache', 'projects'), // For temporary project metadata used for updates
    path.join(rootDir, 'var', 'cache', 'temp'), // For other temporary files
    // Log directory
    path.join(rootDir, 'var', 'log'),
    // Data directories - For persistent project data
    path.join(rootDir, 'data', 'projects'),
    // Config directory
    path.join(rootDir, 'config'),
  ];

  dirs.forEach(dir => {
    try {
      fs.ensureDirSync(dir);
    } catch (error) {
      logger.error(`Failed to create directory: ${dir}`, error);
    }
  });
}

module.exports = {
  getVarPath,
  getCachePath,
  getLogPath,
  getDataPath,
  getCachePathForType,
  getDataPathForType,
  ensureDirectories,
};
