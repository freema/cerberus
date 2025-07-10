/**
 * ApiConfigService - Centralized service for API configuration
 */
const config = require('./config');
// const logger = require('./logger'); // TODO: Use if needed
const UIHelper = require('./uiHelper');

class ApiConfigService {
  constructor() {
    this.aiServiceProvider = require('../services/AIServiceFactory');
    this.claudeAdapter = this.aiServiceProvider.getAdapter('claude');
    this.uiHelper = UIHelper;
  }

  /**
   * Check and configure Claude API
   * @deprecated Use AIConfigController instead
   * @returns {Promise<boolean>} - Whether configuration is successful
   */
  async configureClaude() {
    // Use the new AIConfigController instead
    const AIConfigController = require('../controllers/AIConfigController');
    const aiConfigController = new AIConfigController();
    await aiConfigController.handleAdapterConfig('claude');

    // Return whether API key is configured
    return !!config.getClaudeApiKey();
  }

  /**
   * Test connection to Claude API
   * @returns {Promise<boolean>} - Whether connection is functional
   */
  async testClaudeConnection() {
    this.uiHelper.displayInfo('Testing Claude API connection...', '');

    const isConnected = await this.claudeAdapter.testConnection();

    if (isConnected) {
      this.uiHelper.displaySuccess('Successfully connected to Claude API!');
      return true;
    } else {
      this.uiHelper.displayError(
        'Failed to connect to Claude API. Please check your configuration.'
      );
      return false;
    }
  }

  /**
   * Check and resolve missing Claude API key
   * @returns {Promise<boolean>} - Whether to continue
   */
  async checkClaudeApiKey() {
    const claudeApiKey = config.getClaudeApiKey();

    if (!claudeApiKey) {
      this.uiHelper.displayWarning('Claude AI API key is not configured!');
      this.uiHelper.displayInfo(
        'Some features that require Claude AI will not work without this key.',
        ''
      );

      const action = await this.uiHelper.select('What would you like to do?', [
        { name: 'Configure AI Services', value: 'configure' },
        { name: 'Continue to Project menu (some features may be limited)', value: 'continue' },
        { name: 'Go back to main menu', value: 'back' },
      ]);

      if (action === 'configure') {
        const AIConfigController = require('../controllers/AIConfigController');
        const aiConfigController = new AIConfigController();
        await aiConfigController.handleConfig();
        return false; // Return to main menu after configuration
      } else if (action === 'back') {
        return false;
      }
    }

    return true;
  }

  /**
   * Display current configuration
   */
  showConfiguration() {
    const i18n = require('./i18n');

    const claudeConfig = config.getClaudeConfig();
    const debugEnabled = config.isDebugMode();
    const claudeApiKey = config.getClaudeApiKey();

    this.uiHelper.displayHeader(i18n.t('settings.showConfig.title'));

    const debugStatus = debugEnabled
      ? i18n.t('settings.showConfig.enabled')
      : i18n.t('settings.showConfig.disabled');

    this.uiHelper.displayInfo(i18n.t('settings.showConfig.debugMode', { status: debugStatus }), '');

    const activeAdapter = this.aiServiceProvider.getActiveAdapter();
    this.uiHelper.displayInfo(
      i18n.t('settings.showConfig.claudeConfig') || 'AI Configuration:',
      ''
    );
    this.uiHelper.displayInfo(`Active AI Service: ${activeAdapter.serviceName}`, '');
    this.uiHelper.displayInfo(
      i18n.t('settings.showConfig.model', { model: claudeConfig.model }),
      ''
    );
    this.uiHelper.displayInfo(
      i18n.t('settings.showConfig.maxTokens', { maxTokens: claudeConfig.maxTokens }),
      ''
    );

    const claudeKeyStatus = claudeApiKey
      ? i18n.t('settings.showConfig.configured')
      : i18n.t('settings.showConfig.notConfigured');

    this.uiHelper.displayInfo(
      i18n.t('settings.showConfig.apiKey', { status: claudeKeyStatus }),
      ''
    );

    // Warning if keys are missing
    if (!claudeApiKey) {
      this.uiHelper.displayWarning(i18n.t('settings.showConfig.warning'));
      this.uiHelper.displayInfo(i18n.t('settings.showConfig.claudeApiKeyMissing'), '');
      this.uiHelper.displayInfo(i18n.t('settings.showConfig.configureMessage'), '');
    }
  }
}

// Create singleton instance
const apiConfigService = new ApiConfigService();

module.exports = apiConfigService;
