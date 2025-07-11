/**
 * Analyze a project and generate Claude instructions
 */
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const Project = require('../../models/Project');
const logger = require('../../utils/logger');
// const config = require('../../utils/config'); // TODO: Use if needed
const clipboard = require('../../utils/clipboard');
const aiServiceProvider = require('../../services/AIServiceFactory');
const { generateDirectoryStructure } = require('../../utils/directoryStructure');

/**
 * Analyze a project and generate Claude instructions
 * @param {string} [projectName] - Optional project name
 */
async function analyzeProject(projectName) {
  logger.info('=== Analyze Project ===');

  try {
    let project;

    // If no project name provided, prompt user to select one
    if (!projectName) {
      const existingProjects = await Project.listAll();

      if (existingProjects.length === 0) {
        logger.warn('No projects found. Please create a project first.');
        return;
      }

      const { selectedProject } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedProject',
          message: 'Select a project to analyze:',
          choices: existingProjects,
        },
      ]);

      projectName = selectedProject;
    }

    // Load the project
    project = await Project.load(projectName);

    // Ensure project has files
    if (!project.files || project.files.length === 0) {
      logger.warn('Project has no files. Please collect files first.');

      const { collectNow } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'collectNow',
          message: 'Would you like to collect files now?',
          default: true,
        },
      ]);

      if (collectNow) {
        const collectFiles = require('./collectFiles');
        project = await collectFiles(projectName);
        if (!project) return;
      } else {
        return;
      }
    }

    // Get active AI service adapter
    const activeAdapter = aiServiceProvider.getActiveAdapter();

    if (!activeAdapter || !activeAdapter.isConfigured()) {
      logger.warn(
        `Active AI service (${activeAdapter ? activeAdapter.serviceName : 'None'}) is not properly configured.`
      );

      const { configureNow } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'configureNow',
          message: 'Would you like to configure the AI service now?',
          default: true,
        },
      ]);

      if (configureNow) {
        const AIConfigController = require('../../controllers/AIConfigController');
        const aiConfigController = new AIConfigController();
        await aiConfigController.handleConfig();

        // Re-get the active adapter after configuration
        const adapter = aiServiceProvider.getActiveAdapter();
        if (!adapter || !adapter.isConfigured()) {
          logger.error('AI service is still not properly configured. Cannot continue.');
          return;
        }
      } else {
        return;
      }
    }

    // Get model configuration
    const adapterModels = activeAdapter.getAvailableModels();
    const { model } = await inquirer.prompt([
      {
        type: 'list',
        name: 'model',
        message: `Select ${activeAdapter.serviceName} model to use:`,
        choices: adapterModels.map(model => ({
          name: model.name,
          value: model.id,
        })),
        default: activeAdapter.claudeConfig?.model || adapterModels[0].id,
      },
    ]);

    // Set the selected model
    activeAdapter.updateConfig({ model });

    // Make sure project has directory structure
    if (!project.directoryStructure) {
      logger.warn('Project missing directory structure, regenerating...');
      // Re-generate directory structure
      project.directoryStructure = generateDirectoryStructure(project.files);
      await project.save();
    }

    // Display project information
    logger.info(chalk.cyan('\n=== Project Analysis ==='));
    logger.info(chalk.white(`Name: ${chalk.yellow(project.name)}`));
    logger.info(chalk.white(`Files: ${chalk.yellow(project.files.length)}`));
    logger.info(
      chalk.white(`Source Directories: ${chalk.yellow(project.sourceDirectories.length)}`)
    );
    logger.info(chalk.white(`Using AI Service: ${chalk.yellow(activeAdapter.serviceName)}`));
    logger.info(chalk.white(`Using Model: ${chalk.yellow(model)}`));

    // Ask for confirmation
    const { confirmAnalyze } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmAnalyze',
        message: 'Generate AI instructions for this project?',
        default: true,
      },
    ]);

    if (!confirmAnalyze) {
      logger.info('Analysis cancelled.');
      return;
    }

    // Generate instructions
    const spinner = ora('Generating AI instructions...').start();

    const projectData = {
      structureContent: project.directoryStructure,
      name: project.name,
    };

    const instructions = await activeAdapter.generateProjectInstructions(projectData);

    spinner.succeed('AI instructions generated successfully.');

    if (instructions) {
      // Save instructions to project
      project.instructions = instructions;
      await project.save();

      // Display instructions
      logger.info(chalk.cyan('\n=== AI Instructions ==='));
      logger.info(instructions);

      // Copy to clipboard and show guidance
      await clipboard.write(instructions);
      logger.info(chalk.green('\nInstructions have been copied to your clipboard.'));
      logger.info(
        'You can use these instructions when working with Claude or other AI tools to help them understand your project structure.'
      );
    } else {
      logger.error('Failed to generate instructions. Please check your AI service configuration.');
    }

    return project;
  } catch (error) {
    logger.error('Error analyzing project:', error);
  }
}

module.exports = analyzeProject;
