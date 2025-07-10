const inquirer = require('inquirer');
const chalk = require('chalk');
const Project = require('../../models/Project');
const logger = require('../../utils/logger');

/**
 * Open an existing project
 * @param {string} [projectName] - Optional project name to open
 * @returns {Promise<Project|null>} - The opened project or null
 */
async function openProject(projectName) {
  logger.info('=== Open Existing Project ===');

  try {
    const existingProjects = await Project.listAll();

    if (existingProjects.length === 0) {
      logger.warn('No projects found. Please create a new project first.');

      const { createNew } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'createNew',
          message: 'Would you like to create a new project?',
          default: true,
        },
      ]);

      if (createNew) {
        const createProject = require('./createProject');
        return await createProject();
      }

      return null;
    }

    // If a project name was provided, try to open it directly
    if (projectName) {
      if (existingProjects.includes(projectName)) {
        return await Project.load(projectName);
      } else {
        logger.error(`Project "${projectName}" not found.`);
        // Continue to prompt for a project
      }
    }

    // Prompt user to select a project
    const { selectedProject } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedProject',
        message: 'Select a project to open:',
        choices: [...existingProjects, { name: 'Cancel', value: 'cancel' }],
      },
    ]);

    if (selectedProject === 'cancel') {
      logger.info('Operation cancelled.');
      return null;
    }

    const project = await Project.load(selectedProject);
    logger.success(`Project "${selectedProject}" opened.`);

    // Ask what the user wants to do with this project
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do with this project?',
        choices: [
          { name: 'Collect more files', value: 'collect' },
          { name: 'Analyze project (generate Claude instructions)', value: 'analyze' },
          { name: 'View project details', value: 'view' },
          { name: 'Close project', value: 'close' },
        ],
      },
    ]);

    switch (action) {
      case 'collect': {
        const collectFiles = require('./collectFiles');
        await collectFiles(selectedProject);
        break;
      }
      case 'analyze': {
        const analyzeProject = require('./analyzeProject');
        await analyzeProject(selectedProject);
        break;
      }
      case 'view':
        displayProjectDetails(project);
        break;
      case 'close':
        logger.info('Project closed.');
        break;
    }

    return project;
  } catch (error) {
    logger.error('Error opening project:', error);
    return null;
  }
}

/**
 * Display project details
 * @param {Project} project - Project to display
 */
function displayProjectDetails(project) {
  const createdDate = new Date(project.createdAt).toLocaleString();
  const updatedDate = new Date(project.lastUpdated).toLocaleString();

  logger.info(chalk.cyan('\n=== Project Details ==='));
  logger.info(chalk.white(`Name: ${chalk.yellow(project.name)}`));
  logger.info(chalk.white(`Created: ${chalk.yellow(createdDate)}`));
  logger.info(chalk.white(`Last Updated: ${chalk.yellow(updatedDate)}`));
  logger.info(chalk.white(`Files: ${chalk.yellow(project.files.length)}`));
  logger.info(chalk.white(`Source Directories: ${chalk.yellow(project.sourceDirectories.length)}`));

  if (project.sourceDirectories.length > 0) {
    logger.info(chalk.cyan('\nSource Directories:'));
    project.sourceDirectories.forEach((dir, index) => {
      logger.info(chalk.yellow(`  ${index + 1}. ${dir}`));
    });
  }

  if (project.directoryStructure) {
    logger.info(chalk.cyan('\nDirectory Structure:'));
    logger.info(
      chalk.gray(
        project.directoryStructure.substring(0, 500) +
          (project.directoryStructure.length > 500 ? '...' : '')
      )
    );
  }

  if (project.instructions) {
    logger.info(chalk.cyan('\nClaude Instructions:'));
    logger.info(
      chalk.gray(
        project.instructions.substring(0, 500) + (project.instructions.length > 500 ? '...' : '')
      )
    );
  }

  logger.info(''); // Add a blank line for better readability
}

module.exports = openProject;
