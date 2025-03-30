/**
 * Menu Controller - handles the interactive menus for the application
 */

const inquirer = require('inquirer');
const { mainMenu } = require('../cli');
const { projectPrompts, codeReviewPrompts } = require('../cli/prompts');
const config = require('../utils/config');
const logger = require('../utils/logger');

/**
 * Handle project sub-menu
 */
async function handleProjectMenu() {
  while (true) {
    const choice = await projectPrompts.projectChoice();
    
    // We only check requirements at point of feature use, not pre-emptively
    // This allows users to use features that don't need certain credentials
    
    switch (choice) {
      case 'new':
        const createProject = require('../commands/project/createProject');
        await createProject();
        break;
      case 'existing':
        const openProject = require('../commands/project/openProject');
        await openProject();
        break;
      case 'collect':
        const collectFiles = require('../commands/project/collectFiles');
        await collectFiles();
        break;
      case 'analyze':
        const analyzeProject = require('../commands/project/analyzeProject');
        await analyzeProject();
        break;
      case 'back':
        // Return to main menu
        return;
    }
  }
}

/**
 * Handle code review sub-menu
 */
async function handleCodeReviewMenu() {
  while (true) {
    const choice = await codeReviewPrompts.codeReviewChoice();
    
    // Feature-specific requirements will be checked inside each function
    // This allows the menu to be displayed without blocking access
    
    // Now proceed with the actual commands
    switch (choice) {
      case 'fetch':
        const fetchMergeRequests = require('../commands/codeReview/fetchMergeRequests');
        await fetchMergeRequests();
        break;
      case 'review':
        const analyzeMergeRequest = require('../commands/codeReview/analyzeMergeRequest');
        await analyzeMergeRequest();
        break;
      case 'generate':
        const generateReview = require('../commands/codeReview/generateReview');
        await generateReview();
        break;
      case 'back':
        // Return to main menu
        return;
    }
  }
}

/**
 * Configure Claude settings
 * This function is exported from original cerberus.js
 */
async function configureClaude() {
  const claudeService = require('../services/ClaudeService');
  
  const claudeConfig = config.getClaudeConfig();
  const currentApiKey = config.getClaudeApiKey();
  
  console.log('\n=== Claude AI Configuration ===');
  
  // Check if Claude API key is missing and show warning
  if (!currentApiKey) {
    console.log('⚠️  WARNING: Claude API key is not configured. AI features will not work properly.\n');
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
          { name: 'Back', value: 'back' }
        ]
      }
    ]);
    
    switch (configOption) {
      case 'apiKey':
        const { apiKey } = await inquirer.prompt([
          {
            type: 'password',
            name: 'apiKey',
            message: 'Enter Claude API key:',
            default: currentApiKey || '',
            validate: input => input.trim() !== '' || 'API key cannot be empty'
          }
        ]);
        
        claudeService.updateApiKey(apiKey);
        console.log('Claude API key updated.');
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
              { name: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307' }
            ],
            default: claudeConfig.model
          }
        ]);
        
        claudeService.updateConfig({ model });
        console.log(`Claude model updated to ${model}.`);
        break;
      
      case 'maxTokens':
        const { maxTokens } = await inquirer.prompt([
          {
            type: 'number',
            name: 'maxTokens',
            message: 'Enter maximum output tokens:',
            default: claudeConfig.maxTokens,
            validate: input => input > 0 || 'Max tokens must be a positive number'
          }
        ]);
        
        claudeService.updateConfig({ maxTokens });
        console.log(`Max tokens updated to ${maxTokens}.`);
        break;
      
      case 'test':
        console.log('Testing Claude API connection...');
        const isConnected = await claudeService.testConnection();
        
        if (isConnected) {
          console.log('Successfully connected to Claude API!');
        } else {
          console.log('Failed to connect to Claude API. Please check your configuration.');
        }
        break;
      
      case 'back':
        return;
    }
  }
}

/**
 * Configure settings (main configuration menu)
 */
async function configureSettings() {
  // Import i18n service
  const i18n = require('../utils/i18n');
  
  // Check for missing configuration and show warning
  const gitlabToken = config.getGitlabToken();
  const claudeApiKey = config.getClaudeApiKey();
  
  if (!gitlabToken || !claudeApiKey) {
    console.log(`\n⚠️  ${i18n.t('settings.showConfig.warning')}`);
    if (!gitlabToken) console.log(`  ${i18n.t('settings.showConfig.gitlabTokenMissing')}`);
    if (!claudeApiKey) console.log(`  ${i18n.t('settings.showConfig.claudeApiKeyMissing')}`);
    console.log('');
  }
  
  while (true) {
    const { configType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'configType',
        message: i18n.t('menu.settings.title'),
        choices: [
          { name: i18n.t('menu.settings.gitlab'), value: 'gitlab' },
          { name: i18n.t('menu.settings.claude'), value: 'claude' },
          { name: i18n.t('menu.settings.debug'), value: 'debug' },
          { name: i18n.t('menu.settings.locale'), value: 'locale' },
          { name: i18n.t('menu.settings.show'), value: 'show' },
          { name: i18n.t('menu.settings.back'), value: 'back' }
        ]
      }
    ]);
    
    switch (configType) {
      case 'gitlab':
        await configureGitlab();
        break;
      case 'claude':
        await configureClaude();
        break;
      case 'debug':
        await configureDebug();
        break;
      case 'locale':
        await configureLanguage();
        break;
      case 'show':
        showConfiguration();
        break;
      case 'back':
        return;
    }
  }
}

/**
 * Configure GitLab settings
 */
async function configureGitlab() {
  const gitlabService = require('../services/GitlabService');
  
  const gitlabConfig = config.getGitlabConfig();
  const currentToken = config.getGitlabToken();
  
  console.log('\n=== GitLab Configuration ===');
  
  // Check if GitLab token is missing and show warning
  if (!currentToken) {
    console.log('⚠️  WARNING: GitLab API token is not configured. Some features may not work properly.\n');
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
          { name: 'Back', value: 'back' }
        ]
      }
    ]);
    
    switch (configOption) {
      case 'url':
        const { baseUrl } = await inquirer.prompt([
          {
            type: 'input',
            name: 'baseUrl',
            message: 'Enter GitLab API URL:',
            default: gitlabConfig.baseUrl,
            validate: input => input.trim() !== '' || 'URL cannot be empty'
          }
        ]);
        
        gitlabService.updateBaseUrl(baseUrl);
        console.log('GitLab API URL updated.');
        break;
      
      case 'token':
        const { token } = await inquirer.prompt([
          {
            type: 'password',
            name: 'token',
            message: 'Enter GitLab API token:',
            default: currentToken || '',
            validate: input => input.trim() !== '' || 'Token cannot be empty'
          }
        ]);
        
        gitlabService.updateToken(token);
        console.log('GitLab API token updated.');
        break;
      
      case 'test':
        console.log('Testing GitLab API connection...');
        const isConnected = await gitlabService.testConnection();
        
        if (isConnected) {
          console.log('Successfully connected to GitLab API!');
        } else {
          console.log('Failed to connect to GitLab API. Please check your configuration.');
        }
        break;
      
      case 'back':
        return;
    }
  }
}

/**
 * Configure debug mode
 */
async function configureDebug() {
  const debugEnabled = config.isDebugMode();
  
  console.log('\n=== Debug Configuration ===');
  
  const { enableDebug } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'enableDebug',
      message: 'Enable debug mode?',
      default: debugEnabled
    }
  ]);
  
  config.setDebugMode(enableDebug);
  logger.setDebugMode(enableDebug);
  
  console.log(`Debug mode ${enableDebug ? 'enabled' : 'disabled'}.`);
}

/**
 * Show current configuration
 */
function showConfiguration() {
  const i18n = require('../utils/i18n');
  
  const gitlabConfig = config.getGitlabConfig();
  const claudeConfig = config.getClaudeConfig();
  const debugEnabled = config.isDebugMode();
  const gitlabToken = config.getGitlabToken();
  const claudeApiKey = config.getClaudeApiKey();
  
  console.log(`\n=== ${i18n.t('settings.showConfig.title')} ===`);
  console.log('');
  
  const debugStatus = debugEnabled ? 
    i18n.t('settings.showConfig.enabled') : 
    i18n.t('settings.showConfig.disabled');
  
  console.log(i18n.t('settings.showConfig.debugMode', { status: debugStatus }));
  console.log('');
  
  console.log(i18n.t('settings.showConfig.gitlabConfig'));
  console.log(i18n.t('settings.showConfig.apiUrl', { url: gitlabConfig.baseUrl }));
  
  const gitlabTokenStatus = gitlabToken ? 
    i18n.t('settings.showConfig.configured') : 
    i18n.t('settings.showConfig.notConfigured');
  
  console.log(i18n.t('settings.showConfig.apiToken', { status: gitlabTokenStatus }));
  console.log('');
  
  console.log(i18n.t('settings.showConfig.claudeConfig'));
  console.log(i18n.t('settings.showConfig.model', { model: claudeConfig.model }));
  console.log(i18n.t('settings.showConfig.maxTokens', { maxTokens: claudeConfig.maxTokens }));
  
  const claudeKeyStatus = claudeApiKey ? 
    i18n.t('settings.showConfig.configured') : 
    i18n.t('settings.showConfig.notConfigured');
  
  console.log(i18n.t('settings.showConfig.apiKey', { status: claudeKeyStatus }));
  console.log('');

  // Show warning if keys are missing
  if (!gitlabToken || !claudeApiKey) {
    console.log(`⚠️  ${i18n.t('settings.showConfig.warning')}`);
    if (!gitlabToken) console.log(`  ${i18n.t('settings.showConfig.gitlabTokenMissing')}`);
    if (!claudeApiKey) console.log(`  ${i18n.t('settings.showConfig.claudeApiKeyMissing')}`);
    console.log(`\n${i18n.t('settings.showConfig.configureMessage')}`);
    console.log('');
  }
}

/**
 * Start the interactive menu system
 */
async function startInteractiveMenu() {
  try {
    while (true) {
      const choice = await mainMenu();
      
      // Check required configurations for each feature
      if (choice === 'project') {
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
                { name: 'Go back to main menu', value: 'back' }
              ]
            }
          ]);
          
          if (action === 'configure') {
            await configureClaude();
            continue;
          } else if (action === 'back') {
            continue;
          }
          // If 'continue', proceed to project menu below
        }
        
        // For both paths (with or without Claude API key)
        await handleProjectMenu();
      } 
      else if (choice === 'codeReview') {
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
                { name: 'Go back to main menu', value: 'back' }
              ]
            }
          ]);
          
          if (action === 'configure') {
            await configureSettings();
            continue;
          } else if (action === 'back') {
            continue;
          }
          // If 'continue', proceed to code review menu below
        }
        
        // For both paths
        await handleCodeReviewMenu();
      }
      else if (choice === 'configure') {
        await configureSettings();
      }
      else if (choice === 'exit') {
        const i18n = require('../utils/i18n');
        console.log(i18n.t('farewell'));
        process.exit(0);
      }
    }
  } catch (error) {
    console.error('An error occurred:', error);
    process.exit(1);
  }
}

/**
 * Configure language settings
 */
async function configureLanguage() {
  const i18n = require('../utils/i18n');
  
  console.log('\n=== ' + i18n.t('settings.languageSettings.title') + ' ===');
  
  const currentLocale = i18n.getCurrentLocale();
  const localeNames = {
    'en': 'English',
    'cs': 'Čeština (Czech)'
  };
  
  console.log(i18n.t('settings.languageSettings.currentLanguage', { language: localeNames[currentLocale] }));
  
  const { newLocale } = await inquirer.prompt([
    {
      type: 'list',
      name: 'newLocale',
      message: i18n.t('settings.languageSettings.selectLanguage'),
      choices: [
        { name: 'English', value: 'en' },
        { name: 'Čeština (Czech)', value: 'cs' }
      ],
      default: currentLocale
    }
  ]);
  
  if (newLocale !== currentLocale) {
    const success = i18n.setLocale(newLocale);
    if (success) {
      console.log(i18n.t('settings.languageSettings.languageChanged', { language: localeNames[newLocale] }));
    }
  }
}

module.exports = {
  startInteractiveMenu,
  handleProjectMenu,
  handleCodeReviewMenu,
  configureClaude,
  configureGitlab,
  configureSettings,
  configureDebug,
  configureLanguage,
  showConfiguration
};