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
   * Get the project path
   * @returns {string} - Path to the project directory
   */
  getProjectPath() {
    // Use cache directory for project files
    return path.join(config.getCachePath(), 'projects', this.name);
  }

  /**
   * Get the analysis file path
   * @returns {string} - Path to the analysis file
   */
  getAnalysisPath() {
    return path.join(this.getProjectPath(), 'analysis.txt');
  }

  /**
   * Save the project metadata
   * @returns {Promise<void>}
   */
  async save() {
    try {
      this.lastUpdated = new Date().toISOString();
      const metadataPath = path.join(this.getProjectPath(), 'metadata.json');
      await fileSystem.saveToJson(metadataPath, this.toJSON());
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
    
    // Also save the instructions to an analysis.txt file
    try {
      fileSystem.writeFile(this.getAnalysisPath(), instructions);
      logger.debug(`Saved analysis to ${this.getAnalysisPath()}`);
    } catch (error) {
      logger.error(`Error saving analysis file for ${this.name}:`, error);
    }
  }

  /**
   * Load a project by name
   * @param {string} name - Project name
   * @returns {Promise<Project>} - Loaded project
   */
  static async load(name) {
    try {
      const metadataPath = path.join(config.getCachePath(), 'projects', name, 'metadata.json');
      const data = await fileSystem.readJson(metadataPath);
      return new Project(name, data);
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
      return await fileSystem.listFiles(path.join(config.getCachePath(), 'projects'));
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
      const projectPath = path.join(config.getCachePath(), 'projects', name);
      await fileSystem.ensureDir(projectPath);
      
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