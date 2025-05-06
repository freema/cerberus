const inquirer = require('inquirer');
const { mainMenu } = require('../cli');
const ProjectMenuController = require('./ProjectMenuController');
const CodeReviewMenuController = require('./CodeReviewMenuController');
const ConfigMenuController = require('./ConfigMenuController');
const JiraMenuController = require('./JiraMenuController');
const config = require('../utils/config');
const UIHelper = require('../utils/UIHelper');
const ApiConfigService = require('../utils/ApiConfigService');
const logger = require('../utils/logger');

class MenuController {
  constructor() {
    this.projectMenuController = new ProjectMenuController();
    this.codeReviewMenuController = new CodeReviewMenuController();
    this.configMenuController = new ConfigMenuController();
    this.jiraMenuController = new JiraMenuController();
  }

  /**
   * Start the interactive menu system
   */
  async startInteractiveMenu() {
    try {
      while (true) {
        const choice = await mainMenu();

        switch (choice) {
          case 'project':
            if (await this.checkClaudeAPIKey()) {
              await this.projectMenuController.handleMenu();
            }
            break;
          case 'codeReview':
            if (await this.checkRequiredAPIKeys()) {
              await this.codeReviewMenuController.handleMenu();
            }
            break;
          case 'jira':
            if (await this.checkJiraAPIKey()) {
              await this.jiraMenuController.handleMenu();
            }
            break;
          case 'configure':
            await this.configMenuController.handleMenu();
            break;
          case 'exit':
            const i18n = require('../utils/i18n');
            logger.info(i18n.t('farewell'));
            process.exit(0);
            break;
        }
      }
    } catch (error) {
      logger.error('An error occurred:', error);
      process.exit(1);
    }
  }

  /**
   * Check if Claude API key is configured and offer to configure if not
   * @returns {Promise<boolean>} - Whether to proceed
   */
  async checkClaudeAPIKey() {
    // Delegate to ApiConfigService for this check
    return ApiConfigService.checkClaudeApiKey();
  }

  /**
   * Check if required API keys are configured for code review
   * @returns {Promise<boolean>} - Whether to proceed
   */
  async checkRequiredAPIKeys() {
    // Delegate to ApiConfigService for this check
    return ApiConfigService.checkRequiredApiKeys();
  }

  /**
   * Check if Jira API key is configured and offer to configure if not
   * @returns {Promise<boolean>} - Whether to proceed
   */
  async checkJiraAPIKey() {
    // Delegate to ApiConfigService for this check
    return ApiConfigService.checkJiraApiKey();
  }

  /**
   * Show current configuration (delegated to ConfigMenuController)
   */
  showConfiguration() {
    this.configMenuController.showConfiguration();
  }

  /**
   * Configure settings (delegated to ConfigMenuController)
   */
  async configureSettings() {
    await this.configMenuController.handleMenu();
  }
}

// Create singleton instance
const menuController = new MenuController();

module.exports = menuController;
