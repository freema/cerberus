const inquirer = require('inquirer');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');
const ora = require('ora');
const Project = require('../../models/Project');
const { projectPrompts } = require('../../cli/prompts');
const config = require('../../utils/config');
const logger = require('../../utils/logger');
const { generateDirectoryLink } = require('../../utils/pathHelper');
const { generateDirectoryStructure } = require('../../utils/directoryStructure');
const { selectAndLoadProject } = require('../../utils/projectHelper');

// Extension groups for different file types
const FILE_EXTENSION_GROUPS = {
  JavaScript: ['.js', '.jsx', '.ts', '.tsx'],
  PHP: ['.php'],
  Python: ['.py', '.pyw'],
  'CSS/HTML': ['.css', '.scss', '.html', '.htm'],
  Configuration: ['.json', '.yaml', '.yml', '.xml', '.config'],
  Documentation: ['.md', '.txt'],
  SQL: ['.sql'],
  Shell: ['.sh', '.bash'],
};

/**
 * Collect files for a project
 * @param {string} [projectName] - Optional project name
 */
async function collectFiles(projectName) {
  logger.info('=== Collect Project Files ===');

  try {
    // Handle project selection/creation using the helper
    const project = await handleProjectSelection(projectName);
    if (!project) return;
    
    projectName = project.name;

    // Collect source paths from user
    const sourcePaths = await collectSourcePaths();
    if (sourcePaths.length === 0) {
      logger.warn('No source paths specified. Operation cancelled.');
      return;
    }

    // Get file filtering preferences
    const filters = await getFileFilters();

    // Process files based on paths and filters
    const allFiles = await processSourcePaths(sourcePaths, filters, project);
    if (allFiles.length === 0) {
      return;
    }

    // Complete the file collection process
    await completeFileCollection(allFiles, project, projectName);

    return project;
  } catch (error) {
    logger.error('Error collecting files:', error);
  }
}

/**
 * Get all files in a directory matching the filters
 * @param {string} dirPath - Directory path
 * @param {Array} extensions - File extensions to include
 * @param {Array} excludeDirs - Directories to exclude
 * @param {Array} excludeExtensions - File extensions to exclude
 * @returns {Promise<Array>} - Array of file objects
 */
async function getFilesInDirectory(dirPath, extensions = null, excludeDirs = [], excludeExtensions = []) {
  const files = [];

  async function scanDirectory(currentPath, relativePath = '') {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      const relPath = path.join(relativePath, entry.name);

      // Skip excluded directories
      if (entry.isDirectory()) {
        if (excludeDirs.some(dir => entry.name === dir || entry.name.startsWith(dir + '/'))) {
          continue;
        }
        await scanDirectory(fullPath, relPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        
        // Skip excluded extensions
        if (excludeExtensions.includes(ext)) {
          continue;
        }
        
        // Check if file matches included extensions
        if (!extensions || extensions.includes(ext)) {
          files.push({
            fullPath,
            relativePath: relPath,
          });
        }
      }
    }
  }

  await scanDirectory(dirPath);
  return files;
}

/**
 * Copy files to the project directory
 * @param {Array} files - Array of file objects
 * @param {Project} project - Project to copy files to
 * @returns {Promise<Object>} - Results of the copy operation
 */
async function copyFilesToProject(files, project) {
  const projectDir = project.getProjectPath();
  const copiedFiles = [];

  // Create a map of existing files for quick lookup
  const existingFiles = new Map();
  project.files.forEach(file => {
    existingFiles.set(file.originalPath, file);
  });

  for (const file of files) {
    try {
      // Create a flattened filename that encodes the path
      const flattenedName = file.relativePath.replace(/[\/\\]/g, '_');

      // Check if file already exists and has been modified
      const existingFile = existingFiles.get(file.relativePath);
      let fileChanged = true;

      if (existingFile) {
        try {
          const currentStats = await fs.stat(file.fullPath);
          const existingSize = existingFile.size;
          const existingMtime = existingFile.mtime ? new Date(existingFile.mtime) : null;

          // If size and modification time are the same, consider file unchanged
          if (
            existingSize === currentStats.size &&
            existingMtime &&
            existingMtime.getTime() === currentStats.mtime.getTime()
          ) {
            fileChanged = false;
          }
        } catch (error) {
          // If error checking stats, assume file has changed
          fileChanged = true;
        }
      }

      // Copy the file if it's new or changed
      if (fileChanged) {
        const targetPath = path.join(projectDir, flattenedName);
        await fs.copy(file.fullPath, targetPath);

        const stats = await fs.stat(file.fullPath);

        // Store mapping information with additional source information
        const fileInfo = {
          originalPath: file.relativePath,
          fullOriginalPath: file.fullPath, // Store the full path for better context
          newPath: flattenedName,
          size: stats.size,
          mtime: stats.mtime.toISOString(),
          originalDirectory: path.dirname(file.fullPath),
          mappingInfo: `${file.fullPath} -> ${flattenedName}`, // For easy reference
        };

        copiedFiles.push(fileInfo);

        // Update or add to existing files
        existingFiles.set(file.relativePath, fileInfo);
      } else {
        // File is unchanged, but we still want to include it in our results
        copiedFiles.push(existingFile);
      }
    } catch (error) {
      logger.error(`Error processing ${file.relativePath}:`, error);
    }
  }

  // Update project files list
  project.files = Array.from(existingFiles.values());

  return { copiedFiles };
}

/**
 * Calculate total size of files
 * @param {Array} files - Array of file objects
 * @returns {Promise<number>} - Total size in bytes
 */
async function calculateTotalSize(files) {
  let totalSize = 0;

  for (const file of files) {
    try {
      const stats = await fs.stat(file.fullPath);
      totalSize += stats.size;
    } catch (error) {
      // Ignore errors
    }
  }

  return totalSize;
}

/**
 * Format file size to human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' bytes';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

/**
 * Parse multiple paths from a text input
 * @param {string} input - Text containing multiple paths
 * @returns {Array<string>} - Array of individual paths
 */
function parseMultiplePaths(input) {
  if (!input || typeof input !== 'string') {
    return [];
  }
  
  // Split the input by newlines, and filter out empty lines
  return input
    .split(/[\r\n]+/)
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

/**
 * Handle project selection, creation, and loading
 * @param {string} [projectName] - Optional project name
 * @returns {Promise<Project|null>} - Selected/created project or null
 */
async function handleProjectSelection(projectName) {
  // If project name is not provided, either open existing or create new
  if (!projectName) {
    const existingProjects = await Project.listAll();

    if (existingProjects.length > 0) {
      const { projectAction } = await inquirer.prompt([
        {
          type: 'list',
          name: 'projectAction',
          message: 'Select project action:',
          choices: [
            { name: 'Create a new project', value: 'create' },
            { name: 'Select an existing project', value: 'select' },
            { name: 'Update an existing project', value: 'update' },
            { name: 'Go back', value: 'back' },
          ],
        },
      ]);

      if (projectAction === 'back') {
        return null;
      } else if (projectAction === 'create') {
        const createProject = require('./createProject');
        return await createProject();
      } else if (projectAction === 'select' || projectAction === 'update') {
        const { selectedProject } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedProject',
            message: `Select a project to ${projectAction === 'update' ? 'update' : 'use'}:`,
            choices: existingProjects,
          },
        ]);

        const project = await Project.load(selectedProject);

        if (projectAction === 'update') {
          // Show existing project info before updating
          logger.info(`Updating project: ${selectedProject}`);
          logger.info(`Current files: ${project.files.length}`);
          logger.info(`Source directories: ${project.sourceDirectories.join(', ') || 'None'}`);

          // Confirm update
          const { confirmUpdate } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirmUpdate',
              message: 'This will add new files to the existing project. Continue?',
              default: true,
            },
          ]);

          if (!confirmUpdate) {
            logger.warn('Update cancelled.');
            return null;
          }
        }
        
        return project;
      }
    } else {
      logger.info('No existing projects found. Creating a new project...');
      const createProject = require('./createProject');
      return await createProject();
    }
  } else {
    // Try to load the specified project
    try {
      return await Project.load(projectName);
    } catch (error) {
      logger.error(`Project "${projectName}" not found.`);

      const { createNewProject } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'createNewProject',
          message: `Project "${projectName}" not found. Would you like to create it?`,
          default: true,
        },
      ]);

      if (createNewProject) {
        const createProject = require('./createProject');
        return await createProject();
      } else {
        return null;
      }
    }
  }
}

/**
 * Collect source paths from user input
 * @returns {Promise<Array>} - Array of path objects with path and type
 */
async function collectSourcePaths() {
  const sourcePaths = [];
  let continueAddingPaths = true;

  while (continueAddingPaths) {
    // Show current paths
    if (sourcePaths.length > 0) {
      logger.info(chalk.cyan('\nCurrent source paths:'));
      sourcePaths.forEach((p, index) => {
        logger.info(`  ${index + 1}. ${p.path} (${p.type})`);
      });
      logger.info('');
    }

    // Get input method
    const { inputMethod } = await inquirer.prompt([
      {
        type: 'list',
        name: 'inputMethod',
        message: 'How would you like to add paths?',
        choices: [
          { name: 'Enter a single path', value: 'single' },
          { name: 'Paste multiple paths at once', value: 'multiple' }
        ]
      }
    ]);

    if (inputMethod === 'single') {
      const pathObj = await getSinglePath();
      if (pathObj) {
        sourcePaths.push(pathObj);
        logger.info(`Added ${pathObj.type}: ${pathObj.path}`);
      }
    } else {
      const multiplePaths = await getMultiplePaths();
      sourcePaths.push(...multiplePaths);
    }

    // Ask if user wants to add more (only if at least one path is added)
    if (sourcePaths.length > 0) {
      const { addMore } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'addMore',
          message: 'Would you like to add more paths?',
          default: true,
        },
      ]);

      continueAddingPaths = addMore;
    }
  }

  return sourcePaths;
}

/**
 * Get a single path from user input
 * @returns {Promise<Object|null>} - Path object or null
 */
async function getSinglePath() {
  const { sourcePath } = await inquirer.prompt([
    {
      type: 'input',
      name: 'sourcePath',
      message: 'Enter path (file or directory):',
      validate: async input => {
        try {
          await fs.stat(input);
          return true;
        } catch (error) {
          return 'Path does not exist or is not accessible.';
        }
      },
    },
  ]);

  try {
    const stats = await fs.stat(sourcePath);
    const pathType = stats.isDirectory() ? 'directory' : 'file';
    return { path: sourcePath, type: pathType };
  } catch (error) {
    logger.error(`Error detecting path type: ${error.message}`);
    return null;
  }
}

/**
 * Get multiple paths from user input
 * @returns {Promise<Array>} - Array of path objects
 */
async function getMultiplePaths() {
  logger.info(chalk.cyan('\n=== MULTI-PATH INPUT ==='));
  logger.info(chalk.cyan('1. Paste multiple file paths below (one per line)'));
  logger.info(chalk.cyan('2. You can paste many paths at once or enter them individually'));
  logger.info(chalk.cyan('3. Press Enter on an empty line when finished'));
  logger.info(chalk.yellow('\n↓ Paste paths here ↓'));
  logger.info(chalk.gray('----------------------------------'));
  
  const lines = [];
  let done = false;
  
  while (!done) {
    const result = await inquirer.prompt([
      {
        type: 'input',
        name: 'line',
        message: ' ',
        prefix: ''
      }
    ]);
    
    const line = result.line.trim();
    
    if (line === '') {
      done = true;
    } else {
      lines.push(line);
    }
  }
  
  logger.info(chalk.gray('----------------------------------'));
  logger.info(chalk.green(`✓ Received ${lines.length} paths`));
  
  const multiPaths = lines.join('\n');
  const paths = parseMultiplePaths(multiPaths);
  const validPaths = [];

  for (const path of paths) {
    try {
      const stats = await fs.stat(path);
      const pathType = stats.isDirectory() ? 'directory' : 'file';
      validPaths.push({ path, type: pathType });
    } catch (error) {
      logger.error(`Skipping invalid path: ${path} - ${error.message}`);
    }
  }

  logger.info(`Added ${validPaths.length} valid paths out of ${paths.length} provided.`);
  return validPaths;
}

/**
 * Get file filtering preferences from user
 * @returns {Promise<Object>} - Filter configuration
 */
async function getFileFilters() {
  // Select file types
  const { selectedGroups } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedGroups',
      message: 'Select file types to include:',
      choices: Object.keys(FILE_EXTENSION_GROUPS).map(group => ({
        name: `${group} (${FILE_EXTENSION_GROUPS[group].join(', ')})`,
        value: group,
        checked: true,
      })),
    },
  ]);

  const selectedExtensions = selectedGroups.flatMap(group => FILE_EXTENSION_GROUPS[group]);

  // Directories to exclude
  const { excludeDirs } = await inquirer.prompt([
    {
      type: 'input',
      name: 'excludeDirs',
      message: 'Enter directories to exclude (comma-separated):',
      default: 'node_modules,vendor,dist,build,public,.git,__pycache__,coverage',
    },
  ]);

  const excludeList = excludeDirs
    .split(',')
    .map(dir => dir.trim())
    .filter(Boolean);
    
  // Files to exclude by extension
  const { excludeExtensions } = await inquirer.prompt([
    {
      type: 'input',
      name: 'excludeExtensions',
      message: 'Enter file extensions to exclude (comma-separated, include the dot):',
      default: '.lock,package-lock.json,.pyc',
    },
  ]);
  
  logger.info(chalk.yellow('Note: package-lock.json is excluded by default as analyzing it provides no value for Claude projects.'));
  
  const excludeExtensionsList = excludeExtensions
    .split(',')
    .map(ext => ext.trim())
    .filter(Boolean);

  return {
    selectedExtensions,
    excludeList,
    excludeExtensionsList,
  };
}

/**
 * Process source paths and collect files
 * @param {Array} sourcePaths - Array of path objects
 * @param {Object} filters - Filter configuration
 * @param {Project} project - Project instance
 * @returns {Promise<Array>} - Array of file objects
 */
async function processSourcePaths(sourcePaths, filters, project) {
  const allFiles = [];
  const spinner = ora('Scanning for files...').start();

  // Process each path
  for (const sourcePath of sourcePaths) {
    if (sourcePath.type === 'directory') {
      // Handle directory
      const dirFiles = await getFilesInDirectory(
        sourcePath.path,
        filters.selectedExtensions,
        filters.excludeList,
        filters.excludeExtensionsList
      );
      allFiles.push(...dirFiles);

      // Add to project source directories
      project.addSourceDirectory(sourcePath.path);
    } else {
      // Handle specific file
      const fileExt = path.extname(sourcePath.path).toLowerCase();
      
      // Skip excluded extensions for individual files too
      if (filters.excludeExtensionsList.includes(fileExt)) {
        logger.info(chalk.yellow(`Skipping excluded file extension: ${sourcePath.path}`));
        continue;
      }
      
      if (filters.selectedExtensions.includes(fileExt)) {
        const relPath = path.basename(sourcePath.path);
        allFiles.push({
          fullPath: sourcePath.path,
          relativePath: relPath,
        });
      }
    }
  }

  if (allFiles.length === 0) {
    spinner.fail('No matching files found.');
    return [];
  }

  const totalSize = await calculateTotalSize(allFiles);
  spinner.succeed(`Found ${allFiles.length} files (${formatFileSize(totalSize)}).`);

  // Display file summary
  displayFileSummary(allFiles);
  
  return allFiles;
}

/**
 * Display summary of collected files
 * @param {Array} allFiles - Array of file objects
 */
function displayFileSummary(allFiles) {
  // Group files by extension for display
  const filesByExt = {};
  allFiles.forEach(file => {
    const ext = path.extname(file.relativePath).toLowerCase();
    filesByExt[ext] = (filesByExt[ext] || 0) + 1;
  });

  logger.info(chalk.cyan('\nFiles by type:'));
  Object.entries(filesByExt)
    .sort((a, b) => b[1] - a[1])
    .forEach(([ext, count]) => {
      logger.info(`  ${ext || '(no extension)'}: ${count} files`);
    });
}

/**
 * Complete the file collection process
 * @param {Array} allFiles - Array of file objects
 * @param {Project} project - Project instance
 * @param {string} projectName - Project name
 */
async function completeFileCollection(allFiles, project, projectName) {
  // Confirm copy operation
  const { confirmCopy } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmCopy',
      message: `Copy ${allFiles.length} files to project "${projectName}"?`,
      default: true,
    },
  ]);

  if (!confirmCopy) {
    logger.warn('Copy operation cancelled.');
    return;
  }

  // Copy files
  const copySpinner = ora(`Copying files to project ${projectName}...`).start();
  const { copiedFiles } = await copyFilesToProject(allFiles, project);

  // Generate directory structure
  const directoryStructure = generateDirectoryStructure(copiedFiles);
  project.setDirectoryStructure(directoryStructure);

  // Save project metadata
  await project.save();
  copySpinner.succeed(`Copied ${copiedFiles.length} files to project: ${projectName}`);

  // Show project location
  displayProjectLocation(project);

  // Offer to analyze the project
  await offerProjectAnalysis(projectName, directoryStructure, project);
}

/**
 * Display project location information
 * @param {Project} project - Project instance
 */
function displayProjectLocation(project) {
  const projectDir = project.getProjectPath();
  const dirLink = generateDirectoryLink(projectDir);

  logger.info(chalk.cyan('\nFiles collected to: '));
  logger.info(chalk.blue.underline(dirLink));
  logger.info(
    chalk.yellow('You can click the link above to open the directory or copy the path below:')
  );
  logger.info(chalk.white(projectDir));
}

/**
 * Offer project analysis to user
 * @param {string} projectName - Project name
 * @param {string} directoryStructure - Directory structure content
 * @param {Project} project - Project instance
 */
async function offerProjectAnalysis(projectName, directoryStructure, project) {
  const { analyzeNow } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'analyzeNow',
      message: 'Would you like to analyze this project now (generate Claude instructions)?',
      default: true,
    },
  ]);

  if (analyzeNow) {
    const analyzeProject = require('./analyzeProject');
    await analyzeProject(projectName);
  } else {
    // Print the directory structure to console for easy copying
    logger.info(chalk.yellow('\n========= DIRECTORY STRUCTURE ========='));
    logger.info(directoryStructure);
    logger.info(chalk.yellow('========= END OF DIRECTORY STRUCTURE ========='));

    // Add the directory link again for convenience
    const projectDir = project.getProjectPath();
    const dirLink = generateDirectoryLink(projectDir);
    logger.info(chalk.cyan('\nProject directory: '));
    logger.info(chalk.blue.underline(dirLink));
    logger.info(chalk.white(projectDir));
  }
}

module.exports = collectFiles;
