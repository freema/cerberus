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
    this.lastUpdated = data.lastUpdated || new Date().toISOString();
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
   * Get path to project metadata cache file
   * @returns {string} - Path to the project-info.json in cache
   */
  getProjectCachePath() {
    return path.join(config.getCachePathForType('projects'), `${this.name}-info.json`);
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
    
    // Save metadata to cache instead of project directory
    await this.saveProjectInfoToCache();

    // Save analysis if it exists
    if (this.instructions) {
      await fileSystem.writeFile(this.getAnalysisPath(), this.instructions);
    }
  }

  /**
   * Save project metadata to cache directory
   * @returns {Promise<void>}
   */
  async saveProjectInfoToCache() {
    // Create detailed project info with all data needed for updates
    const projectInfo = {
      name: this.name,
      lastUpdated: this.lastUpdated,
      createdAt: this.createdAt,
      fileCount: this.files.length,
      sourceDirectories: this.sourceDirectories,
      files: this.files.map(file => ({
        originalPath: file.originalPath,
        fullOriginalPath: file.fullOriginalPath,
        newPath: file.newPath,
        originalDirectory: file.originalDirectory,
        size: file.size,
        mtime: file.mtime
      }))
    };
    
    // Ensure cache directory exists
    await fileSystem.ensureDir(config.getCachePathForType('projects'));
    
    // Save to cache
    const cachePath = this.getProjectCachePath();
    await fileSystem.saveToJson(cachePath, projectInfo);
    logger.debug(`Project metadata saved to cache: ${cachePath}`);
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
   * Load a project from cache info
   * @returns {Promise<boolean>} - Whether the project info was loaded from cache
   */
  async loadFromCache() {
    try {
      const cachePath = this.getProjectCachePath();
      if (await fileSystem.fileExists(cachePath)) {
        const cacheData = await fileSystem.readJson(cachePath);
        
        // Update project with cache data
        this.lastUpdated = cacheData.lastUpdated;
        this.createdAt = cacheData.createdAt || this.createdAt;
        this.files = cacheData.files || [];
        this.sourceDirectories = cacheData.sourceDirectories || [];
        
        logger.debug(`Project loaded from cache: ${cachePath}`);
        return true;
      }
    } catch (error) {
      logger.debug(`Failed to load project from cache: ${error.message}`);
    }
    return false;
  }

  /**
   * Load a project by name
   * @param {string} name - Project name
   * @returns {Promise<Project>} - Loaded project
   */
  static async load(name) {
    try {
      const project = new Project(name);
      
      // Try to load from cache first
      const loadedFromCache = await project.loadFromCache();
      
      // If not in cache or cache load failed, check structure.txt
      if (!loadedFromCache) {
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
          
          // Save to cache for future use
          await project.saveProjectInfoToCache();
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
              
              // Convert to new format and save to cache
              await project.saveProjectInfoToCache();
              logger.info(`Converted project ${name} from legacy format to new format`);
            }
          } catch (legacyError) {
            // Just create a new empty project
            logger.debug(`No legacy metadata found for ${name}, starting with empty project`);
          }
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
    // Get project names from both data directory and cache
    try {
      const dataProjects = await super.listAll('projects');
      
      // Also check cache for any projects that might be there but not in data dir
      const cacheDir = config.getCachePathForType('projects');
      let cacheFiles = [];
      try {
        cacheFiles = await fileSystem.listFiles(cacheDir);
      } catch (error) {
        logger.debug('No cache projects directory or error reading it');
      }
      
      // Extract project names from cache files (format: name-info.json)
      const cacheProjects = cacheFiles
        .filter(file => file.endsWith('-info.json'))
        .map(file => file.replace('-info.json', ''));
      
      // Combine both sources and remove duplicates
      return [...new Set([...dataProjects, ...cacheProjects])];
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