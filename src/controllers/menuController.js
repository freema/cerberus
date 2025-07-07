const inquirer = require('inquirer');
const { mainMenu } = require('../cli');
const ProjectMenuController = require('./ProjectMenuController');
const ConfigMenuController = require('./ConfigMenuController');
const config = require('../utils/config');
const UIHelper = require('../utils/UIHelper');
const ApiConfigService = require('../utils/ApiConfigService');
const logger = require('../utils/logger');

class MenuController {
  constructor() {
    this.projectMenuController = new ProjectMenuController();
    this.configMenuController = new ConfigMenuController();
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
