const inquirer = require('inquirer');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');
const ora = require('ora');
const Project = require('../../models/Project');
const { projectPrompts } = require('../../cli/prompts');
const config = require('../../utils/config');
const logger = require('../../utils/logger');
const { generateDirectoryLink } = require('../../utils/pathUtils');

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
    let project;

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
          return;
        } else if (projectAction === 'create') {
          const createProject = require('./createProject');
          project = await createProject();

          // If project creation was cancelled or failed
          if (!project) return;

          projectName = project.name;
        } else if (projectAction === 'select' || projectAction === 'update') {
          const { selectedProject } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedProject',
              message: `Select a project to ${projectAction === 'update' ? 'update' : 'use'}:`,
              choices: existingProjects,
            },
          ]);

          projectName = selectedProject;
          project = await Project.load(projectName);

          if (projectAction === 'update') {
            // Show existing project info before updating
            logger.info(`Updating project: ${projectName}`);
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
              return;
            }
          }
        }
      } else {
        logger.info('No existing projects found. Creating a new project...');
        const createProject = require('./createProject');
        project = await createProject();

        // If project creation was cancelled or failed
        if (!project) return;

        projectName = project.name;
      }
    } else {
      // Try to load the specified project
      try {
        project = await Project.load(projectName);
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
          project = await createProject();
          if (!project) return;
          projectName = project.name;
        } else {
          return;
        }
      }
    }

    // At this point we have a valid project

    // Use a multi-path collection approach
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

      // Get path with auto-detection
      const { sourcePath } = await inquirer.prompt([
        {
          type: 'input',
          name: 'sourcePath',
          message: 'Enter path (file or directory):',
          validate: async input => {
            try {
              const stats = await fs.stat(input);
              return true;
            } catch (error) {
              return 'Path does not exist or is not accessible.';
            }
          },
        },
      ]);

      // Auto-detect if it's a file or directory
      try {
        const stats = await fs.stat(sourcePath);
        const pathType = stats.isDirectory() ? 'directory' : 'file';

        // Add to paths list
        sourcePaths.push({
          path: sourcePath,
          type: pathType,
        });

        logger.info(`Added ${pathType}: ${sourcePath}`);
      } catch (error) {
        logger.error(`Error detecting path type: ${error.message}`);
        continue;
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

    // If no paths were added, exit
    if (sourcePaths.length === 0) {
      logger.warn('No source paths specified. Operation cancelled.');
      return;
    }

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
        default: 'node_modules,vendor,dist,build,public,.git',
      },
    ]);

    const excludeList = excludeDirs
      .split(',')
      .map(dir => dir.trim())
      .filter(Boolean);

    // Process all paths and collect files
    const allFiles = [];
    const directories = [];
    let totalSize = 0;

    const spinner = ora('Scanning for files...').start();

    // Process each path
    for (const sourcePath of sourcePaths) {
      if (sourcePath.type === 'directory') {
        // Handle directory
        directories.push(sourcePath.path);
        const dirFiles = await getFilesInDirectory(
          sourcePath.path,
          selectedExtensions,
          excludeList
        );
        allFiles.push(...dirFiles);

        // Add to project source directories
        project.addSourceDirectory(sourcePath.path);
      } else {
        // Handle specific file
        const fileExt = path.extname(sourcePath.path).toLowerCase();
        if (selectedExtensions.includes(fileExt)) {
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
      return;
    }

    totalSize = await calculateTotalSize(allFiles);

    spinner.succeed(`Found ${allFiles.length} files (${formatFileSize(totalSize)}).`);

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

    // Copy the files
    const { copiedFiles } = await copyFilesToProject(allFiles, project);

    // Generate directory structure
    const directoryStructure = generateDirectoryStructure(copiedFiles);
    project.setDirectoryStructure(directoryStructure);

    // Save project metadata
    await project.save();

    copySpinner.succeed(`Copied ${copiedFiles.length} files to project: ${projectName}`);

    // Show link to the project directory
    const projectDir = project.getProjectPath();
    const dirLink = generateDirectoryLink(projectDir);

    logger.info(chalk.cyan('\nFiles collected to: '));
    logger.info(chalk.blue.underline(dirLink));
    logger.info(
      chalk.yellow('You can click the link above to open the directory or copy the path below:')
    );
    logger.info(chalk.white(projectDir));

    // Ask if user wants to analyze the project now
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
      logger.info(chalk.cyan('\nProject directory: '));
      logger.info(chalk.blue.underline(dirLink));
      logger.info(chalk.white(projectDir));
    }

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
 * @returns {Promise<Array>} - Array of file objects
 */
async function getFilesInDirectory(dirPath, extensions = null, excludeDirs = []) {
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
 * Generate a directory structure string for Claude instructions
 * @param {Array} files - Array of file objects
 * @returns {string} - Formatted directory structure
 */
function generateDirectoryStructure(files) {
  let directoryStructure = `# Project Structure and File Mapping\n\n`;

  // Part 1: Original directory structure by source directory
  directoryStructure += `## Original Directory Structure\n\n`;

  // Group files by their original directories
  const filesBySourceDir = {};

  files.forEach(file => {
    // Skip if missing source information
    if (!file.originalDirectory) return;

    if (!filesBySourceDir[file.originalDirectory]) {
      filesBySourceDir[file.originalDirectory] = [];
    }

    filesBySourceDir[file.originalDirectory].push(file);
  });

  // Output organized by source directories
  Object.keys(filesBySourceDir)
    .sort()
    .forEach(dir => {
      directoryStructure += `### ${dir}\n\n`;

      const filesInDir = filesBySourceDir[dir].sort((a, b) =>
        path.basename(a.originalPath).localeCompare(path.basename(b.originalPath))
      );

      filesInDir.forEach(file => {
        const fileName = path.basename(file.originalPath);
        directoryStructure += `- ${fileName}\n`;
      });

      directoryStructure += '\n';
    });

  // Part 2: Flat file structure in the project
  directoryStructure += `## Project Files (Flattened Structure)\n\n`;
  directoryStructure += `All files are stored with flattened names in the project directory.\n\n`;

  // Part 3: File mapping between original and project paths
  directoryStructure += `## File Mapping\n\n`;
  directoryStructure += `Original Path → Project Path\n\n`;

  // Sort files alphabetically by original path for easier reference
  const sortedFiles = [...files].sort((a, b) => {
    const aPath = a.fullOriginalPath || a.originalPath;
    const bPath = b.fullOriginalPath || b.originalPath;
    return aPath.localeCompare(bPath);
  });

  sortedFiles.forEach(file => {
    const origPath = file.fullOriginalPath || file.originalPath;
    directoryStructure += `- \`${origPath}\` → \`${file.newPath}\`\n`;
  });

  // Part 4: File statistics
  const extensions = {};
  files.forEach(file => {
    const ext = path.extname(file.originalPath);
    extensions[ext] = (extensions[ext] || 0) + 1;
  });

  directoryStructure += `\n## File Statistics\n\n`;
  directoryStructure += `Total files: ${files.length}\n\n`;
  directoryStructure += `Files by extension:\n`;

  Object.entries(extensions)
    .sort((a, b) => b[1] - a[1]) // Sort by count descending
    .forEach(([ext, count]) => {
      directoryStructure += `- ${ext || '(no extension)'}: ${count}\n`;
    });

  return directoryStructure;
}

module.exports = collectFiles;
