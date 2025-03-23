const inquirer = require('inquirer');
const chalk = require('chalk');
const path = require('path');
const Project = require('../../models/Project');
const { projectPrompts } = require('../../cli/prompts');
const logger = require('../../utils/logger');

/**
 * Create a new project for Claude AI preparation
 */
async function createProject() {
  logger.info('=== Create New Project ===');

  try {
    // Get project name
    const projectName = await projectPrompts.projectName();
    
    // Validate project name
    if (!/^[a-zA-Z0-9_-]+$/.test(projectName)) {
      logger.error('Project name can only contain letters, numbers, hyphens and underscores');
      return;
    }
    
    // Check if project already exists
    const existingProjects = await Project.listAll();
    if (existingProjects.includes(projectName)) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: `Project "${projectName}" already exists. Do you want to overwrite it?`,
          default: false
        }
      ]);
      
      if (!overwrite) {
        logger.warn('Project creation cancelled.');
        return;
      }
    }
    
    // Create the project
    logger.info(`Creating project: ${projectName}`);
    const project = await Project.create(projectName);
    
    logger.success(`Project "${projectName}" created successfully.`);
    
    // Ask if user wants to collect files now
    const { collectNow } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'collectNow',
        message: 'Do you want to collect files for this project now?',
        default: true
      }
    ]);
    
    if (collectNow) {
      const collectFiles = require('./collectFiles');
      await collectFiles(projectName);
    }
    
    return project;
  } catch (error) {
    logger.error('Error creating project:', error);
  }
}

module.exports = createProject;