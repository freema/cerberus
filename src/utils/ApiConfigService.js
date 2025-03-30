/**
 * ApiConfigService - Centralizovaná služba pro konfiguraci API
 */
const config = require('./config');
const logger = require('./logger');
const GitlabService = require('../services/GitlabService');
const ClaudeService = require('../services/ClaudeService');
const UIHelper = require('./UIHelper');

class ApiConfigService {
  constructor() {
    this.gitlabService = GitlabService;
    this.claudeService = ClaudeService;
    this.uiHelper = UIHelper;
  }

  /**
   * Kontrola a konfigurace GitLab API
   * @returns {Promise<boolean>} - Zda je konfigurace úspěšná
   */
  async configureGitlab() {
    const gitlabConfig = config.getGitlabConfig();
    const currentToken = config.getGitlabToken();
    
    this.uiHelper.displayHeader('GitLab Configuration');
    
    // Kontrola chybějícího tokenu
    if (!currentToken) {
      this.uiHelper.displayWarning('GitLab API token is not configured. Some features may not work properly.');
    }
    
    while (true) {
      const configOption = await this.uiHelper.select('What would you like to configure?', [
        { name: 'GitLab API URL', value: 'url' },
        { name: 'GitLab API Token', value: 'token' },
        { name: 'Test Connection', value: 'test' },
        { name: 'Back', value: 'back' }
      ]);
      
      switch (configOption) {
        case 'url':
          const baseUrl = await this.uiHelper.input('Enter GitLab API URL:', 
            input => input.trim() !== '' || 'URL cannot be empty',
            gitlabConfig.baseUrl);
          
          this.gitlabService.updateBaseUrl(baseUrl);
          this.uiHelper.displaySuccess('GitLab API URL updated.');
          break;
        
        case 'token':
          const token = await this.uiHelper.password('Enter GitLab API token:',
            input => input.trim() !== '' || 'Token cannot be empty');
          
          this.gitlabService.updateToken(token);
          this.uiHelper.displaySuccess('GitLab API token updated.');
          break;
        
        case 'test':
          await this.testGitlabConnection();
          break;
        
        case 'back':
          return !!currentToken; // Return whether token is configured
      }
    }
  }

  /**
   * Testování připojení ke GitLab API
   * @returns {Promise<boolean>} - Zda je spojení funkční
   */
  async testGitlabConnection() {
    this.uiHelper.displayInfo('Testing GitLab API connection...', '');
    
    const isConnected = await this.gitlabService.testConnection();
    
    if (isConnected) {
      this.uiHelper.displaySuccess('Successfully connected to GitLab API!');
      return true;
    } else {
      this.uiHelper.displayError('Failed to connect to GitLab API. Please check your configuration.');
      return false;
    }
  }

  /**
   * Kontrola a konfigurace Claude API
   * @returns {Promise<boolean>} - Zda je konfigurace úspěšná
   */
  async configureClaude() {
    const claudeConfig = config.getClaudeConfig();
    const currentApiKey = config.getClaudeApiKey();
    
    this.uiHelper.displayHeader('Claude AI Configuration');
    
    // Kontrola chybějícího API klíče
    if (!currentApiKey) {
      this.uiHelper.displayWarning('Claude API key is not configured. AI features will not work properly.');
    }
    
    while (true) {
      const configOption = await this.uiHelper.select('What would you like to configure?', [
        { name: 'Claude API Key', value: 'apiKey' },
        { name: 'Claude Model', value: 'model' },
        { name: 'Max Tokens', value: 'maxTokens' },
        { name: 'Test Connection', value: 'test' },
        { name: 'Back', value: 'back' }
      ]);
      
      switch (configOption) {
        case 'apiKey':
          const apiKey = await this.uiHelper.password('Enter Claude API key:',
            input => input.trim() !== '' || 'API key cannot be empty');
          
          this.claudeService.updateApiKey(apiKey);
          this.uiHelper.displaySuccess('Claude API key updated.');
          break;
        
        case 'model':
          const model = await this.uiHelper.select('Select Claude model:', [
            { name: 'Claude 3 Opus (best quality, slower)', value: 'claude-3-opus-20240229' },
            { name: 'Claude 3 Sonnet (balanced)', value: 'claude-3-sonnet-20240229' },
            { name: 'Claude 3 Haiku (fastest)', value: 'claude-3-haiku-20240307' }
          ], claudeConfig.model);
          
          this.claudeService.updateConfig({ model });
          this.uiHelper.displaySuccess(`Claude model updated to ${model}.`);
          break;
        
        case 'maxTokens':
          const maxTokens = parseInt(await this.uiHelper.input('Enter maximum output tokens:',
            input => parseInt(input) > 0 || 'Max tokens must be a positive number',
            claudeConfig.maxTokens.toString()));
          
          this.claudeService.updateConfig({ maxTokens });
          this.uiHelper.displaySuccess(`Max tokens updated to ${maxTokens}.`);
          break;
        
        case 'test':
          await this.testClaudeConnection();
          break;
        
        case 'back':
          return !!currentApiKey; // Return whether API key is configured
      }
    }
  }

  /**
   * Testování připojení ke Claude API
   * @returns {Promise<boolean>} - Zda je spojení funkční
   */
  async testClaudeConnection() {
    this.uiHelper.displayInfo('Testing Claude API connection...', '');
    
    const isConnected = await this.claudeService.testConnection();
    
    if (isConnected) {
      this.uiHelper.displaySuccess('Successfully connected to Claude API!');
      return true;
    } else {
      this.uiHelper.displayError('Failed to connect to Claude API. Please check your configuration.');
      return false;
    }
  }

  /**
   * Kontrola a řešení chybějícího API klíče Claude
   * @returns {Promise<boolean>} - Zda pokračovat dále
   */
  async checkClaudeApiKey() {
    const claudeApiKey = config.getClaudeApiKey();
    
    if (!claudeApiKey) {
      this.uiHelper.displayWarning('Claude AI API key is not configured!');
      this.uiHelper.displayInfo('Some features that require Claude AI will not work without this key.', '');
      
      const action = await this.uiHelper.select('What would you like to do?', [
        { name: 'Configure Claude AI', value: 'configure' },
        { name: 'Continue to Project menu (some features may be limited)', value: 'continue' },
        { name: 'Go back to main menu', value: 'back' }
      ]);
      
      if (action === 'configure') {
        await this.configureClaude();
        return false; // Return to main menu after configuration
      } else if (action === 'back') {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Kontrola a řešení chybějících API klíčů pro Code Review
   * @returns {Promise<boolean>} - Zda pokračovat dále
   */
  async checkRequiredApiKeys() {
    const gitlabToken = config.getGitlabToken();
    const claudeApiKey = config.getClaudeApiKey();
    
    if (!gitlabToken || !claudeApiKey) {
      this.uiHelper.displayWarning('Required API keys are not configured!');
      if (!gitlabToken) this.uiHelper.displayInfo('- GitLab API token is missing', '');
      if (!claudeApiKey) this.uiHelper.displayInfo('- Claude AI API key is missing', '');
      this.uiHelper.displayInfo('The code review functionality requires these API keys.', '');
      
      const action = await this.uiHelper.select('What would you like to do?', [
        { name: 'Configure API keys', value: 'configure' },
        { name: 'Continue to Code Review menu anyway', value: 'continue' },
        { name: 'Go back to main menu', value: 'back' }
      ]);
      
      if (action === 'configure') {
        // Check and configure both services if needed
        if (!gitlabToken) {
          await this.configureGitlab();
        }
        if (!claudeApiKey) {
          await this.configureClaude();
        }
        return false; // Return to main menu after configuration
      } else if (action === 'back') {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Zobrazení aktuální konfigurace
   */
  showConfiguration() {
    const i18n = require('./i18n');
    
    const gitlabConfig = config.getGitlabConfig();
    const claudeConfig = config.getClaudeConfig();
    const debugEnabled = config.isDebugMode();
    const gitlabToken = config.getGitlabToken();
    const claudeApiKey = config.getClaudeApiKey();
    
    this.uiHelper.displayHeader(i18n.t('settings.showConfig.title'));
    
    const debugStatus = debugEnabled ? 
      i18n.t('settings.showConfig.enabled') : 
      i18n.t('settings.showConfig.disabled');
    
    this.uiHelper.displayInfo(i18n.t('settings.showConfig.debugMode', { status: debugStatus }), '');
    
    this.uiHelper.displayInfo(i18n.t('settings.showConfig.gitlabConfig'), '');
    this.uiHelper.displayInfo(i18n.t('settings.showConfig.apiUrl', { url: gitlabConfig.baseUrl }), '');
    
    const gitlabTokenStatus = gitlabToken ? 
      i18n.t('settings.showConfig.configured') : 
      i18n.t('settings.showConfig.notConfigured');
    
    this.uiHelper.displayInfo(i18n.t('settings.showConfig.apiToken', { status: gitlabTokenStatus }), '');
    
    this.uiHelper.displayInfo(i18n.t('settings.showConfig.claudeConfig'), '');
    this.uiHelper.displayInfo(i18n.t('settings.showConfig.model', { model: claudeConfig.model }), '');
    this.uiHelper.displayInfo(i18n.t('settings.showConfig.maxTokens', { maxTokens: claudeConfig.maxTokens }), '');
    
    const claudeKeyStatus = claudeApiKey ? 
      i18n.t('settings.showConfig.configured') : 
      i18n.t('settings.showConfig.notConfigured');
    
    this.uiHelper.displayInfo(i18n.t('settings.showConfig.apiKey', { status: claudeKeyStatus }), '');
    
    // Varování, pokud chybí klíče
    if (!gitlabToken || !claudeApiKey) {
      this.uiHelper.displayWarning(i18n.t('settings.showConfig.warning'));
      if (!gitlabToken) this.uiHelper.displayInfo(i18n.t('settings.showConfig.gitlabTokenMissing'), '');
      if (!claudeApiKey) this.uiHelper.displayInfo(i18n.t('settings.showConfig.claudeApiKeyMissing'), '');
      this.uiHelper.displayInfo(i18n.t('settings.showConfig.configureMessage'), '');
    }
  }
}

// Vytvoření singleton instance
const apiConfigService = new ApiConfigService();

module.exports = apiConfigService;