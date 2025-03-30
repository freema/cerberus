const inquirer = require('inquirer');
const { mainMenu } = require('../cli');
const ProjectMenuController = require('./ProjectMenuController');
const CodeReviewMenuController = require('./CodeReviewMenuController');
const ConfigMenuController = require('./ConfigMenuController');
const config = require('../utils/config');

class MenuController {
  constructor() {
    this.projectMenuController = new ProjectMenuController();
    this.codeReviewMenuController = new CodeReviewMenuController();
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
          case 'codeReview':
            if (await this.checkRequiredAPIKeys()) {
              await this.codeReviewMenuController.handleMenu();
            }
            break;
          case 'configure':
            await this.configMenuController.handleMenu();
            break;
          case 'exit':
            const i18n = require('../utils/i18n');
            console.log(i18n.t('farewell'));
            process.exit(0);
            break;
        }
      }
    } catch (error) {
      console.error('An error occurred:', error);
      process.exit(1);
    }
  }

  /**
   * Check if Claude API key is configured and offer to configure if not
   * @returns {Promise<boolean>} - Whether to proceed
   */
  async checkClaudeAPIKey() {
    const claudeApiKey = config.getClaudeApiKey();

    if (!claudeApiKey) {
      console.log('\n⚠️  WARNING: Claude AI API key is not configured!');
      console.log('Some features that require Claude AI will not work without this key.');

      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: 'Configure Claude AI', value: 'configure' },
            { name: 'Continue to Project menu (some features may be limited)', value: 'continue' },
            { name: 'Go back to main menu', value: 'back' },
          ],
        },
      ]);

      if (action === 'configure') {
        await this.configMenuController.claudeConfigController.handleConfig();
        return false; // Return to main menu after configuration
      } else if (action === 'back') {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if required API keys are configured for code review
   * @returns {Promise<boolean>} - Whether to proceed
   */
  async checkRequiredAPIKeys() {
    const gitlabToken = config.getGitlabToken();
    const claudeApiKey = config.getClaudeApiKey();

    if (!gitlabToken || !claudeApiKey) {
      console.log('\n⚠️  WARNING: Required API keys are not configured!');
      if (!gitlabToken) console.log('- GitLab API token is missing');
      if (!claudeApiKey) console.log('- Claude AI API key is missing');
      console.log('The code review functionality requires these API keys.');

      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: 'Configure API keys', value: 'configure' },
            { name: 'Continue to Code Review menu anyway', value: 'continue' },
            { name: 'Go back to main menu', value: 'back' },
          ],
        },
      ]);

      if (action === 'configure') {
        await this.configMenuController.handleMenu();
        return false; // Return to main menu after configuration
      } else if (action === 'back') {
        return false;
      }
    }

    return true;
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
