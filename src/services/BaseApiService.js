/**
 * Base API Service class providing common functionality
 */
const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../utils/config');

class BaseApiService {
  /**
   * Create a new API service instance
   * @param {string} serviceName - Name of the service
   */
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.initializeClient();
  }

  /**
   * Initialize the API client - should be implemented by child classes
   */
  initializeClient() {
    throw new Error('initializeClient() must be implemented by child classes');
  }

  /**
   * Create API client with specified configuration
   * @param {string} baseUrl - Base URL for API
   * @param {Object} headers - Headers for API requests
   * @param {Object} options - Additional Axios options
   */
  createClient(baseUrl, headers, options = {}) {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      ...options
    });
  }

  /**
   * Test the API connection - base implementation
   * @returns {Promise<boolean>} - Whether the connection is working
   */
  async testConnection() {
    if (!this.isConfigured()) {
      logger.warn(`${this.serviceName} API is not configured`);
      return false;
    }

    try {
      await this.performTestRequest();
      logger.success(`${this.serviceName} API connection successful`);
      return true;
    } catch (error) {
      logger.error(`Failed to connect to ${this.serviceName} API:`, error);
      return false;
    }
  }

  /**
   * Perform test request - should be implemented by child classes
   */
  async performTestRequest() {
    throw new Error('performTestRequest() must be implemented by child classes');
  }

  /**
   * Check if API is configured - should be implemented by child classes
   * @returns {boolean} - Whether the API is configured
   */
  isConfigured() {
    throw new Error('isConfigured() must be implemented by child classes');
  }
  
  /**
   * Execute API request with error handling
   * @param {Function} requestFn - Function that executes the request
   * @param {string} errorMessage - Error message to log
   * @param {*} defaultReturn - Default return value if request fails
   * @returns {Promise<*>} - Response data or defaultReturn if error
   */
  async executeRequest(requestFn, errorMessage, defaultReturn = null) {
    try {
      return await requestFn();
    } catch (error) {
      logger.error(errorMessage, error);
      return defaultReturn;
    }
  }
}

module.exports = BaseApiService;
