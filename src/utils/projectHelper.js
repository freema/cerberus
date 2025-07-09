/**
 * Shared utility functions for project operations
 * Eliminates code duplication across command files
 */
const inquirer = require('inquirer');
const Project = require('../models/Project');
const logger = require('./logger');

/**
 * Handle project selection with automatic fallback to creation
 * @param {string} [projectName] - Optional project name
 * @param {Object} options - Configuration options
 * @param {boolean} options.allowCreate - Allow creating new project if none exist
 * @param {string} options.action - Action being performed (for messages)
 * @returns {Promise<string|null>} - Selected project name or null
 */
async function selectProject(projectName, options = {}) {
  const { allowCreate = true, action = 'work with' } = options;
  
  const existingProjects = await Project.listAll();
  
  // If no projects exist
  if (existingProjects.length === 0) {
    logger.warn('No projects found.');
    
    if (!allowCreate) {
      logger.warn('Please create a project first.');
      return null;
    }
    
    const { createNew } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'createNew',
        message: 'Would you like to create a new project?',
        default: true,
      },
    ]);
    
    if (createNew) {
      const createProject = require('../commands/project/createProject');
      const project = await createProject();
      return project ? project.name : null;
    }
    
    return null;
  }
  
  // If project name was provided, validate it exists
  if (projectName) {
    if (existingProjects.includes(projectName)) {
      return projectName;
    } else {
      logger.error(`Project "${projectName}" not found.`);
      // Continue to prompt for selection
    }
  }
  
  // Prompt user to select a project
  const { selectedProject } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedProject',
      message: `Select a project to ${action}:`,
      choices: [...existingProjects, { name: 'Cancel', value: 'cancel' }],
    },
  ]);
  
  if (selectedProject === 'cancel') {
    logger.info('Operation cancelled.');
    return null;
  }
  
  return selectedProject;
}

/**
 * Load project with error handling and validation
 * @param {string} projectName - Project name to load
 * @param {Object} options - Configuration options
 * @param {boolean} options.requireFiles - Require project to have files
 * @param {string} options.action - Action being performed (for messages)
 * @returns {Promise<Project|null>} - Loaded project or null
 */
async function loadProject(projectName, options = {}) {
  const { requireFiles = false, action = 'work with' } = options;
  
  try {
    const project = await Project.load(projectName);
    
    // Validate project has files if required
    if (requireFiles && (!project.files || project.files.length === 0)) {
      logger.warn(`Project "${projectName}" has no files.`);
      
      const { collectNow } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'collectNow',
          message: 'Would you like to collect files now?',
          default: true,
        },
      ]);
      
      if (collectNow) {
        const collectFiles = require('../commands/project/collectFiles');
        const updatedProject = await collectFiles(projectName);
        return updatedProject;
      } else {
        return null;
      }
    }
    
    logger.success(`Project "${projectName}" loaded successfully.`);
    return project;
    
  } catch (error) {
    logger.error(`Error loading project "${projectName}":`, error);
    return null;
  }
}

/**
 * Combined project selection and loading with all validation
 * @param {string} [projectName] - Optional project name
 * @param {Object} options - Configuration options
 * @returns {Promise<Project|null>} - Loaded project or null
 */
async function selectAndLoadProject(projectName, options = {}) {
  const selectedName = await selectProject(projectName, options);
  if (!selectedName) {
    return null;
  }
  
  return await loadProject(selectedName, options);
}

/**
 * Display confirmation dialog for actions
 * @param {string} message - Confirmation message
 * @param {boolean} defaultValue - Default value
 * @returns {Promise<boolean>} - User confirmation
 */
async function confirmAction(message, defaultValue = true) {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: defaultValue,
    },
  ]);
  
  return confirmed;
}

/**
 * Handle common error cases with user-friendly messages
 * @param {Error} error - Error to handle
 * @param {string} action - Action that failed
 */
function handleProjectError(error, action = 'project operation') {
  if (error.code === 'ENOENT') {
    logger.error(`File or directory not found during ${action}.`);
  } else if (error.code === 'EACCES') {
    logger.error(`Permission denied during ${action}.`);
  } else {
    logger.error(`Error during ${action}:`, error);
  }
}

module.exports = {
  selectProject,
  loadProject,
  selectAndLoadProject,
  confirmAction,
  handleProjectError,
};