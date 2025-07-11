/**
 * Abstract AI Service Adapter
 * This class defines the interface that all AI model adapters must implement
 */
const BaseApiService = require('../BaseApiService');
// const logger = require('../../utils/logger');

class AIServiceAdapter extends BaseApiService {
  /**
   * Create a new AI service adapter instance
   * @param {string} serviceName - Name of the AI service
   */
  constructor(serviceName) {
    super(serviceName);
  }

  /**
   * Get available models for this AI service
   * @returns {Array<Object>} - List of available models with name and id
   */
  getAvailableModels() {
    throw new Error('getAvailableModels() must be implemented by child classes');
  }

  /**
   * Update the service API key
   * @param {string} apiKey - New API key
   */
  updateApiKey(/* apiKey */) {
    throw new Error('updateApiKey() must be implemented by child classes');
  }

  /**
   * Update service configuration
   * @param {Object} config - New configuration
   */
  updateConfig(/* config */) {
    throw new Error('updateConfig() must be implemented by child classes');
  }

  /**
   * Generate project instructions from source code structure
   * @param {Object} projectData - Project data including structure content
   * @returns {Promise<string|null>} - Generated instructions or null if error
   */
  async generateProjectInstructions(/* projectData */) {
    throw new Error('generateProjectInstructions() must be implemented by child classes');
  }

  /**
   * Generate code review for merge request
   * @param {Object} mergeRequestData - Merge request data including changes
   * @returns {Promise<string|null>} - Generated code review or null if error
   */
  async generateCodeReview(/* mergeRequestData */) {
    throw new Error('generateCodeReview() must be implemented by child classes');
  }
}

module.exports = AIServiceAdapter;
