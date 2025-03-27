const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const Project = require('../../models/Project');
const claudeService = require('../../services/claudeService');
const logger = require('../../utils/logger');
const { generateDirectoryLink } = require('../../utils/pathUtils');

/**
 * Analyze a project and generate Claude instructions
 * @param {string} [projectName] - Optional project name
 */
async function analyzeProject(projectName) {
  logger.info('=== Analyze Project ===');

  try {
    let project;
    
    // If no project name provided, let user select one
    if (!projectName) {
      const existingProjects = await Project.listAll();
      
      if (existingProjects.length === 0) {
        logger.warn('No projects found. Please create and collect files for a project first.');
        return;
      }
      
      const { selectedProject } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedProject',
          message: 'Select a project to analyze:',
          choices: existingProjects
        }
      ]);
      
      projectName = selectedProject;
    }
    
    // Load the project
    project = await Project.load(projectName);
    
    // Check if we have files to analyze
    if (!project.files || project.files.length === 0) {
      logger.warn('This project has no files. Please collect files first.');
      
      const { collectNow } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'collectNow',
          message: 'Would you like to collect files now?',
          default: true
        }
      ]);
      
      if (collectNow) {
        const collectFiles = require('./collectFiles');
        await collectFiles(projectName);
        // Reload the project after collecting files
        project = await Project.load(projectName);
      } else {
        return;
      }
    }
    
    // Check if Claude API is configured
    if (!claudeService.isConfigured()) {
      logger.error('Claude API key not configured.');
      
      const { addApiKey } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'addApiKey',
          message: 'Would you like to configure a Claude API key now?',
          default: true
        }
      ]);
      
      if (addApiKey) {
        const { apiKey } = await inquirer.prompt([
          {
            type: 'input',
            name: 'apiKey',
            message: 'Enter your Claude API key:',
            validate: input => input.trim() !== '' || 'API key cannot be empty'
          }
        ]);
        
        claudeService.updateApiKey(apiKey);
        logger.success('Claude API key configured.');
        
        // Test the connection
        logger.info('Testing Claude API connection...');
        const isConnected = await claudeService.testConnection();
        
        if (!isConnected) {
          logger.error('Could not connect to Claude API with the provided key. Please check your configuration.');
          
          // Show directory structure without Claude analysis
          console.log(chalk.yellow('\n========= DIRECTORY STRUCTURE ========='));
          console.log(project.directoryStructure);
          console.log(chalk.yellow('========= END OF DIRECTORY STRUCTURE ========='));
          
          // Add the directory link for easy navigation
          const projectDir = project.getProjectPath();
          const dirLink = generateDirectoryLink(projectDir);
          
          console.log(chalk.cyan('\nProject directory: '));
          console.log(chalk.blue.underline(dirLink));
          console.log(chalk.white(projectDir));
          
          console.log(chalk.blue('\nCopy this directory structure to use with Claude.'));
          return;
        }
      } else {
        // Show directory structure without Claude analysis
        console.log(chalk.yellow('\n========= DIRECTORY STRUCTURE ========='));
        console.log(project.directoryStructure);
        console.log(chalk.yellow('========= END OF DIRECTORY STRUCTURE ========='));
        
        // Add the directory link for easy navigation
        const projectDir = project.getProjectPath();
        const dirLink = generateDirectoryLink(projectDir);
        
        console.log(chalk.cyan('\nProject directory: '));
        console.log(chalk.blue.underline(dirLink));
        console.log(chalk.white(projectDir));
        
        console.log(chalk.blue('\nCopy this directory structure to use with Claude.'));
        return;
      }
    }
    
    // Get Claude configuration options
    const claudeConfig = claudeService.claudeConfig;
    
    // Ask if user wants to adjust model or token settings for this analysis
    const { adjustSettings } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'adjustSettings',
        message: 'Would you like to adjust Claude API settings for this analysis?',
        default: false
      }
    ]);
    
    if (adjustSettings) {
      const { model } = await inquirer.prompt([
        {
          type: 'list',
          name: 'model',
          message: 'Select Claude model to use:',
          choices: [
            { name: 'Claude 3 Opus (best quality, slower)', value: 'claude-3-opus-20240229' },
            { name: 'Claude 3 Sonnet (balanced)', value: 'claude-3-sonnet-20240229' },
            { name: 'Claude 3 Haiku (fastest)', value: 'claude-3-haiku-20240307' }
          ],
          default: claudeConfig.model
        }
      ]);
      
      const { maxTokens } = await inquirer.prompt([
        {
          type: 'number',
          name: 'maxTokens',
          message: 'Enter maximum output tokens:',
          default: claudeConfig.maxTokens,
          validate: input => input > 0 || 'Max tokens must be a positive number'
        }
      ]);
      
      // Update config for this session only
      claudeService.updateConfig({ model, maxTokens });
    }
    
    // Check if project already has instructions
    if (project.instructions) {
      const { regenerateInstructions } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'regenerateInstructions',
          message: 'This project already has Claude instructions. Would you like to regenerate them?',
          default: false
        }
      ]);
      
      if (!regenerateInstructions) {
        displayInstructions(project);
        return project;
      }
    }
    
    // Generate instructions with Claude
    const spinner = ora('Generating project instructions with Claude AI...').start();
    
    const projectData = {
      directoryStructure: project.directoryStructure,
      files: project.files,
      name: project.name,
      sourceDirectories: project.sourceDirectories
    };
    
    const instructions = await claudeService.generateProjectInstructions(projectData);
    
    if (!instructions) {
      spinner.fail('Failed to generate instructions.');
      return;
    }
    
    // Save instructions to project
    project.setInstructions(instructions);
    await project.save();
    
    spinner.succeed('Generated project instructions successfully.');
    
    // Display the instructions
    displayInstructions(project);
    
    return project;
  } catch (error) {
    logger.error('Error analyzing project:', error);
  }
}

/**
 * Display project instructions
 * @param {Project} project - Project with instructions
 */
function displayInstructions(project) {
  console.log(chalk.yellow('\n========= CLAUDE PROJECT INSTRUCTIONS ========='));
  console.log(project.instructions);
  console.log(chalk.yellow('========= END OF INSTRUCTIONS ========='));
  
  // Show links to the project directory and analysis file
  const projectDir = project.getProjectPath();
  const analysisPath = project.getAnalysisPath();
  const projectLink = generateDirectoryLink(projectDir);
  const analysisLink = generateDirectoryLink(analysisPath);

  console.log(chalk.cyan('\nProject directory: '));
  console.log(chalk.blue.underline(projectLink));
  console.log(chalk.white(projectDir));

  console.log(chalk.cyan('\nAnalysis file: '));
  console.log(chalk.blue.underline(analysisLink));
  console.log(chalk.white(analysisPath));
  
  // Ask if user wants to copy the instructions to clipboard
  inquirer.prompt([
    {
      type: 'confirm',
      name: 'copyToClipboard',
      message: 'Would you like to copy these instructions to your clipboard?',
      default: true
    }
  ]).then(({ copyToClipboard }) => {
    if (copyToClipboard) {
      try {
        // Use the clipboard utility module
        const clipboard = require('../../utils/clipboard');
        clipboard.copyWithFeedback(project.instructions, 'Instructions copied to clipboard.');
      } catch (error) {
        logger.error('Failed to copy to clipboard:', error);
      }
    }
  });
}

module.exports = analyzeProject;