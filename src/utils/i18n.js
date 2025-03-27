/**
 * Internationalization (i18n) utility
 * Provides translation functionality for the application
 */
const fs = require('fs-extra');
const path = require('path');
const config = require('./config');
const logger = require('./logger');

class I18nService {
  constructor() {
    this.defaultLocale = 'en';
    this.locale = this.defaultLocale;
    this.translations = {};
    
    // Initialize translations
    this.loadTranslations();
  }

  /**
   * Load translations from locale files
   */
  loadTranslations() {
    try {
      // Get the locales directory
      const localesDir = path.join(process.cwd(), 'locales');
      
      // Ensure locales directory exists
      fs.ensureDirSync(localesDir);
      
      // Read available locale files
      const files = fs.readdirSync(localesDir);
      
      // Process each locale file
      files.forEach(file => {
        if (file.endsWith('.json')) {
          const locale = file.replace('.json', '');
          const filePath = path.join(localesDir, file);
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            this.translations[locale] = JSON.parse(content);
            logger.debug(`Loaded translations for ${locale}`);
          } catch (err) {
            logger.error(`Error loading translations for ${locale}:`, err);
          }
        }
      });
      
      // Create default locale files if they don't exist
      if (!this.translations['en']) {
        logger.info('Creating default English locale file');
        this.translations['en'] = require('../../locales/en.default.json');
        fs.writeFileSync(
          path.join(localesDir, 'en.json'),
          JSON.stringify(this.translations['en'], null, 2),
          'utf8'
        );
      }
      
      if (!this.translations['cs']) {
        logger.info('Creating default Czech locale file');
        this.translations['cs'] = require('../../locales/cs.default.json');
        fs.writeFileSync(
          path.join(localesDir, 'cs.json'),
          JSON.stringify(this.translations['cs'], null, 2),
          'utf8'
        );
      }
      
      // Get current locale from config or use default
      this.locale = config.get('locale', this.defaultLocale);
      
      // Validate locale
      if (!this.translations[this.locale]) {
        logger.warn(`Locale ${this.locale} not available, falling back to ${this.defaultLocale}`);
        this.locale = this.defaultLocale;
      }
      
      logger.info(`Using locale: ${this.locale}`);
    } catch (error) {
      logger.error('Error initializing translations:', error);
      // Set fallback translations
      this.translations = {
        'en': require('../../locales/en.default.json')
      };
    }
  }

  /**
   * Set the active locale
   * @param {string} locale - Locale code (e.g., 'en', 'cs')
   * @returns {boolean} - Whether the locale was set successfully
   */
  setLocale(locale) {
    if (this.translations[locale]) {
      this.locale = locale;
      config.set('locale', locale);
      logger.info(`Locale set to ${locale}`);
      return true;
    }
    logger.warn(`Locale ${locale} not available, keeping ${this.locale}`);
    return false;
  }

  /**
   * Get a translated string by key
   * @param {string} key - Translation key (can use dot notation for nested keys)
   * @param {Object} [vars] - Variables to replace in the string
   * @returns {string} - Translated string
   */
  t(key, vars = {}) {
    // Split key by dots to handle nested objects
    const keys = key.split('.');
    
    // Try to get translation from current locale
    let translation = this.getNestedTranslation(this.translations[this.locale], keys);
    
    // If not found in current locale, fall back to default locale
    if (!translation && this.locale !== this.defaultLocale) {
      translation = this.getNestedTranslation(this.translations[this.defaultLocale], keys);
    }
    
    // If still not found, return the key itself
    if (!translation) {
      return key;
    }
    
    // Replace variables in the string
    return this.replaceVariables(translation, vars);
  }

  /**
   * Get a nested translation from an object using an array of keys
   * @param {Object} obj - Translation object
   * @param {Array} keys - Array of keys to navigate the object
   * @returns {string|null} - Translation or null if not found
   */
  getNestedTranslation(obj, keys) {
    if (!obj) return null;
    
    let current = obj;
    
    for (const key of keys) {
      if (current[key] === undefined) {
        return null;
      }
      current = current[key];
    }
    
    return typeof current === 'string' ? current : null;
  }

  /**
   * Replace variables in a string
   * @param {string} str - String with variables like {{varName}}
   * @param {Object} vars - Variables to replace
   * @returns {string} - String with replaced variables
   */
  replaceVariables(str, vars) {
    return str.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return vars[varName] !== undefined ? vars[varName] : match;
    });
  }

  /**
   * Get all available locales
   * @returns {Array} - Array of available locale codes
   */
  getAvailableLocales() {
    return Object.keys(this.translations);
  }

  /**
   * Get the current locale
   * @returns {string} - Current locale code
   */
  getCurrentLocale() {
    return this.locale;
  }
}

module.exports = new I18nService();
