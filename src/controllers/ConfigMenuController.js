/**
 * Configuration Menu Controller - handles all configuration menus
 */
const inquirer = require('inquirer');
const logger = require('../utils/logger');
const GitlabConfigController = require('./GitlabConfigController');
const ClaudeConfigController = require('./ClaudeConfigController');
const config = require('../utils/config');

class ConfigMenuController {
  constructor() {
    this.gitlabConfigController = new GitlabConfigController();
    this.claudeConfigController = new ClaudeConfigController();
  }

  /**
   * Handle main configuration menu
   */
  async handleMenu() {
    const i18n = require('../utils/i18n');

    // Check for missing configuration and show warning
    this.checkMissingConfigs();

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
            { name: i18n.t('menu.settings.back'), value: 'back' },
          ],
        },
      ]);

      switch (configType) {
        case 'gitlab':
          await this.gitlabConfigController.handleConfig();
          break;
        case 'claude':
          await this.claudeConfigController.handleConfig();
          break;
        case 'debug':
          await this.configureDebug();
          break;
        case 'locale':
          await this.configureLanguage();
          break;
        case 'show':
          this.showConfiguration();
          break;
        case 'back':
          return;
      }
    }
  }

  /**
   * Check missing configurations and show warnings
   */
  checkMissingConfigs() {
    const i18n = require('../utils/i18n');

    const gitlabToken = config.getGitlabToken();
    const claudeApiKey = config.getClaudeApiKey();

    if (!gitlabToken || !claudeApiKey) {
      console.log(`\n⚠️  ${i18n.t('settings.showConfig.warning')}`);
      if (!gitlabToken) console.log(`  ${i18n.t('settings.showConfig.gitlabTokenMissing')}`);
      if (!claudeApiKey) console.log(`  ${i18n.t('settings.showConfig.claudeApiKeyMissing')}`);
      console.log('');
    }
  }

  /**
   * Configure debug mode
   */
  async configureDebug() {
    const debugEnabled = config.isDebugMode();

    console.log('\n=== Debug Configuration ===');

    const { enableDebug } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'enableDebug',
        message: 'Enable debug mode?',
        default: debugEnabled,
      },
    ]);

    config.setDebugMode(enableDebug);
    logger.setDebugMode(enableDebug);

    console.log(`Debug mode ${enableDebug ? 'enabled' : 'disabled'}.`);
  }

  /**
   * Configure language settings
   */
  async configureLanguage() {
    const i18n = require('../utils/i18n');

    console.log('\n=== ' + i18n.t('settings.languageSettings.title') + ' ===');

    const currentLocale = i18n.getCurrentLocale();
    const localeNames = {
      en: 'English',
      cs: 'Čeština (Czech)',
    };

    console.log(
      i18n.t('settings.languageSettings.currentLanguage', { language: localeNames[currentLocale] })
    );

    const { newLocale } = await inquirer.prompt([
      {
        type: 'list',
        name: 'newLocale',
        message: i18n.t('settings.languageSettings.selectLanguage'),
        choices: [
          { name: 'English', value: 'en' },
          { name: 'Čeština (Czech)', value: 'cs' },
        ],
        default: currentLocale,
      },
    ]);

    if (newLocale !== currentLocale) {
      const success = i18n.setLocale(newLocale);
      if (success) {
        console.log(
          i18n.t('settings.languageSettings.languageChanged', { language: localeNames[newLocale] })
        );
      }
    }
  }

  /**
   * Show current configuration
   */
  showConfiguration() {
    const i18n = require('../utils/i18n');

    const gitlabConfig = config.getGitlabConfig();
    const claudeConfig = config.getClaudeConfig();
    const debugEnabled = config.isDebugMode();
    const gitlabToken = config.getGitlabToken();
    const claudeApiKey = config.getClaudeApiKey();

    console.log(`\n=== ${i18n.t('settings.showConfig.title')} ===`);
    console.log('');

    const debugStatus = debugEnabled
      ? i18n.t('settings.showConfig.enabled')
      : i18n.t('settings.showConfig.disabled');

    console.log(i18n.t('settings.showConfig.debugMode', { status: debugStatus }));
    console.log('');

    console.log(i18n.t('settings.showConfig.gitlabConfig'));
    console.log(i18n.t('settings.showConfig.apiUrl', { url: gitlabConfig.baseUrl }));

    const gitlabTokenStatus = gitlabToken
      ? i18n.t('settings.showConfig.configured')
      : i18n.t('settings.showConfig.notConfigured');

    console.log(i18n.t('settings.showConfig.apiToken', { status: gitlabTokenStatus }));
    console.log('');

    console.log(i18n.t('settings.showConfig.claudeConfig'));
    console.log(i18n.t('settings.showConfig.model', { model: claudeConfig.model }));
    console.log(i18n.t('settings.showConfig.maxTokens', { maxTokens: claudeConfig.maxTokens }));

    const claudeKeyStatus = claudeApiKey
      ? i18n.t('settings.showConfig.configured')
      : i18n.t('settings.showConfig.notConfigured');

    console.log(i18n.t('settings.showConfig.apiKey', { status: claudeKeyStatus }));
    console.log('');

    // Show warning if keys are missing
    this.checkMissingConfigs();
  }
}

module.exports = ConfigMenuController;
