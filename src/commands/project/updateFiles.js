/**
 * Update project files based on cache information
 */
const inquirer = require('inquirer');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');
const ora = require('ora');
const Project = require('../../models/Project');
const logger = require('../../utils/logger');
const { generateDirectoryLink } = require('../../utils/pathHelper');
const { selectAndLoadProject } = require('../../utils/projectHelper');

/**
 * Update project files from original sources
 * @param {string} [projectName] - Optional project name
 */
async function updateFiles(projectName) {
  logger.info('=== Update Project Files ===');

  try {
    // Load project using helper function
    const project = await selectAndLoadProject(projectName, {
      requireFiles: true,
      action: 'update'
    });
    
    if (!project) {
      return;
    }
    
    // Display project information and handle source directories
    displayProjectInfo(project);
    await validateAndUpdateSourceDirectories(project);
    
    // Get update approach and execute
    const updateApproach = await getUpdateApproach();
    if (updateApproach === 'cancel') {
      logger.info('Update cancelled.');
      return;
    }
    
    // Execute update based on approach
    await executeUpdate(project, updateApproach);
    
    // Complete the update process
    await completeUpdate(project);
    
    return project;
  } catch (error) {
    logger.error('Error updating project files:', error);
  }
}

/**
 * Display project information
 * @param {Project} project - Project instance
 */
function displayProjectInfo(project) {
  logger.info(chalk.cyan('\n=== Project Information ==='));
  logger.info(chalk.white(`Name: ${chalk.yellow(project.name)}`));
  logger.info(chalk.white(`Last Updated: ${chalk.yellow(new Date(project.lastUpdated).toLocaleString())}`));
  logger.info(chalk.white(`Files: ${chalk.yellow(project.files.length)}`));
  logger.info(chalk.white(`Source Directories: ${chalk.yellow(project.sourceDirectories.join(', ') || 'None')}`));
}

/**
 * Validate and update source directories
 * @param {Project} project - Project instance
 */
async function validateAndUpdateSourceDirectories(project) {
  const { validDirs, invalidDirs } = await validateSourceDirectories(project.sourceDirectories);
  
  if (invalidDirs.length > 0) {
    logger.warn('\nSome source directories no longer exist or are not accessible:');
    invalidDirs.forEach(dir => logger.warn(chalk.red(`- ${dir}`)));
    
    if (validDirs.length === 0) {
      const proceed = await askToAddNewDirectories('No valid source directories found. Do you want to add new source directories?');
      if (proceed) {
        await addNewSourceDirectories(project);
      } else {
        throw new Error('Update cancelled due to missing source directories.');
      }
    } else {
      await handlePartiallyValidDirectories(project, validDirs, invalidDirs);
    }
  }
}

/**
 * Validate source directories
 * @param {Array} directories - Array of directory paths
 * @returns {Promise<Object>} - Object with valid and invalid directories
 */
async function validateSourceDirectories(directories) {
  const validDirs = [];
  const invalidDirs = [];
  
  for (const dir of directories) {
    try {
      await fs.access(dir);
      validDirs.push(dir);
    } catch (error) {
      invalidDirs.push(dir);
    }
  }
  
  return { validDirs, invalidDirs };
}

/**
 * Handle partially valid directories scenario
 * @param {Project} project - Project instance
 * @param {Array} validDirs - Valid directories
 * @param {Array} invalidDirs - Invalid directories
 */
async function handlePartiallyValidDirectories(project, validDirs, invalidDirs) {
  logger.info(chalk.green('\nValid source directories:'));
  validDirs.forEach(dir => logger.info(chalk.green(`- ${dir}`)));
  
  const { removeInvalid } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'removeInvalid',
      message: 'Do you want to remove invalid source directories from the project?',
      default: true
    }
  ]);
  
  if (removeInvalid) {
    project.sourceDirectories = validDirs;
    await project.save();
    logger.success('Invalid source directories removed from project configuration.');
  }
  
  const addNew = await askToAddNewDirectories('Do you want to add new source directories?', false);
  if (addNew) {
    await addNewSourceDirectories(project);
  }
}

/**
 * Ask user if they want to add new directories
 * @param {string} message - Prompt message
 * @param {boolean} defaultValue - Default value
 * @returns {Promise<boolean>} - User response
 */
async function askToAddNewDirectories(message, defaultValue = true) {
  const { proceed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'proceed',
      message,
      default: defaultValue
    }
  ]);
  return proceed;
}

/**
 * Get update approach from user
 * @returns {Promise<string>} - Selected approach
 */
async function getUpdateApproach() {
  const { updateApproach } = await inquirer.prompt([
    {
      type: 'list',
      name: 'updateApproach',
      message: 'How would you like to update project files?',
      choices: [
        { 
          name: 'Update all files (check for new/modified files in all sources)', 
          value: 'all' 
        },
        { 
          name: 'Update only existing files (don\'t add new files)', 
          value: 'existing' 
        },
        { 
          name: 'Select specific files to update', 
          value: 'select' 
        },
        { 
          name: 'Cancel update', 
          value: 'cancel' 
        }
      ]
    }
  ]);
  
  return updateApproach;
}

/**
 * Execute update based on selected approach
 * @param {Project} project - Project instance
 * @param {string} approach - Update approach
 */
async function executeUpdate(project, approach) {
  switch (approach) {
    case 'all':
      await updateAllFiles(project);
      break;
    case 'existing':
      await updateExistingFiles(project);
      break;
    case 'select':
      await selectFilesToUpdate(project);
      break;
  }
}

/**
 * Complete the update process
 * @param {Project} project - Project instance
 */
async function completeUpdate(project) {
  // Save project after updates
  await project.save();
  
  // Show link to the project directory
  const projectDir = project.getProjectPath();
  const dirLink = generateDirectoryLink(projectDir);

  logger.info(chalk.cyan('\nProject directory: '));
  logger.info(chalk.blue.underline(dirLink));
  logger.info(chalk.white(projectDir));
}

/**
 * Add new source directories to the project
 * @param {Project} project - Project to update
 */
async function addNewSourceDirectories(project) {
  let continueAddingDirs = true;
  
  while (continueAddingDirs) {
    const { sourcePath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'sourcePath',
        message: 'Enter new source directory path:',
        validate: async input => {
          try {
            const stats = await fs.stat(input);
            if (!stats.isDirectory()) {
              return 'Path must be a directory.';
            }
            return true;
          } catch (error) {
            return 'Path does not exist or is not accessible.';
          }
        }
      }
    ]);
    
    // Add to project
    project.addSourceDirectory(sourcePath);
    logger.success(`Added source directory: ${sourcePath}`);
    
    // Ask if user wants to add more
    const { addMore } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addMore',
        message: 'Would you like to add more source directories?',
        default: false
      }
    ]);
    
    continueAddingDirs = addMore;
  }
  
  // Save the project with new source directories
  await project.save();
}

/**
 * Update all files in the project, checking for modifications and new files
 * @param {Project} project - Project to update
 */
async function updateAllFiles(project) {
  const spinner = ora('Scanning source directories for files...').start();
  
  try {
    // Prepare list of extensions from existing files
    const fileExtensions = new Set();
    project.files.forEach(file => {
      const ext = path.extname(file.originalPath);
      if (ext) fileExtensions.add(ext.toLowerCase());
    });
    
    // Get standard exclude directories from app config
    const config = require('../../utils/config');
    const excludeDirs = config.get('excludedDirs', ['node_modules', 'vendor', '.git', 'dist', 'build']);
    
    // Collect all files from source directories
    const allSourceFiles = [];
    let scannedDirsCount = 0;
    
    for (const dirPath of project.sourceDirectories) {
      spinner.text = `Scanning directory ${++scannedDirsCount}/${project.sourceDirectories.length}: ${dirPath}`;
      
      const dirFiles = await scanDirectory(dirPath, Array.from(fileExtensions), excludeDirs);
      allSourceFiles.push(...dirFiles);
    }
    
    spinner.text = `Found ${allSourceFiles.length} matching files in source directories`;
    spinner.succeed();
    
    // Map existing files for quick lookup
    const existingFiles = new Map();
    project.files.forEach(file => {
      if (file.fullOriginalPath) {
        existingFiles.set(file.fullOriginalPath, file);
      }
    });
    
    // Map new files by their full paths
    const sourceFilesMap = new Map();
    allSourceFiles.forEach(file => {
      sourceFilesMap.set(file.fullPath, file);
    });
    
    // Find new, modified, and unchanged files
    const newFiles = [];
    const modifiedFiles = [];
    const unchangedFiles = [];
    
    // Check for files that exist in source but not in project (new)
    for (const [fullPath, sourceFile] of sourceFilesMap.entries()) {
      if (!existingFiles.has(fullPath)) {
        newFiles.push(sourceFile);
      }
    }
    
    // Check for files that exist in both project and source (potentially modified)
    for (const [fullPath, existingFile] of existingFiles.entries()) {
      const sourceFile = sourceFilesMap.get(fullPath);
      
      if (sourceFile) {
        // Check if file has been modified since last update
        const sourceStats = await fs.stat(fullPath);
        const existingMtime = existingFile.mtime ? new Date(existingFile.mtime) : null;
        
        if (!existingMtime || sourceStats.mtime.getTime() > existingMtime.getTime() || 
            sourceStats.size !== (existingFile.size || 0)) {
          // File has been modified
          modifiedFiles.push({ ...sourceFile, existingFile });
        } else {
          // File has not changed
          unchangedFiles.push(existingFile);
        }
      } else {
        // File exists in project but not in source (might have been deleted or moved)
        // For now, keep it in project
        unchangedFiles.push(existingFile);
      }
    }
    
    // Show update summary
    logger.info(chalk.cyan('\n=== Update Summary ==='));
    logger.info(chalk.white(`New files found: ${chalk.green(newFiles.length)}`));
    logger.info(chalk.white(`Modified files: ${chalk.yellow(modifiedFiles.length)}`));
    logger.info(chalk.white(`Unchanged files: ${chalk.blue(unchangedFiles.length)}`));
    
    // Ask for confirmation
    const { confirmUpdate } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmUpdate',
        message: `Update ${newFiles.length + modifiedFiles.length} files?`,
        default: true
      }
    ]);
    
    if (!confirmUpdate) {
      logger.info('Update cancelled.');
      return;
    }
    
    // Process updates
    const updateSpinner = ora(`Updating project files...`).start();
    let updatedCount = 0;
    
    // Copy new files
    if (newFiles.length > 0) {
      updateSpinner.text = `Adding ${newFiles.length} new files...`;
      
      const newFilesInfo = [];
      for (const file of newFiles) {
        try {
          // Create flattened filename that encodes the path
          const flattenedName = file.relativePath.replace(/[\/\\]/g, '_');
          const targetPath = path.join(project.getProjectPath(), flattenedName);
          
          // Copy the file
          await fs.copy(file.fullPath, targetPath);
          
          const stats = await fs.stat(file.fullPath);
          
          // Store mapping information
          const fileInfo = {
            originalPath: file.relativePath,
            fullOriginalPath: file.fullPath,
            newPath: flattenedName,
            size: stats.size,
            mtime: stats.mtime.toISOString(),
            originalDirectory: path.dirname(file.fullPath),
            mappingInfo: `${file.fullPath} → ${flattenedName}`
          };
          
          newFilesInfo.push(fileInfo);
        } catch (error) {
          logger.error(`Error processing new file ${file.fullPath}:`, error);
        }
      }
      
      // Add new files to project
      project.addFiles(newFilesInfo);
      updatedCount += newFilesInfo.length;
    }
    
    // Update modified files
    if (modifiedFiles.length > 0) {
      updateSpinner.text = `Updating ${modifiedFiles.length} modified files...`;
      
      for (const file of modifiedFiles) {
        try {
          const { existingFile, fullPath } = file;
          const targetPath = path.join(project.getProjectPath(), existingFile.newPath);
          
          // Copy the updated file
          await fs.copy(fullPath, targetPath);
          
          // Update file metadata
          const stats = await fs.stat(fullPath);
          existingFile.size = stats.size;
          existingFile.mtime = stats.mtime.toISOString();
          
          updatedCount++;
        } catch (error) {
          logger.error(`Error updating file ${file.fullPath}:`, error);
        }
      }
    }
    
    updateSpinner.succeed(`Updated ${updatedCount} files successfully.`);
    
    // Update project files list - existing modified files are updated in-place
    // Add new files to the list
    project.updateTimestamp();
  } catch (error) {
    spinner.fail('Error scanning source directories');
    logger.error('Error updating project files:', error);
  }
}

/**
 * Scan a directory for files
 * @param {string} dirPath - Directory to scan
 * @param {Array<string>} extensions - File extensions to include
 * @param {Array<string>} excludeDirs - Directories to exclude
 * @returns {Promise<Array>} - Array of file objects
 */
async function scanDirectory(dirPath, extensions = [], excludeDirs = []) {
  const files = [];
  
  async function scan(currentPath, relativePath = '') {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relPath = path.join(relativePath, entry.name);
        
        if (entry.isDirectory()) {
          // Skip excluded directories
          if (excludeDirs.some(dir => entry.name === dir || entry.name.startsWith(dir + '/'))) {
            continue;
          }
          await scan(fullPath, relPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (extensions.length === 0 || extensions.includes(ext)) {
            files.push({
              fullPath,
              relativePath: relPath
            });
          }
        }
      }
    } catch (error) {
      logger.debug(`Error scanning directory ${currentPath}: ${error.message}`);
    }
  }
  
  await scan(dirPath);
  return files;
}

/**
 * Update only existing files in the project
 * @param {Project} project - Project to update
 */
async function updateExistingFiles(project) {
    const spinner = ora('Checking existing files for modifications...').start();
    
    try {
      // Check each file in the project for modifications
      const modifiedFiles = [];
      const missingFiles = [];
      const unchangedFiles = [];
      let checkedCount = 0;
      
      for (const file of project.files) {
        spinner.text = `Checking file ${++checkedCount}/${project.files.length}...`;
        
        // Skip files without original path information
        if (!file.fullOriginalPath) {
          unchangedFiles.push(file);
          continue;
        }
        
        try {
          // Check if original file exists
          const sourceStats = await fs.stat(file.fullOriginalPath);
          
          // Check if file has been modified
          const existingMtime = file.mtime ? new Date(file.mtime) : null;
          
          if (!existingMtime || sourceStats.mtime.getTime() > existingMtime.getTime() || 
              sourceStats.size !== (file.size || 0)) {
            // File has been modified
            modifiedFiles.push(file);
          } else {
            // File has not changed
            unchangedFiles.push(file);
          }
        } catch (error) {
          // File doesn't exist anymore in source
          missingFiles.push(file);
          unchangedFiles.push(file); // Keep the file in the project anyway
        }
      }
      
      spinner.succeed(`Found ${modifiedFiles.length} modified files, ${missingFiles.length} missing files.`);
      
      // Show update summary
      logger.info(chalk.cyan('\n=== Update Summary ==='));
      logger.info(chalk.white(`Modified files: ${chalk.yellow(modifiedFiles.length)}`));
      logger.info(chalk.white(`Missing source files: ${chalk.red(missingFiles.length)}`));
      logger.info(chalk.white(`Unchanged files: ${chalk.blue(unchangedFiles.length - missingFiles.length)}`));
      
      if (modifiedFiles.length === 0) {
        logger.info('No modified files to update.');
        return;
      }
      
      // Ask for confirmation
      const { confirmUpdate } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmUpdate',
          message: `Update ${modifiedFiles.length} modified files?`,
          default: true
        }
      ]);
      
      if (!confirmUpdate) {
        logger.info('Update cancelled.');
        return;
      }
      
      // Process updates
      const updateSpinner = ora(`Updating ${modifiedFiles.length} files...`).start();
      let updatedCount = 0;
      
      for (const file of modifiedFiles) {
        try {
          const targetPath = path.join(project.getProjectPath(), file.newPath);
          
          // Copy the updated file
          await fs.copy(file.fullOriginalPath, targetPath);
          
          // Update file metadata
          const stats = await fs.stat(file.fullOriginalPath);
          file.size = stats.size;
          file.mtime = stats.mtime.toISOString();
          
          updatedCount++;
        } catch (error) {
          logger.error(`Error updating file ${file.fullOriginalPath}:`, error);
        }
      }
      
      updateSpinner.succeed(`Updated ${updatedCount} files successfully.`);
      project.updateTimestamp();
    } catch (error) {
      spinner.fail('Error checking for file modifications');
      logger.error('Error updating project files:', error);
    }
  }
  
  /**
   * Let user select specific files to update
   * @param {Project} project - Project to update
   */
  async function selectFilesToUpdate(project) {
    const spinner = ora('Checking project files...').start();
    
    try {
      // Check each file in the project for modifications
      const fileStatuses = [];
      let checkedCount = 0;
      
      for (const file of project.files) {
        spinner.text = `Checking file ${++checkedCount}/${project.files.length}...`;
        
        // Skip files without original path information
        if (!file.fullOriginalPath) {
          fileStatuses.push({
            file,
            status: 'unknown',
            statusText: 'Unknown (no original path)'
          });
          continue;
        }
        
        try {
          // Check if original file exists
          const sourceStats = await fs.stat(file.fullOriginalPath);
          
          // Check if file has been modified
          const existingMtime = file.mtime ? new Date(file.mtime) : null;
          
          if (!existingMtime || sourceStats.mtime.getTime() > existingMtime.getTime() || 
              sourceStats.size !== (file.size || 0)) {
            // File has been modified
            fileStatuses.push({
              file,
              status: 'modified',
              statusText: 'Modified',
              stats: sourceStats
            });
          } else {
            // File has not changed
            fileStatuses.push({
              file,
              status: 'unchanged',
              statusText: 'Unchanged',
              stats: sourceStats
            });
          }
        } catch (error) {
          // File doesn't exist anymore in source
          fileStatuses.push({
            file,
            status: 'missing',
            statusText: 'Missing in source'
          });
        }
      }
      
      spinner.succeed(`Checked ${project.files.length} files.`);
      
      // Group files by status for display
      const modifiedFiles = fileStatuses.filter(item => item.status === 'modified');
      const missingFiles = fileStatuses.filter(item => item.status === 'missing');
      const unchangedFiles = fileStatuses.filter(item => item.status === 'unchanged');
      const unknownFiles = fileStatuses.filter(item => item.status === 'unknown');
      
      // Show summary
      logger.info(chalk.cyan('\n=== Files Status Summary ==='));
      logger.info(chalk.white(`Modified files: ${chalk.yellow(modifiedFiles.length)}`));
      logger.info(chalk.white(`Missing source files: ${chalk.red(missingFiles.length)}`));
      logger.info(chalk.white(`Unchanged files: ${chalk.blue(unchangedFiles.length)}`));
      logger.info(chalk.white(`Unknown status: ${chalk.gray(unknownFiles.length)}`));
      
      if (modifiedFiles.length === 0) {
        logger.info('No modified files to update.');
        const { checkNew } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'checkNew',
            message: 'Would you like to check for new files in source directories?',
            default: true
          }
        ]);
        
        if (checkNew) {
          return await updateAllFiles(project); // This will also check for new files
        }
        return;
      }
      
      // Prepare choices for selection - only show modified and missing files
      const choices = [
        ...modifiedFiles.map(item => ({
          name: `[${chalk.yellow('MODIFIED')}] ${item.file.fullOriginalPath} (${formatFileSize(item.stats.size)})`,
          value: item,
          checked: true // Pre-select modified files
        })),
        ...missingFiles.map(item => ({
          name: `[${chalk.red('MISSING')}] ${item.file.fullOriginalPath}`,
          value: item,
          checked: false
        }))
      ];
      
      if (choices.length === 0) {
        logger.info('No files available for selective update.');
        return;
      }
      
      // Let user select files
      const { selectedItems } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'selectedItems',
          message: 'Select files to update:',
          choices,
          pageSize: 20
        }
      ]);
      
      if (selectedItems.length === 0) {
        logger.info('No files selected for update.');
        return;
      }
      
      // Process selected files
      const updateSpinner = ora(`Updating ${selectedItems.length} selected files...`).start();
      let updatedCount = 0;
      
      for (const item of selectedItems) {
        try {
          // Skip missing files - they can't be updated
          if (item.status === 'missing') {
            continue;
          }
          
          const targetPath = path.join(project.getProjectPath(), item.file.newPath);
          
          // Copy the updated file
          await fs.copy(item.file.fullOriginalPath, targetPath);
          
          // Update file metadata
          const stats = await fs.stat(item.file.fullOriginalPath);
          item.file.size = stats.size;
          item.file.mtime = stats.mtime.toISOString();
          
          updatedCount++;
        } catch (error) {
          logger.error(`Error updating file ${item.file.fullOriginalPath}:`, error);
        }
      }
      
      updateSpinner.succeed(`Updated ${updatedCount} files successfully.`);
      project.updateTimestamp();
    } catch (error) {
      spinner.fail('Error processing files');
      logger.error('Error updating project files:', error);
    }
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
  
module.exports = updateFiles;