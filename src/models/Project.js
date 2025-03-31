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
    // Generate highly optimized structure text content
    let structureContent = `# Project: ${this.name}\n\n`;
    structureContent += `# File Mapping Format: [Original Path] → [Project Path]\n\n`;
    
    // Find common prefixes in file paths to reduce redundancy
    const sortedFiles = [...this.files]
      .filter(file => file.fullOriginalPath) // Only include files with complete path info
      .sort((a, b) => a.fullOriginalPath.localeCompare(b.fullOriginalPath));
    
    if (sortedFiles.length === 0) {
      structureContent += "No files with path information available.\n";
      await fileSystem.writeFile(this.getStructurePath(), structureContent);
      
      // Save metadata to cache
      await this.saveProjectInfoToCache();
      
      // Save analysis if it exists
      if (this.instructions) {
        await fileSystem.writeFile(this.getAnalysisPath(), this.instructions);
      }
      
      return;
    }
    
    // Group files by directory for more efficient representation
    const filesByDir = {};
    
    for (const file of sortedFiles) {
      const origPath = file.fullOriginalPath;
      const origDir = path.dirname(origPath);
      
      if (!filesByDir[origDir]) {
        filesByDir[origDir] = [];
      }
      
      filesByDir[origDir].push({
        filename: path.basename(origPath),
        newPath: file.newPath,
        fullPath: origPath
      });
    }
    
    // Find the common prefix of all directories to further reduce redundancy
    const allDirs = Object.keys(filesByDir);
    let commonPrefix = "";
    
    if (allDirs.length > 0) {
      // Find common prefix among all directories
      const firstDir = allDirs[0];
      const dirParts = firstDir.split(path.sep);
      
      for (let i = 0; i < dirParts.length; i++) {
        const prefix = dirParts.slice(0, i + 1).join(path.sep);
        
        if (allDirs.every(dir => dir === prefix || dir.startsWith(prefix + path.sep))) {
          commonPrefix = prefix;
        } else {
          break;
        }
      }
    }
    
    // Add common prefix information if found
    if (commonPrefix) {
      structureContent += `## Common Path Prefix: ${commonPrefix}\n`;
      structureContent += "All paths below are relative to this prefix unless they start with '/'\n\n";
    }
    
    // Format directories and files, removing common prefix
    const sortedDirs = Object.keys(filesByDir).sort();
    
    for (const dir of sortedDirs) {
      // Create relative directory path by removing common prefix
      let relDir = dir;
      if (commonPrefix && dir.startsWith(commonPrefix)) {
        relDir = dir.substring(commonPrefix.length);
        if (relDir.startsWith(path.sep)) {
          relDir = relDir.substring(1);
        }
        if (!relDir) {
          relDir = '.'; // Root directory
        }
      }
      
      // Only add directory headers for directories with multiple files
      if (filesByDir[dir].length > 1) {
        structureContent += `## ${relDir || '.'}\n`;
      }
      
      // Add files with short paths
      for (const file of filesByDir[dir]) {
        const displayPath = relDir ? `${relDir}/${file.filename}` : file.filename;
        structureContent += `${displayPath} → ${file.newPath}\n`;
        
        // Also add full mapping for completeness and to ensure we can parse it later
        structureContent += `# Full: ${file.fullPath} → ${file.newPath}\n`;
      }
      
      structureContent += '\n';
    }
    
    // Add source directories information (important for updating)
    if (this.sourceDirectories && this.sourceDirectories.length > 0) {
      structureContent += `# Source Directories:\n`;
      this.sourceDirectories.forEach(dir => {
        structureContent += `# - ${dir}\n`;
      });
      structureContent += '\n';
    }
    
    // Save to structure.txt
    await fileSystem.writeFile(this.getStructurePath(), structureContent);
    
    // Save metadata to cache
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
    try {
      const dataPath = config.getDataPathForType('projects');
      let dataFiles = [];
      
      try {
        dataFiles = await fileSystem.listFiles(dataPath);
        const validProjects = [];
        
        for (const file of dataFiles) {
          try {
            const fullPath = path.join(dataPath, file);
            const stats = await fs.stat(fullPath);
            
            // Only include directories
            if (stats.isDirectory()) {
              // A valid project should have a structure.txt file or metadata.json file
              const hasStructure = await fileSystem.fileExists(path.join(fullPath, 'structure.txt'));
              const hasMetadata = await fileSystem.fileExists(path.join(fullPath, 'metadata.json'));
              
              if (hasStructure || hasMetadata) {
                validProjects.push(file);
              }
            }
          } catch (error) {
            // Skip this file if we can't access it
            logger.debug(`Could not access ${file}: ${error.message}`);
          }
        }
        
        dataFiles = validProjects;
      } catch (error) {
        logger.debug(`No data projects directory or error reading it: ${error.message}`);
        dataFiles = [];
      }
      
      // Check for projects in the cache
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
        .map(file => file.replace(/-info\.json$/, ''));
      
      const allProjects = [...new Set([...dataFiles, ...cacheProjects])];
      
      logger.debug('Data projects:', dataFiles);
      logger.debug('Cache projects:', cacheProjects);
      logger.debug('All projects:', allProjects);
      
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