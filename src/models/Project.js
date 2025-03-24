const path = require('path');
const config = require('../utils/config');
const fileSystem = require('../utils/fileSystem');
const logger = require('../utils/logger');

/**
 * Project model class
 */
class Project {
  /**
   * Create a new Project instance
   * @param {string} name - Project name
   * @param {Object} data - Project data
   */
  constructor(name, data = {}) {
    this.name = name;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.lastUpdated = data.lastUpdated || new Date().toISOString();
    this.files = data.files || [];
    this.sourceDirectories = data.sourceDirectories || [];
    this.directoryStructure = data.directoryStructure || '';
    this.instructions = data.instructions || '';
  }

  /**
   * Get the project path for persistent data
   * @returns {string} - Path to the project directory in data folder
   */
  getProjectDataPath() {
    return path.join(config.getDataPathForType('projects'), this.name);
  }

  /**
   * Get the project path for cached files
   * @returns {string} - Path to the project directory in cache folder
   */
  getProjectCachePath() {
    return path.join(config.getCachePath(), 'projects', this.name);
  }

  /**
   * Save the project metadata
   * @returns {Promise<void>}
   */
  async save() {
    try {
      this.lastUpdated = new Date().toISOString();
      
      // Ensure data directory exists
      const dataPath = this.getProjectDataPath();
      await fileSystem.ensureDir(dataPath);
      
      // Save metadata to data directory
      const metadataPath = path.join(dataPath, 'metadata.json');
      await fileSystem.saveToJson(metadataPath, this.toJSON());
      
      // Also create cache directory if it doesn't exist
      await fileSystem.ensureDir(this.getProjectCachePath());
      
      logger.debug(`Project metadata saved to ${metadataPath}`);
    } catch (error) {
      logger.error(`Error saving project metadata for ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Convert project to JSON representation
   * @returns {Object} - JSON representation of the project
   */
  toJSON() {
    return {
      name: this.name,
      createdAt: this.createdAt,
      lastUpdated: this.lastUpdated,
      files: this.files,
      sourceDirectories: this.sourceDirectories,
      directoryStructure: this.directoryStructure,
      instructions: this.instructions
    };
  }

  /**
   * Add files to the project
   * @param {Array} files - Array of file objects
   */
  addFiles(files) {
    this.files = [...this.files, ...files];
  }

  /**
   * Add a source directory to the project
   * @param {string} directory - Path to the source directory
   */
  addSourceDirectory(directory) {
    if (!this.sourceDirectories.includes(directory)) {
      this.sourceDirectories.push(directory);
    }
  }

  /**
   * Set the directory structure
   * @param {string} structure - Directory structure string
   */
  setDirectoryStructure(structure) {
    this.directoryStructure = structure;
  }

  /**
   * Set the project instructions
   * @param {string} instructions - Project instructions
   */
  setInstructions(instructions) {
    this.instructions = instructions;
  }

  /**
   * Load a project by name
   * @param {string} name - Project name
   * @returns {Promise<Project>} - Loaded project
   */
  static async load(name) {
    try {
      // First try to load from data directory
      const metadataPath = path.join(config.getDataPathForType('projects'), name, 'metadata.json');
      
      try {
        const data = await fileSystem.readJson(metadataPath);
        return new Project(name, data);
      } catch (dataError) {
        // If not found in data directory, try old cache directory
        logger.debug(`Project not found in data directory, trying cache directory...`);
        const oldMetadataPath = path.join(
          config.getCachePathForType('projects'), 
          name, 
          'metadata.json'
        );
        
        const data = await fileSystem.readJson(oldMetadataPath);
        
        // Create a new project with this data
        const project = new Project(name, data);
        
        // Migrate this project to the new data location
        logger.info(`Migrating project ${name} from cache to data directory...`);
        await project.save();
        
        return project;
      }
    } catch (error) {
      logger.error(`Error loading project ${name}:`, error);
      throw error;
    }
  }

  /**
   * List all projects
   * @returns {Promise<string[]>} - Array of project names
   */
  static async listAll() {
    try {
      // Get projects from both data and cache directories
      let dataProjects = [];
      let cacheProjects = [];
      
      try {
        dataProjects = await fileSystem.listFiles(config.getDataPathForType('projects'));
      } catch (error) {
        logger.debug('No data projects directory or error reading it:', error);
      }
      
      try {
        cacheProjects = await fileSystem.listFiles(config.getCachePathForType('projects'));
      } catch (error) {
        logger.debug('No cache projects directory or error reading it:', error);
      }
      
      // Combine and deduplicate projects
      const allProjects = [...new Set([...dataProjects, ...cacheProjects])];
      
      return allProjects;
    } catch (error) {
      logger.error('Error listing projects:', error);
      return [];
    }
  }

  /**
   * Create a new project
   * @param {string} name - Project name
   * @returns {Promise<Project>} - Created project
   */
  static async create(name) {
    try {
      const projectPath = path.join(config.getDataPathForType('projects'), name);
      await fileSystem.ensureDir(projectPath);
      
      // Also create the cache directory
      const projectCachePath = path.join(config.getCachePath(), 'projects', name);
      await fileSystem.ensureDir(projectCachePath);
      
      const project = new Project(name);
      await project.save();
      
      return project;
    } catch (error) {
      logger.error(`Error creating project ${name}:`, error);
      throw error;
    }
  }
}

module.exports = Project;