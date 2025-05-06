/**
 * ApiConfigService - Centralizovaná služba pro konfiguraci API
 */
const config = require('./config');
const logger = require('./logger');
const GitlabService = require('../services/GitlabService');
const UIHelper = require('./UIHelper');

class ApiConfigService {
  constructor() {
    this.gitlabService = GitlabService;
    this.aiServiceProvider = require('../services/AIServiceFactory');
    this.claudeAdapter = this.aiServiceProvider.getAdapter('claude');
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
   * @deprecated Use AIConfigController instead
   * @returns {Promise<boolean>} - Zda je konfigurace úspěšná
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
   * Testování připojení ke Claude API
   * @returns {Promise<boolean>} - Zda je spojení funkční
   */
  async testClaudeConnection() {
    this.uiHelper.displayInfo('Testing Claude API connection...', '');
    
    const isConnected = await this.claudeAdapter.testConnection();
    
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
        { name: 'Configure AI Services', value: 'configure' },
        { name: 'Continue to Project menu (some features may be limited)', value: 'continue' },
        { name: 'Go back to main menu', value: 'back' }
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
        // Configure both GitLab and AI services
        if (!gitlabToken) {
          await this.configureGitlab();
        }
        if (!claudeApiKey) {
          const AIConfigController = require('../controllers/AIConfigController');
          const aiConfigController = new AIConfigController();
          await aiConfigController.handleConfig();
        }
        return false; // Return to main menu after configuration
      } else if (action === 'back') {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Kontrola a řešení chybějícího API klíče pro Jira
   * @returns {Promise<boolean>} - Zda pokračovat dále
   */
  async checkJiraApiKey() {
    const jiraToken = config.getJiraToken();
    
    if (!jiraToken) {
      this.uiHelper.displayWarning('Jira API token is not configured!');
      this.uiHelper.displayInfo('Some features that require Jira will not work without this token.', '');
      
      const action = await this.uiHelper.select('What would you like to do?', [
        { name: 'Configure Jira API', value: 'configure' },
        { name: 'Continue to Jira menu (some features may be limited)', value: 'continue' },
        { name: 'Go back to main menu', value: 'back' }
      ]);
      
      if (action === 'configure') {
        await this.configureJira();
        return !!config.getJiraToken(); // Return whether token is configured
      } else if (action === 'back') {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Konfigurace Jira API
   * @returns {Promise<boolean>} - Zda je konfigurace úspěšná
   */
  async configureJira() {
    const JiraConfigController = require('../controllers/JiraConfigController');
    const jiraConfigController = new JiraConfigController();
    await jiraConfigController.handleConfig();
    
    // Return whether API key is configured
    return !!config.getJiraToken();
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
    const jiraToken = config.getJiraToken();
    
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
    
    const activeAdapter = this.aiServiceProvider.getActiveAdapter();
    this.uiHelper.displayInfo(i18n.t('settings.showConfig.claudeConfig') || 'AI Configuration:', '');
    this.uiHelper.displayInfo(`Active AI Service: ${activeAdapter.serviceName}`, '');
    this.uiHelper.displayInfo(i18n.t('settings.showConfig.model', { model: claudeConfig.model }), '');
    this.uiHelper.displayInfo(i18n.t('settings.showConfig.maxTokens', { maxTokens: claudeConfig.maxTokens }), '');
    
    const claudeKeyStatus = claudeApiKey ? 
      i18n.t('settings.showConfig.configured') : 
      i18n.t('settings.showConfig.notConfigured');
    
    this.uiHelper.displayInfo(i18n.t('settings.showConfig.apiKey', { status: claudeKeyStatus }), '');
    
    // Zobrazení Jira konfigurace
    this.uiHelper.displayInfo('Jira Configuration:', '');
    
    const jiraTokenStatus = jiraToken ? 
      i18n.t('settings.showConfig.configured') : 
      i18n.t('settings.showConfig.notConfigured');
    
    this.uiHelper.displayInfo(`API Token: ${jiraTokenStatus}`, '');
    
    // Varování, pokud chybí klíče
    if (!gitlabToken || !claudeApiKey || !jiraToken) {
      this.uiHelper.displayWarning(i18n.t('settings.showConfig.warning'));
      if (!gitlabToken) this.uiHelper.displayInfo(i18n.t('settings.showConfig.gitlabTokenMissing'), '');
      if (!claudeApiKey) this.uiHelper.displayInfo(i18n.t('settings.showConfig.claudeApiKeyMissing'), '');
      if (!jiraToken) this.uiHelper.displayInfo(i18n.t('settings.showConfig.jiraTokenMissing'), '');
      this.uiHelper.displayInfo(i18n.t('settings.showConfig.configureMessage'), '');
    }
  }
}

// Vytvoření singleton instance
const apiConfigService = new ApiConfigService();

module.exports = apiConfigService;