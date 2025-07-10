/**
 * Configuration Menu Controller - handles all configuration menus
 */
const logger = require('../utils/logger');
const config = require('../utils/config');
const i18n = require('../utils/i18n');
const UIHelper = require('../utils/uiHelper');
const ApiConfigService = require('../utils/ApiConfigService');

class ConfigMenuController {
  constructor() {
    this.uiHelper = UIHelper;
    this.apiConfigService = ApiConfigService;
  }

  /**
   * Handle main configuration menu
   */
  async handleMenu() {
    // Check for missing configuration and show warning
    this.checkMissingConfigs();

    while (true) {
      const configType = await this.uiHelper.select(i18n.t('menu.settings.title'), [
        { name: i18n.t('menu.settings.ai') || 'AI Services', value: 'ai' },
        { name: i18n.t('menu.settings.debug'), value: 'debug' },
        // Language settings temporarily disabled for English-only mode
        // { name: i18n.t('menu.settings.locale'), value: 'locale' },
        { name: i18n.t('menu.settings.show'), value: 'show' },
        { name: i18n.t('menu.settings.back'), value: 'back' },
      ]);

      switch (configType) {
        case 'ai':
          const AIConfigController = require('./AIConfigController');
          const aiConfigController = new AIConfigController();
          await aiConfigController.handleConfig();
          break;
        case 'debug':
          await this.configureDebug();
          break;
        // Language settings temporarily disabled for English-only mode
        // case 'locale':
        //   await this.configureLanguage();
        //   break;
        case 'show':
          this.apiConfigService.showConfiguration();
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
    const claudeApiKey = config.getClaudeApiKey();

    if (!claudeApiKey) {
      this.uiHelper.displayWarning(i18n.t('settings.showConfig.warning'));
      this.uiHelper.displayInfo(i18n.t('settings.showConfig.claudeApiKeyMissing'), '');
    }
  }

  /**
   * Configure debug mode
   */
  async configureDebug() {
    const debugEnabled = config.isDebugMode();

    this.uiHelper.displayHeader('🐛 Debug Configuration');

    const enableDebug = await this.uiHelper.confirm('🐛 Enable debug mode?', debugEnabled);

    config.setDebugMode(enableDebug);
    logger.setDebugMode(enableDebug);

    this.uiHelper.displaySuccess(`Debug mode ${enableDebug ? 'enabled' : 'disabled'}.`);
  }

  /**
   * Configure language settings
   * Note: Temporarily disabled for English-only mode
   * Keep method for future multi-language support
   */
  async configureLanguage() {
    this.uiHelper.displayInfo(
      'Language switching is currently disabled. The application runs in English only.',
      ''
    );
    return;

    // Code kept for future multi-language support
    // this.uiHelper.displayHeader(i18n.t('settings.languageSettings.title'));
    //
    // const currentLocale = i18n.getCurrentLocale();
    // const localeNames = {
    //   en: 'English',
    //   cs: 'Čeština (Czech)',
    // };
    //
    // this.uiHelper.displayInfo(
    //   i18n.t('settings.languageSettings.currentLanguage', { language: localeNames[currentLocale] }),
    //   ''
    // );
    //
    // const newLocale = await this.uiHelper.select(
    //   i18n.t('settings.languageSettings.selectLanguage'),
    //   [
    //     { name: 'English', value: 'en' },
    //     { name: 'Čeština (Czech)', value: 'cs' },
    //   ],
    //   currentLocale
    // );
    //
    // if (newLocale !== currentLocale) {
    //   const success = i18n.setLocale(newLocale);
    //   if (success) {
    //     this.uiHelper.displaySuccess(
    //       i18n.t('settings.languageSettings.languageChanged', { language: localeNames[newLocale] })
    //     );
    //   }
    // }
  }

  /**
   * Show current configuration
   */
  showConfiguration() {
    // Delegate to the ApiConfigService
    this.apiConfigService.showConfiguration();
  }
}

module.exports = ConfigMenuController;
