/**
 * Project model class
 */
const path = require('path');
const BaseModel = require('./BaseModel');
const config = require('../utils/config');
const fileSystem = require('../utils/fileSystem');
const logger = require('../utils/logger');

class Project extends BaseModel {
  /**
   * Create a new Project instance
   * @param {string} name - Project name
   * @param {Object} data - Project data
   */
  constructor(name, data = {}) {
    super('projects', name, data);
    this.name = name;
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
    return path.join(config.getDataPath(), 'projects', this.name);
  }

  /**
   * Get the analysis file path
   * @returns {string} - Path to the analysis file
   */
  getAnalysisPath() {
    return path.join(this.getProjectPath(), 'analysis.txt');
  }
  
  /**
   * Get the structure file path
   * @returns {string} - Path to the structure file
   */
  getStructurePath() {
    return path.join(this.getProjectPath(), 'structure.txt');
  }

  /**
   * Get the file extension for this entity type
   * @returns {string} - File extension including dot
   */
  getFileExtension() {
    return ''; // Project is a directory, not a file
  }

  /**
   * Get the entity path
   * @returns {string} - Path to the entity directory
   */
  getPath() {
    return this.getProjectPath();
  }

  /**
   * Save to storage - implementation for Project
   * @param {string} filePath - Path to save to
   * @returns {Promise<void>}
   */
  async saveToStorage() {
    // Generate structure text content
    let structureContent = `# Project: ${this.name}\n`;
    structureContent += `# Last Updated: ${this.lastUpdated}\n`;
    structureContent += `# Source Directories: ${this.sourceDirectories.join(', ')}\n\n`;
    
    // Add file mapping
    structureContent += `# File Mapping (Original Path → Project Path)\n\n`;
    
    // Sort files by original path for consistency
    const sortedFiles = [...this.files].sort((a, b) => {
      const aPath = a.fullOriginalPath || a.originalPath;
      const bPath = b.fullOriginalPath || b.originalPath;
      return aPath.localeCompare(bPath);
    });
    
    for (const file of sortedFiles) {
      const origPath = file.fullOriginalPath || file.originalPath;
      structureContent += `${origPath} → ${file.newPath}\n`;
    }
    
    // If we have directory structure, add it
    if (this.directoryStructure) {
      structureContent += `\n# Directory Structure\n\n${this.directoryStructure}\n`;
    }
    
    // Save to structure.txt
    await fileSystem.writeFile(this.getStructurePath(), structureContent);
    
    // Also save minimal metadata as a simple backup
    const minimalData = {
      name: this.name,
      lastUpdated: this.lastUpdated,
      fileCount: this.files.length,
      sourceDirectories: this.sourceDirectories
    };
    
    const metaFilePath = path.join(this.getProjectPath(), 'project-info.json');
    await fileSystem.saveToJson(metaFilePath, minimalData);

    // Save analysis if it exists
    if (this.instructions) {
      await fileSystem.writeFile(this.getAnalysisPath(), this.instructions);
    }
  }

  /**
   * Convert to JSON representation
   * @returns {Object} - JSON representation of the entity
   */
  toJSON() {
    return {
      ...super.toJSON(),
      name: this.name,
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
      const project = new Project(name);
      const structurePath = project.getStructurePath();
      
      // Check if structure.txt exists
      const structureExists = await fileSystem.fileExists(structurePath);
      
      if (structureExists) {
        // Load structure.txt
        const structureContent = await fileSystem.readFile(structurePath);
        
        // Parse file mapping
        const files = [];
        const lines = structureContent.split('\n');
        let inFileMapping = false;
        
        for (const line of lines) {
          if (line.startsWith('# File Mapping')) {
            inFileMapping = true;
            continue;
          }
          
          if (inFileMapping && line.includes(' → ')) {
            const [origPath, newPath] = line.split(' → ');
            files.push({
              originalPath: path.basename(origPath),
              fullOriginalPath: origPath.trim(),
              newPath: newPath.trim(),
              originalDirectory: path.dirname(origPath.trim())
            });
          }
          
          // Extract directory structure if present
          if (line.startsWith('# Directory Structure')) {
            const structureIndex = lines.indexOf(line);
            if (structureIndex >= 0 && structureIndex + 1 < lines.length) {
              project.directoryStructure = lines.slice(structureIndex + 1).join('\n');
            }
            break;
          }
        }
        
        // Extract source directories
        const sourceDirsLine = lines.find(line => line.startsWith('# Source Directories:'));
        if (sourceDirsLine) {
          const dirs = sourceDirsLine.replace('# Source Directories:', '').trim();
          project.sourceDirectories = dirs.split(', ').filter(d => d.length > 0);
        }
        
        project.files = files;
      } else {
        // Try to load legacy metadata.json as fallback
        try {
          const legacyPath = path.join(config.getDataPath(), 'projects', name, 'metadata.json');
          if (await fileSystem.fileExists(legacyPath)) {
            const data = await fileSystem.readJson(legacyPath);
            project.files = data.files || [];
            project.sourceDirectories = data.sourceDirectories || [];
            project.directoryStructure = data.directoryStructure || '';
            project.instructions = data.instructions || '';
            project.createdAt = data.createdAt || new Date().toISOString();
            project.lastUpdated = data.lastUpdated || new Date().toISOString();
            
            // Convert to new format
            await project.save();
            logger.info(`Converted project ${name} from legacy format to new format`);
          }
        } catch (legacyError) {
          // Just create a new empty project
          logger.debug(`No legacy metadata found for ${name}, starting with empty project`);
        }
      }
      
      // Try to load analysis.txt if it exists
      const analysisPath = project.getAnalysisPath();
      if (await fileSystem.fileExists(analysisPath)) {
        project.instructions = await fileSystem.readFile(analysisPath);
      }
      
      return project;
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
    return super.listAll('projects');
  }

  /**
   * Create a new project
   * @param {string} name - Project name
   * @returns {Promise<Project>} - Created project
   */
  static async create(name) {
    try {
      await fileSystem.ensureDir(path.join(config.getDataPath(), 'projects', name));
      
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
