/**
 * GitLab Configuration Controller
 */
const inquirer = require('inquirer');
const logger = require('../utils/logger');

class GitlabConfigController {
  /**
   * Handle GitLab configuration
   */
  async handleConfig() {
    const gitlabService = require('../services/GitlabService');

    const gitlabConfig = require('../utils/config').getGitlabConfig();
    const currentToken = require('../utils/config').getGitlabToken();

    logger.info('\n=== GitLab Configuration ===');

    // Check if GitLab token is missing and show warning
    if (!currentToken) {
      logger.warn('⚠️  WARNING: GitLab API token is not configured. Some features may not work properly.\n');
    }

    while (true) {
      const { configOption } = await inquirer.prompt([
        {
          type: 'list',
          name: 'configOption',
          message: 'What would you like to configure?',
          choices: [
            { name: 'GitLab API URL', value: 'url' },
            { name: 'GitLab API Token', value: 'token' },
            { name: 'Test Connection', value: 'test' },
            { name: 'Back', value: 'back' },
          ],
        },
      ]);

      switch (configOption) {
        case 'url':
          const { baseUrl } = await inquirer.prompt([
            {
              type: 'input',
              name: 'baseUrl',
              message: 'Enter GitLab API URL:',
              default: gitlabConfig.baseUrl,
              validate: input => input.trim() !== '' || 'URL cannot be empty',
            },
          ]);

          gitlabService.updateBaseUrl(baseUrl);
          logger.success('GitLab API URL updated.');
          break;

        case 'token':
          const { token } = await inquirer.prompt([
            {
              type: 'password',
              name: 'token',
              message: 'Enter GitLab API token:',
              default: currentToken || '',
              validate: input => input.trim() !== '' || 'Token cannot be empty',
            },
          ]);

          gitlabService.updateToken(token);
          logger.success('GitLab API token updated.');
          break;

        case 'test':
          logger.info('Testing GitLab API connection...');
          const isConnected = await gitlabService.testConnection();

          if (isConnected) {
            logger.success('Successfully connected to GitLab API!');
          } else {
            logger.error('Failed to connect to GitLab API. Please check your configuration.');
          }
          break;

        case 'back':
          return;
      }
    }
  }
}

module.exports = GitlabConfigController;
