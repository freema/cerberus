/**
 * AI Configuration Controller
 * This controller handles configuration for all AI service adapters
 */
const inquirer = require('inquirer');
const logger = require('../utils/logger');
const aiServiceProvider = require('../services/AIServiceFactory');

class AIConfigController {
  /**
   * Handle AI configuration
   */
  async handleConfig() {
    logger.info('\n=== 🤖 AI Services Configuration ===');

    // Show available adapters
    const adapters = aiServiceProvider.getAvailableAdapters();
    const activeAdapter = aiServiceProvider.getActiveAdapter();
    const config = require('../utils/config');
    const activeAdapterId = config.get('activeAIService', 'claude');

    logger.info('Available AI services:');
    adapters.forEach(adapter => {
      const statusSymbol = adapter.isConfigured ? '✅' : '⚠️';
      const activeSymbol = adapter.id === activeAdapterId ? '[ACTIVE]' : '';
      logger.info(`  ${statusSymbol} ${adapter.name} ${activeSymbol}`);
    });

    // Adapter selection
    const { configOption } = await inquirer.prompt([
      {
        type: 'list',
        name: 'configOption',
        message: '⚙️ What would you like to configure?',
        choices: [
          ...adapters.map(adapter => ({
            name: `🔧 Configure ${adapter.name}${adapter.isConfigured ? '' : ' (not configured)'}`,
            value: `config_${adapter.id}`,
          })),
          { name: '🎯 Set Active AI Service', value: 'setActive' },
          { name: '⬅️ Back', value: 'back' },
        ],
      },
    ]);

    if (configOption === 'back') {
      return;
    } else if (configOption === 'setActive') {
      await this.handleSetActiveAdapter();
    } else if (configOption.startsWith('config_')) {
      const adapterId = configOption.replace('config_', '');
      await this.handleAdapterConfig(adapterId);
    }
  }

  /**
   * Handle setting the active AI service adapter
   */
  async handleSetActiveAdapter() {
    const adapters = aiServiceProvider.getAvailableAdapters();
    const activeAdapter = aiServiceProvider.getActiveAdapter();
    const config = require('../utils/config');
    const activeAdapterId = config.get('activeAIService', 'claude');

    const configuredAdapters = adapters.filter(adapter => adapter.isConfigured);

    if (configuredAdapters.length === 0) {
      logger.warn('No AI services are configured. Please configure at least one service first.');
      return;
    }

    const { adapterId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'adapterId',
        message: '🎯 Select the AI service to use:',
        choices: configuredAdapters.map(adapter => ({
          name: `${adapter.name}${adapter.id === activeAdapterId ? ' (current)' : ''}`,
          value: adapter.id,
        })),
      },
    ]);

    const success = aiServiceProvider.setActiveAdapter(adapterId);
    if (success) {
      const adapter = aiServiceProvider.getAdapter(adapterId);
      logger.success(`Active AI service set to ${adapter.serviceName}`);
    }
  }

  /**
   * Handle configuration for a specific adapter
   * @param {string} adapterId - ID of the adapter to configure
   */
  async handleAdapterConfig(adapterId) {
    const adapter = aiServiceProvider.getAdapter(adapterId);
    if (!adapter) {
      logger.error(`Service adapter ${adapterId} not found`);
      return;
    }

    logger.info(`\n=== 🔧 ${adapter.serviceName} Configuration ===`);

    // Generic configuration for all adapters
    await this.handleGenericAdapterConfig(adapter);
  }

  /**
   * Handle generic adapter configuration
   * @param {Object} adapter - Adapter instance to configure
   */
  async handleGenericAdapterConfig(adapter) {
    while (true) {
      const { configOption } = await inquirer.prompt([
        {
          type: 'list',
          name: 'configOption',
          message: '⚙️ What would you like to configure?',
          choices: [
            { name: `🔑 ${adapter.serviceName} API Key`, value: 'apiKey' },
            { name: `🤖 ${adapter.serviceName} Model`, value: 'model' },
            { name: '🔌 Test Connection', value: 'test' },
            { name: '⬅️ Back', value: 'back' },
          ],
        },
      ]);

      if (configOption === 'back') {
        return;
      }

      switch (configOption) {
        case 'apiKey':
          const { apiKey } = await inquirer.prompt([
            {
              type: 'password',
              name: 'apiKey',
              message: `🔑 Enter ${adapter.serviceName} API key:`,
              validate: input => input.trim() !== '' || 'API key cannot be empty',
            },
          ]);

          adapter.updateApiKey(apiKey);
          logger.success(`${adapter.serviceName} API key updated.`);
          break;

        case 'model':
          const availableModels = adapter.getAvailableModels();

          if (!availableModels || availableModels.length === 0) {
            logger.warn(`No models available for ${adapter.serviceName}`);
            break;
          }

          const { modelId } = await inquirer.prompt([
            {
              type: 'list',
              name: 'modelId',
              message: `🤖 Select ${adapter.serviceName} model:`,
              choices: availableModels.map(model => ({
                name: model.name,
                value: model.id,
              })),
            },
          ]);

          adapter.updateConfig({ model: modelId });
          logger.success(`${adapter.serviceName} model updated to ${modelId}.`);
          break;

        case 'test':
          logger.info(`🔌 Testing ${adapter.serviceName} API connection...`);
          const isConnected = await adapter.testConnection();

          if (isConnected) {
            logger.success(`Successfully connected to ${adapter.serviceName} API!`);
          } else {
            logger.error(
              `Failed to connect to ${adapter.serviceName} API. Please check your configuration.`
            );
          }
          break;
      }
    }
  }
}

module.exports = AIConfigController;
