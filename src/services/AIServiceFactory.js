/**
 * AI Service Provider
 * Factory pattern implementation for managing AI service adapters
 */
const logger = require('../utils/logger');
const config = require('../utils/config');

class AIServiceProvider {
  constructor() {
    this.adapters = {};
    this.registerAdapters();
  }

  /**
   * Register available AI service adapters
   */
  registerAdapters() {
    // Register Claude adapter
    try {
      const claudeAdapter = require('./adapters/ClaudeAdapter');
      this.adapters['claude'] = claudeAdapter;
    } catch (error) {
      logger.error('Error registering Claude adapter:', error);
    }

    // Future adapters can be registered here
    // For example: OpenAI/GPT, Gemini, Llama, etc.
  }

  /**
   * Get all registered AI service adapters
   * @returns {Object} - Map of adapter ID to adapter instance
   */
  getAllAdapters() {
    return this.adapters;
  }

  /**
   * Get available AI service options for UI selection
   * @returns {Array<Object>} - List of available AI services
   */
  getAvailableAdapters() {
    return Object.entries(this.adapters).map(([id, adapter]) => ({
      id,
      name: adapter.serviceName,
      isConfigured: adapter.isConfigured(),
    }));
  }

  /**
   * Get an AI service adapter by ID
   * @param {string} adapterId - ID of the adapter
   * @returns {Object|null} - Adapter instance or null if not found
   */
  getAdapter(adapterId) {
    return this.adapters[adapterId] || null;
  }

  /**
   * Get the currently active AI service adapter
   * @returns {Object|null} - Active adapter instance or null if none configured
   */
  getActiveAdapter() {
    const activeAdapterId = config.get('activeAIService', 'claude');
    const adapter = this.getAdapter(activeAdapterId);

    if (!adapter) {
      logger.warn(`Active AI service ${activeAdapterId} not found, falling back to Claude`);
      return this.getAdapter('claude');
    }

    return adapter;
  }

  /**
   * Set the active AI service adapter
   * @param {string} adapterId - ID of the adapter to set as active
   * @returns {boolean} - Whether the operation was successful
   */
  setActiveAdapter(adapterId) {
    if (!this.adapters[adapterId]) {
      logger.error(`AI service adapter ${adapterId} not found`);
      return false;
    }

    config.set('activeAIService', adapterId);
    return true;
  }
}

module.exports = new AIServiceProvider();
