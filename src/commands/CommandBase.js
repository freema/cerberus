/**
 * Base class for all commands
 */
const inquirer = require('inquirer');
const chalk = require('chalk');
const logger = require('../utils/logger');
const Project = require('../models/Project');
const config = require('../utils/config');
// Services will be imported in specific commands as needed
const ora = require('ora');

class CommandBase {
  /**
   * Create a new command
   * @param {Object} options - Command options
   */
  constructor(options = {}) {
    this.name = options.name || 'Command';
    this.description = options.description || '';
  }

  /**
   * Execute the command
   * @param {Object} args - Command arguments
   * @returns {Promise<any>} - Command result
   */
  async execute(args) {
    logger.info(`=== ${this.name} ===`);

    try {
      // Validate inputs
      if (!(await this.validateInputs(args))) {
        return null;
      }

      // Execute command
      const result = await this.run(args);

      // Handle result
      await this.handleResult(result);

      return result;
    } catch (error) {
      logger.error(`Error executing ${this.name}:`, error);
      return null;
    }
  }

  /**
   * Validate command inputs
   * @param {Object} args - Command arguments
   * @returns {Promise<boolean>} - Whether inputs are valid
   */
  async validateInputs(_args) {
    return true;
  }

  /**
   * Run the command - must be implemented by subclasses
   * @param {Object} _args - Command arguments
   * @returns {Promise<any>} - Command result
   */
  async run(/* _args */) {
    throw new Error(`Method run() must be implemented by subclass of CommandBase`);
  }

  /**
   * Handle the command result
   * @param {any} result - Command result
   * @returns {Promise<void>}
   */
  async handleResult(result) {
    if (result) {
      logger.success(`${this.name} completed successfully`);
    }
  }

  /**
   * Confirm an action with the user
   * @param {string} message - Confirmation message
   * @param {boolean} defaultValue - Default value
   * @returns {Promise<boolean>} - Whether the action was confirmed
   */
  async confirmAction(message, defaultValue = true) {
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
   * Select an option from a list
   * @param {string} message - Selection message
   * @param {Array<Object>} choices - Selection choices
   * @param {string|null} defaultValue - Default value
   * @returns {Promise<string>} - Selected value
   */
  async selectOption(message, choices, defaultValue = null) {
    const { selected } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selected',
        message,
        choices,
        default: defaultValue,
      },
    ]);
    return selected;
  }

  /**
   * Get an input value from the user
   * @param {string} message - Input message
   * @param {Function|null} validate - Validation function
   * @param {string} defaultValue - Default value
   * @returns {Promise<string>} - Input value
   */
  async inputValue(message, validate = null, defaultValue = '') {
    const { value } = await inquirer.prompt([
      {
        type: 'input',
        name: 'value',
        message,
        validate,
        default: defaultValue,
      },
    ]);
    return value;
  }

  /**
   * Display a header
   * @param {string} title - Header title
   */
  displayHeader(title) {
    logger.info(chalk.cyan(`\n=== ${title} ===`));
  }

  /**
   * Display an info line
   * @param {string} label - Info label
   * @param {string} value - Info value
   */
  displayInfo(label, value) {
    logger.info(`${chalk.white(label)}: ${chalk.yellow(value || 'N/A')}`);
  }

  /**
   * Display a description with truncation
   * @param {string} text - Description text
   * @param {number} maxLength - Maximum length before truncation
   */
  displayDescription(text, maxLength = 500) {
    if (!text) return;

    logger.info(chalk.cyan('\nDescription:'));
    logger.info(chalk.gray(text.substring(0, maxLength) + (text.length > maxLength ? '...' : '')));
  }

  /**
   * Select a project from the list of available projects
   * @returns {Promise<Project|null>} - Selected project
   */
  async selectProject() {
    // Get list of projects
    const projectNames = await Project.listAll();

    if (projectNames.length === 0) {
      logger.warn('No projects found');

      if (await this.confirmAction('Would you like to create a new project?')) {
        // Create project command
        const CreateProjectCommand = require('./project/createProject');
        const createCmd = new CreateProjectCommand();
        return await createCmd.execute({});
      }

      return null;
    }

    // Show project selection
    const choices = projectNames.map(name => ({
      name,
      value: name,
    }));

    const selectedName = await this.selectOption('Select a project:', choices);
    return await Project.load(selectedName);
  }

  /**
   * Check if API keys are configured and offer to configure them if not
   * @param {string} apiType - API type ('gitlab', 'claude', or 'both')
   * @returns {Promise<boolean>} - Whether the API keys are configured
   */
  async requireApiKeys(apiType = 'both') {
    const needGitlab = apiType === 'gitlab' || apiType === 'both';
    const needClaude = apiType === 'claude' || apiType === 'both';

    let gitlabConfigured = !needGitlab || !!config.getGitlabToken();
    let claudeConfigured = !needClaude || !!config.getClaudeApiKey();

    if (gitlabConfigured && claudeConfigured) {
      return true;
    }

    // Show what's missing
    if (needGitlab && !gitlabConfigured) {
      logger.warn('GitLab API token is not configured');
    }

    if (needClaude && !claudeConfigured) {
      logger.warn('Claude API key is not configured');
    }

    // Offer to configure
    if (await this.confirmAction('Would you like to configure API credentials now?')) {
      if (needGitlab && !gitlabConfigured) {
        const token = await this.inputValue('Enter GitLab API token:');
        if (token) {
          config.setGitlabToken(token);
          gitlabConfigured = true;
          logger.success('GitLab API token saved');
        }
      }

      if (needClaude && !claudeConfigured) {
        const apiKey = await this.inputValue('Enter Claude API key:');
        if (apiKey) {
          config.setClaudeApiKey(apiKey);
          claudeConfigured = true;
          logger.success('Claude API key saved');
        }
      }
    }

    return (needGitlab ? gitlabConfigured : true) && (needClaude ? claudeConfigured : true);
  }

  /**
   * Create a spinner for async operations
   * @param {string} text - Spinner text
   * @returns {ora.Ora} - Spinner instance
   */
  createSpinner(text) {
    return ora({
      text,
      color: 'cyan',
    });
  }
}

module.exports = CommandBase;
