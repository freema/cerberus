/**
 * Jira Configuration Controller
 */
const inquirer = require('inquirer');
const logger = require('../utils/logger');
const config = require('../utils/config');

class JiraConfigController {
  /**
   * Handle Jira configuration
   */
  async handleConfig() {
    const jiraService = require('../services/JiraService');

    const jiraConfig = require('../utils/config').getJiraConfig();
    const currentToken = require('../utils/config').getJiraToken();

    logger.info('\n=== Jira Configuration ===');
    logger.info('Tato konfigurace slouží pro připojení k Jira Cloud nebo Jira Server API.');
    logger.info('Pro Jira Cloud potřebujete email a API token ve formátu "email@firma.cz:token".');
    logger.info('Pro Jira Server potřebujete Personal Access Token (PAT).');
    logger.info('Více informací na: https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/');

    // Check if Jira token is missing and show warning
    if (!currentToken) {
      logger.warn('⚠️  WARNING: Jira API token is not configured. Some features may not work properly.\n');
    }
    
    // Check if Jira username is missing
    const jiraUsername = jiraConfig.username;
    if (!jiraUsername) {
      logger.warn('⚠️  WARNING: Jira username is not configured. Authentication will fail.\n');
    }

    while (true) {
      const { configOption } = await inquirer.prompt([
        {
          type: 'list',
          name: 'configOption',
          message: 'What would you like to configure?',
          choices: [
            { name: 'Jira API URL', value: 'url' },
            { name: 'Jira Username', value: 'username' },
            { name: 'Jira API Token', value: 'token' },
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
              message: 'Enter Jira API URL (e.g. https://your-domain.atlassian.net):',
              default: jiraConfig.baseUrl,
              validate: input => input.trim() !== '' || 'URL cannot be empty',
            },
          ]);

          jiraService.updateBaseUrl(baseUrl);
          logger.success('Jira API URL updated.');
          break;
          
        case 'username':
          const { username } = await inquirer.prompt([
            {
              type: 'input',
              name: 'username',
              message: 'Enter Jira username (email you use to log in to Jira):',
              default: jiraConfig.username || '',
              validate: input => input.trim() !== '' || 'Username cannot be empty',
            },
          ]);
          
          // Aktualizace username
          config.setJiraConfig({ ...jiraConfig, username });
          jiraService.initializeClient(); // Reinicializujeme klienta s novým username
          logger.success('Jira username updated.');
          break;

        case 'token':
          const { token } = await inquirer.prompt([
            {
              type: 'password',
              name: 'token',
              message: 'Enter Jira API token:',
              default: currentToken || '',
              validate: input => input.trim() !== '' || 'Token cannot be empty',
            },
          ]);
          
          logger.info('Pro Jira Cloud API Key: https://id.atlassian.com/manage-profile/security/api-tokens');
          logger.info('Token je samostatný kód, není potřeba připojovat email.');

          jiraService.updateToken(token);
          logger.success('Jira API token updated.');
          break;

        case 'test':
          logger.info('Testing Jira API connection...');
          const isConnected = await jiraService.testConnection();

          if (isConnected) {
            logger.success('Successfully connected to Jira API!');
          } else {
            logger.error('Failed to connect to Jira API. Please check your configuration.');
          }
          break;

        case 'back':
          return;
      }
    }
  }
}

module.exports = JiraConfigController;