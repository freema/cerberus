/**
 * Claude Configuration Controller
 */
const inquirer = require('inquirer');
const logger = require('../utils/logger');

class ClaudeConfigController {
  /**
   * Handle Claude configuration
   */
  async handleConfig() {
    const claudeService = require('../services/ClaudeService');

    const claudeConfig = require('../utils/config').getClaudeConfig();
    const currentApiKey = require('../utils/config').getClaudeApiKey();

    logger.info('\n=== Claude AI Configuration ===');

    // Check if Claude API key is missing and show warning
    if (!currentApiKey) {
      logger.warn('⚠️  WARNING: Claude API key is not configured. AI features will not work properly.\n');
    }

    while (true) {
      const { configOption } = await inquirer.prompt([
        {
          type: 'list',
          name: 'configOption',
          message: 'What would you like to configure?',
          choices: [
            { name: 'Claude API Key', value: 'apiKey' },
            { name: 'Claude Model', value: 'model' },
            { name: 'Max Tokens', value: 'maxTokens' },
            { name: 'Test Connection', value: 'test' },
            { name: 'Back', value: 'back' },
          ],
        },
      ]);

      switch (configOption) {
        case 'apiKey':
          const { apiKey } = await inquirer.prompt([
            {
              type: 'password',
              name: 'apiKey',
              message: 'Enter Claude API key:',
              default: currentApiKey || '',
              validate: input => input.trim() !== '' || 'API key cannot be empty',
            },
          ]);

          claudeService.updateApiKey(apiKey);
          logger.success('Claude API key updated.');
          break;

        case 'model':
          const { model } = await inquirer.prompt([
            {
              type: 'list',
              name: 'model',
              message: 'Select Claude model:',
              choices: [
                { name: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
                { name: 'Claude 3 Sonnet', value: 'claude-3-sonnet-20240229' },
                { name: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307' },
              ],
              default: claudeConfig.model,
            },
          ]);

          claudeService.updateConfig({ model });
          logger.success(`Claude model updated to ${model}.`);
          break;

        case 'maxTokens':
          const { maxTokens } = await inquirer.prompt([
            {
              type: 'number',
              name: 'maxTokens',
              message: 'Enter maximum output tokens:',
              default: claudeConfig.maxTokens,
              validate: input => input > 0 || 'Max tokens must be a positive number',
            },
          ]);

          claudeService.updateConfig({ maxTokens });
          logger.success(`Max tokens updated to ${maxTokens}.`);
          break;

        case 'test':
          logger.info('Testing Claude API connection...');
          const isConnected = await claudeService.testConnection();

          if (isConnected) {
            logger.success('Successfully connected to Claude API!');
          } else {
            logger.error('Failed to connect to Claude API. Please check your configuration.');
          }
          break;

        case 'back':
          return;
      }
    }
  }
}

module.exports = ClaudeConfigController;
