const inquirer = require('inquirer');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');
const ora = require('ora');
const Project = require('../../models/Project');
const { projectPrompts } = require('../../cli/prompts');
const config = require('../../utils/config');
const logger = require('../../utils/logger');

// Extension groups for different file types
const FILE_EXTENSION_GROUPS = {
  'JavaScript': ['.js', '.jsx', '.ts', '.tsx'],
  'PHP': ['.php'],
  'Python': ['.py', '.pyw'],
  'CSS/HTML': ['.css', '.scss', '.html', '.htm'],
  'Configuration': ['.json', '.yaml', '.yml', '.xml', '.config'],
  'Documentation': ['.md', '.txt'],
  'SQL': ['.sql'],
  'Shell': ['.sh', '.bash']
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
              { name: 'Go back', value: 'back' }
            ]
          }
        ]);
        
        if (projectAction === 'back') {
          return;
        } else if (projectAction === 'create') {
          const createProject = require('./createProject');
          project = await createProject();
          
          // If project creation was cancelled or failed
          if (!project) return;
          
          projectName = project.name;
        } else {
          const { selectedProject } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedProject',
              message: 'Select a project:',
              choices: existingProjects
            }
          ]);
          
          projectName = selectedProject;
          project = await Project.load(projectName);
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
            default: true
          }
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
    
    // Ask for the source directory
    const sourcePath = await projectPrompts.projectPath();
    
    // Validate source directory
    try {
      const stats = await fs.stat(sourcePath);
      if (!stats.isDirectory()) {
        logger.error('The specified path is not a directory.');
        return;
      }
    } catch (error) {
      logger.error('Directory does not exist or is not accessible.');
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
          checked: true
        }))
      }
    ]);
    
    const selectedExtensions = selectedGroups.flatMap(group => FILE_EXTENSION_GROUPS[group]);
    
    // Directories to exclude
    const { excludeDirs } = await inquirer.prompt([
      {
        type: 'input',
        name: 'excludeDirs',
        message: 'Enter directories to exclude (comma-separated):',
        default: 'node_modules,vendor,dist,build,public,.git'
      }
    ]);
    
    const excludeList = excludeDirs.split(',').map(dir => dir.trim()).filter(Boolean);
    
    // Start scanning for files
    const spinner = ora('Scanning for files...').start();
    
    const files = await getFilesInDirectory(sourcePath, selectedExtensions, excludeList);
    
    if (files.length === 0) {
      spinner.fail('No matching files found.');
      return;
    }
    
    const totalSize = await calculateTotalSize(files);
    
    spinner.succeed(`Found ${files.length} files (${formatFileSize(totalSize)}).`);
    
    // Group files by extension for display
    const filesByExt = {};
    files.forEach(file => {
      const ext = path.extname(file.relativePath).toLowerCase();
      filesByExt[ext] = (filesByExt[ext] || 0) + 1;
    });
    
    console.log(chalk.cyan('\nFiles by type:'));
    Object.entries(filesByExt)
      .sort((a, b) => b[1] - a[1])
      .forEach(([ext, count]) => {
        console.log(`  ${ext || '(no extension)'}: ${count} files`);
      });
    
    // Confirm copy operation
    const { confirmCopy } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmCopy',
        message: `Copy ${files.length} files to project "${projectName}"?`,
        default: true
      }
    ]);
    
    if (!confirmCopy) {
      logger.warn('Copy operation cancelled.');
      return;
    }
    
    // Ask if user wants to add another directory
    const { addAnother } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addAnother',
        message: 'Would you like to add files from another directory to this project?',
        default: false
      }
    ]);
    
    let additionalFiles = [];
    
    if (addAnother) {
      // Get additional directory
      const { additionalDir } = await inquirer.prompt([
        {
          type: 'input',
          name: 'additionalDir',
          message: 'Enter the additional source directory path:',
          validate: async input => {
            try {
              const stats = await fs.stat(input);
              if (!stats.isDirectory()) return 'This is not a directory';
              return true;
            } catch (error) {
              return 'Directory does not exist';
            }
          }
        }
      ]);
      
      const additionalSpinner = ora(`Scanning ${additionalDir} for files...`).start();
      
      // Get additional files
      additionalFiles = await getFilesInDirectory(additionalDir, selectedExtensions, excludeList);
      
      if (additionalFiles.length === 0) {
        additionalSpinner.fail('No matching files found in the additional directory.');
      } else {
        const additionalSize = await calculateTotalSize(additionalFiles);
        
        additionalSpinner.succeed(`Found ${additionalFiles.length} additional files (${formatFileSize(additionalSize)}).`);
        
        // Update file counts by extension
        additionalFiles.forEach(file => {
          const ext = path.extname(file.relativePath).toLowerCase();
          filesByExt[ext] = (filesByExt[ext] || 0) + 1;
        });
        
        // Update total size
        const newTotalSize = totalSize + additionalSize;
        
        console.log(chalk.cyan('\nUpdated files by type:'));
        Object.entries(filesByExt)
          .sort((a, b) => b[1] - a[1])
          .forEach(([ext, count]) => {
            console.log(`  ${ext || '(no extension)'}: ${count} files`);
          });
        
        console.log(chalk.green(`\nTotal files to copy: ${files.length + additionalFiles.length} (${formatFileSize(newTotalSize)})`));
      }
    }
    
    // Copy files
    const copySpinner = ora(`Copying files to project ${projectName}...`).start();
    
    // Combine all files
    const allFiles = [...files, ...additionalFiles];
    
    // Copy the files
    const { copiedFiles } = await copyFilesToProject(allFiles, project);
    
    // Add source directories to project
    project.addSourceDirectory(sourcePath);
    if (addAnother && additionalFiles.length > 0) {
      const { additionalDir } = inquirer.answers;
      project.addSourceDirectory(additionalDir);
    }
    
    // Generate directory structure
    const directoryStructure = generateDirectoryStructure(copiedFiles);
    project.setDirectoryStructure(directoryStructure);
    
    // Save project metadata
    await project.save();
    
    copySpinner.succeed(`Copied ${copiedFiles.length} files to project: ${projectName}`);
    
    // Ask if user wants to analyze the project now
    const { analyzeNow } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'analyzeNow',
        message: 'Would you like to analyze this project now (generate Claude instructions)?',
        default: true
      }
    ]);
    
    if (analyzeNow) {
      const analyzeProject = require('./analyzeProject');
      await analyzeProject(projectName);
    } else {
      // Print the directory structure to console for easy copying
      console.log(chalk.yellow('\n========= DIRECTORY STRUCTURE ========='));
      console.log(directoryStructure);
      console.log(chalk.yellow('========= END OF DIRECTORY STRUCTURE ========='));
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
            relativePath: relPath
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
          if (existingSize === currentStats.size && 
              existingMtime && 
              existingMtime.getTime() === currentStats.mtime.getTime()) {
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
        
        // Store mapping information
        const fileInfo = {
          originalPath: file.relativePath,
          newPath: flattenedName,
          size: stats.size,
          mtime: stats.mtime.toISOString()
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
  let directoryStructure = `Directory structure for this project:\n\n`;
  
  // Create a map of directories from the original paths
  const directories = new Map();
  
  files.forEach(file => {
    const dirName = path.dirname(file.originalPath);
    if (dirName !== '.') {
      if (!directories.has(dirName)) {
        directories.set(dirName, []);
      }
      directories.get(dirName).push(path.basename(file.originalPath));
    }
  });
  
  // Sort directories for nicer output
  const sortedDirs = Array.from(directories.keys()).sort();
  
  // Build the directory structure string
  sortedDirs.forEach(dir => {
    directoryStructure += `- ${dir}/\n`;
    directories.get(dir).forEach(file => {
      directoryStructure += `  - ${file}\n`;
    });
  });
  
  // Files in root directory
  const rootFiles = files
    .filter(file => path.dirname(file.originalPath) === '.')
    .map(file => path.basename(file.originalPath));
  
  if (rootFiles.length > 0) {
    directoryStructure += `- Root files:\n`;
    rootFiles.forEach(file => {
      directoryStructure += `  - ${file}\n`;
    });
  }
  
  return directoryStructure;
}

module.exports = collectFiles;