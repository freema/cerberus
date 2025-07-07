/**
 * Bundle Creator - Utility for creating file bundles for Claude Projects
 */
const fs = require('fs-extra');
const path = require('path');
const logger = require('./logger');
const config = require('./config');
const fileSystem = require('./fileSystem');
const pathHelper = require('./pathHelper');

class BundleCreator {
  constructor() {
    // Get bundle config from app config with fallbacks
    const appBundleConfig = config.get('bundle', {});
    this.bundleConfig = {
      maxFilesPerBundle: appBundleConfig.maxFilesPerBundle || 50,
      bundleFormat: appBundleConfig.bundleFormat || 'markdown',
      includeEmptyFiles: appBundleConfig.includeEmptyFiles || false,
      maxFileSizeForBundle: appBundleConfig.maxFileSizeForBundle || 1048576, // 1MB
      maxBundleSize: appBundleConfig.maxBundleSize || 5242880, // 5MB warning threshold
    };
  }

  /**
   * Get language identifier for syntax highlighting
   * @param {string} filePath - Path to the file
   * @returns {string} - Language identifier
   */
  getLanguageFromPath(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap = {
      '.js': 'javascript',
      '.jsx': 'jsx',
      '.ts': 'typescript',
      '.tsx': 'tsx',
      '.py': 'python',
      '.php': 'php',
      '.html': 'html',
      '.htm': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.json': 'json',
      '.xml': 'xml',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.md': 'markdown',
      '.txt': 'text',
      '.sh': 'bash',
      '.sql': 'sql',
      '.java': 'java',
      '.c': 'c',
      '.cpp': 'cpp',
      '.h': 'c',
      '.hpp': 'cpp',
      '.cs': 'csharp',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.dart': 'dart',
      '.r': 'r',
      '.m': 'matlab',
      '.pl': 'perl',
      '.scala': 'scala',
    };
    
    return languageMap[ext] || 'text';
  }

  /**
   * Check if file should be included in bundle
   * @param {string} filePath - Path to the file
   * @param {Object} stats - File stats
   * @returns {boolean} - Whether to include the file
   */
  shouldIncludeFile(filePath, stats) {
    // Skip directories
    if (stats.isDirectory()) {
      return false;
    }

    // Skip if file is too large
    if (stats.size > this.bundleConfig.maxFileSizeForBundle) {
      logger.warn(`Skipping large file: ${filePath} (${Math.round(stats.size / 1024)}KB)`);
      return false;
    }

    // Skip empty files if configured
    if (!this.bundleConfig.includeEmptyFiles && stats.size === 0) {
      return false;
    }

    // Skip binary files (basic check)
    const ext = path.extname(filePath).toLowerCase();
    const binaryExtensions = ['.exe', '.dll', '.so', '.dylib', '.bin', '.img', '.iso', 
                              '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.svg',
                              '.mp3', '.mp4', '.avi', '.mkv', '.mov', '.wav', '.ogg',
                              '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
                              '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'];
    
    if (binaryExtensions.includes(ext)) {
      logger.debug(`Skipping binary file: ${filePath}`);
      return false;
    }

    return true;
  }

  /**
   * Read and validate file content
   * @param {string} filePath - Path to the file
   * @returns {Promise<string|null>} - File content or null if invalid
   */
  async readFileContent(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // Basic check for binary content (null bytes)
      if (content.includes('\0')) {
        logger.debug(`Skipping binary file detected by content: ${filePath}`);
        return null;
      }
      
      return content;
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.warn(`File not found: ${filePath}`);
      } else {
        logger.warn(`Error reading file ${filePath}: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * Create bundle header with metadata
   * @param {Object} bundleInfo - Bundle information
   * @returns {string} - Formatted header
   */
  createBundleHeader(bundleInfo) {
    const timestamp = new Date().toISOString();
    return `# CODE_BUNDLE_START
## Project: ${bundleInfo.projectName}
## Created: ${timestamp}
## Total Files: ${bundleInfo.totalFiles}
## Bundle: ${bundleInfo.bundleNumber} of ${bundleInfo.totalBundles}
${bundleInfo.description ? `## Description: ${bundleInfo.description}` : ''}

---

`;
  }

  /**
   * Create bundle footer
   * @returns {string} - Formatted footer
   */
  createBundleFooter() {
    return '\n# CODE_BUNDLE_END\n';
  }

  /**
   * Format file entry for bundle
   * @param {string} originalPath - Original file path
   * @param {string} content - File content
   * @returns {string} - Formatted file entry
   */
  formatFileEntry(originalPath, content) {
    const language = this.getLanguageFromPath(originalPath);
    
    return `### FILE: ${originalPath}
\`\`\`${language}
${content}
\`\`\`

---

`;
  }

  /**
   * Create a single bundle with all project files
   * @param {Object} project - Project instance
   * @returns {Promise<Object>} - Bundle creation result
   */
  async createSingleBundle(project) {
    logger.info(`Creating single bundle for project: ${project.name}`);
    
    const projectDir = project.getProjectPath();
    const files = await this.getProjectFiles(projectDir);
    
    if (files.length === 0) {
      throw new Error('No files found in project');
    }

    const bundleInfo = {
      projectName: project.name,
      totalFiles: files.length,
      bundleNumber: 1,
      totalBundles: 1,
      description: `Complete project bundle containing all ${files.length} files`
    };

    let bundleContent = this.createBundleHeader(bundleInfo);
    let bundleSize = bundleContent.length;

    for (const file of files) {
      const content = await this.readFileContent(file.fullPath);
      if (content !== null) {
        const fileEntry = this.formatFileEntry(file.originalPath, content);
        bundleContent += fileEntry;
        bundleSize += fileEntry.length;
      }
    }

    bundleContent += this.createBundleFooter();

    // Check bundle size
    if (bundleSize > this.bundleConfig.maxBundleSize) {
      logger.warn(`Bundle size (${Math.round(bundleSize / 1024 / 1024)}MB) exceeds recommended limit`);
    }

    return {
      bundles: [{
        filename: `${project.name}-bundle-1.md`,
        content: bundleContent,
        size: bundleSize,
        fileCount: files.length
      }],
      totalFiles: files.length,
      totalSize: bundleSize
    };
  }

  /**
   * Create multiple bundles with specified max files per bundle
   * @param {Object} project - Project instance
   * @param {number} maxFilesPerBundle - Maximum files per bundle
   * @returns {Promise<Object>} - Bundle creation result
   */
  async createMultipleBundles(project, maxFilesPerBundle = this.bundleConfig.maxFilesPerBundle) {
    logger.info(`Creating multiple bundles for project: ${project.name} (max ${maxFilesPerBundle} files per bundle)`);
    
    const projectDir = project.getProjectPath();
    const files = await this.getProjectFiles(projectDir);
    
    if (files.length === 0) {
      throw new Error('No files found in project');
    }

    const totalBundles = Math.ceil(files.length / maxFilesPerBundle);
    const bundles = [];
    let totalSize = 0;

    for (let i = 0; i < totalBundles; i++) {
      const startIndex = i * maxFilesPerBundle;
      const endIndex = Math.min(startIndex + maxFilesPerBundle, files.length);
      const bundleFiles = files.slice(startIndex, endIndex);

      const bundleInfo = {
        projectName: project.name,
        totalFiles: files.length,
        bundleNumber: i + 1,
        totalBundles: totalBundles,
        description: `Bundle ${i + 1} containing files ${startIndex + 1}-${endIndex} of ${files.length}`
      };

      let bundleContent = this.createBundleHeader(bundleInfo);

      for (const file of bundleFiles) {
        const content = await this.readFileContent(file.fullPath);
        if (content !== null) {
          bundleContent += this.formatFileEntry(file.originalPath, content);
        }
      }

      bundleContent += this.createBundleFooter();

      const bundleSize = bundleContent.length;
      totalSize += bundleSize;

      bundles.push({
        filename: `${project.name}-bundle-${i + 1}.md`,
        content: bundleContent,
        size: bundleSize,
        fileCount: bundleFiles.length
      });

      if (bundleSize > this.bundleConfig.maxBundleSize) {
        logger.warn(`Bundle ${i + 1} size (${Math.round(bundleSize / 1024 / 1024)}MB) exceeds recommended limit`);
      }
    }

    return {
      bundles,
      totalFiles: files.length,
      totalSize
    };
  }

  /**
   * Create custom bundle with selected files
   * @param {Object} project - Project instance
   * @param {Array} selectedFiles - Array of selected file paths
   * @returns {Promise<Object>} - Bundle creation result
   */
  async createCustomBundle(project, selectedFiles) {
    logger.info(`Creating custom bundle for project: ${project.name} with ${selectedFiles.length} selected files`);
    
    const projectDir = project.getProjectPath();
    const allFiles = await this.getProjectFiles(projectDir);
    
    // Filter to only selected files
    const files = allFiles.filter(file => 
      selectedFiles.includes(file.originalPath) || selectedFiles.includes(file.flattenedName)
    );

    if (files.length === 0) {
      throw new Error('No valid files selected');
    }

    const bundleInfo = {
      projectName: project.name,
      totalFiles: files.length,
      bundleNumber: 1,
      totalBundles: 1,
      description: `Custom bundle with ${files.length} selected files`
    };

    let bundleContent = this.createBundleHeader(bundleInfo);

    for (const file of files) {
      const content = await this.readFileContent(file.fullPath);
      if (content !== null) {
        bundleContent += this.formatFileEntry(file.originalPath, content);
      }
    }

    bundleContent += this.createBundleFooter();

    return {
      bundles: [{
        filename: `${project.name}-custom-bundle.md`,
        content: bundleContent,
        size: bundleContent.length,
        fileCount: files.length
      }],
      totalFiles: files.length,
      totalSize: bundleContent.length
    };
  }

  /**
   * Generate system message for Claude Projects
   * @param {Object} bundleResult - Result from bundle creation
   * @param {Object} project - Project instance
   * @returns {string} - Formatted system message
   */
  generateSystemMessage(bundleResult, project) {
    const bundleCount = bundleResult.bundles.length;
    const totalFiles = bundleResult.totalFiles;
    
    return `You are working with a code bundle containing multiple files from the "${project.name}" project.

## Bundle Format:
Each file in the bundle is marked with:
### FILE: [path/to/file]

## Important Instructions:
1. When referencing code, ALWAYS specify the exact file path using: \`path/to/file\`
2. When suggesting changes, use: "In file \`path/to/file\`, change..."
3. When creating new files, use: "Create new file \`path/to/newfile.ext\` with:"
4. Maintain awareness that you're working with ${totalFiles} files across ${bundleCount} bundle(s)

## Project Structure:
The files follow the original project structure. Use the file paths to understand the project organization.

## Bundle Information:
- Total files: ${totalFiles}
- Number of bundles: ${bundleCount}
- Total size: ${Math.round(bundleResult.totalSize / 1024)}KB

${bundleCount > 1 ? `
## Working with Multiple Bundles:
This project is split across ${bundleCount} bundles. Make sure to:
1. Upload ALL bundles to your Claude Project
2. Reference the correct bundle when discussing specific files
3. Consider the complete project context across all bundles
` : ''}

Please confirm you understand the bundle format and are ready to work with the ${project.name} project files.`;
  }

  /**
   * Get all project files with metadata
   * @param {string} projectDir - Project directory path
   * @returns {Promise<Array>} - Array of file objects
   */
  async getProjectFiles(projectDir) {
    const files = [];
    
    try {
      const entries = await fs.readdir(projectDir);
      
      for (const entry of entries) {
        const fullPath = path.join(projectDir, entry);
        
        try {
          const stats = await fs.stat(fullPath);
          
          if (this.shouldIncludeFile(fullPath, stats)) {
            // Try to determine original path from filename
            const originalPath = this.getOriginalPathFromFlattenedName(entry);
            
            files.push({
              flattenedName: entry,
              originalPath: originalPath,
              fullPath: fullPath,
              size: stats.size
            });
          }
        } catch (error) {
          logger.debug(`Error processing file ${entry}: ${error.message}`);
        }
      }
    } catch (error) {
      logger.error(`Error reading project directory: ${error.message}`);
      throw error;
    }
    
    return files.sort((a, b) => a.originalPath.localeCompare(b.originalPath));
  }

  /**
   * Convert flattened filename back to original path
   * @param {string} flattenedName - Flattened filename
   * @returns {string} - Original path
   */
  getOriginalPathFromFlattenedName(flattenedName) {
    // Skip special files
    if (['structure.txt', 'metadata.json'].includes(flattenedName)) {
      return flattenedName;
    }
    
    // Convert underscores back to slashes
    return flattenedName.replace(/_/g, '/');
  }

  /**
   * Save bundles to project directory
   * @param {Object} project - Project instance
   * @param {Object} bundleResult - Bundle creation result
   * @returns {Promise<Array>} - Array of saved file paths
   */
  async saveBundles(project, bundleResult) {
    const bundleDir = path.join(project.getProjectPath(), 'bundles');
    await fs.ensureDir(bundleDir);

    const savedFiles = [];

    for (const bundle of bundleResult.bundles) {
      const bundlePath = path.join(bundleDir, bundle.filename);
      await fs.writeFile(bundlePath, bundle.content, 'utf8');
      savedFiles.push(bundlePath);
      logger.info(`Saved bundle: ${bundle.filename} (${Math.round(bundle.size / 1024)}KB, ${bundle.fileCount} files)`);
    }

    // Save system message
    const systemMessage = this.generateSystemMessage(bundleResult, project);
    const systemMessagePath = path.join(bundleDir, `${project.name}-claude-instructions.md`);
    await fs.writeFile(systemMessagePath, systemMessage, 'utf8');
    savedFiles.push(systemMessagePath);

    return savedFiles;
  }
}

module.exports = new BundleCreator();