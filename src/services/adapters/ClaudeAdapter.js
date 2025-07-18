/**
 * Claude AI Service Adapter
 * Implements adapter interface for Claude AI API
 */
const AIServiceAdapter = require('./AIServiceAdapter');
const logger = require('../../utils/logger');
const config = require('../../utils/config');

class ClaudeAdapter extends AIServiceAdapter {
  constructor() {
    super('Claude');
  }

  /**
   * Initialize the Claude API client
   */
  initializeClient() {
    this.apiKey = config.getClaudeApiKey();
    this.claudeConfig = config.getClaudeConfig();
    const baseUrl = 'https://api.anthropic.com/v1';

    if (this.apiKey) {
      this.createClient(baseUrl, {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      });
    }
  }

  /**
   * Get available Claude models
   * @returns {Array<Object>} - List of available models
   */
  getAvailableModels() {
    return [
      { name: 'Claude 3 Opus (best quality, slower)', id: 'claude-3-opus-20240229' },
      { name: 'Claude 3 Sonnet (balanced)', id: 'claude-3-sonnet-20240229' },
      { name: 'Claude 3 Haiku (fastest)', id: 'claude-3-haiku-20240307' },
    ];
  }

  /**
   * Perform test request for the Claude API
   * @returns {Promise<Object>} - API response
   */
  async performTestRequest() {
    const response = await this.client.get('/models');
    logger.debug(`Claude API models: ${JSON.stringify(response.data)}`);
    return response;
  }

  /**
   * Update the Claude API key
   * @param {string} apiKey - New Claude API key
   */
  updateApiKey(apiKey) {
    config.setClaudeApiKey(apiKey);
    this.initializeClient();
  }

  /**
   * Update Claude configuration
   * @param {Object} claudeConfig - New Claude configuration
   */
  updateConfig(claudeConfig) {
    config.setClaudeConfig({
      ...config.getClaudeConfig(),
      ...claudeConfig,
    });
    this.claudeConfig = config.getClaudeConfig();
  }

  /**
   * Check if Claude API is configured
   * @returns {boolean} - Whether the API is configured
   */
  isConfigured() {
    return !!this.apiKey;
  }

  /**
   * Generate project instructions from source code structure
   * @param {Object} projectData - Project data including structure content
   * @returns {Promise<string|null>} - Generated instructions or null if error
   */
  async generateProjectInstructions(projectData) {
    if (!this.isConfigured()) {
      logger.warn('Claude API key not configured. Please configure it in the settings.');
      return null;
    }

    return await this.executeRequest(
      async () => {
        const response = await this.client.post('/messages', {
          model: this.claudeConfig.model,
          max_tokens: this.claudeConfig.maxTokens,
          messages: [
            {
              role: 'user',
              content: `I need to generate clear and comprehensive instructions for an AI system about the following project structure. The goal is to create instructions that would help an AI understand the project's organization and purpose.

Here's the project structure information, including original file paths and their mappings:

${projectData.structureContent}

Please generate instructions that:
1. Explain the overall purpose and structure of this codebase based on the file types and organization
2. Highlight the key directories and their functions
3. Note any important relationships between different parts of the code
4. Provide guidance on how the AI should approach understanding and working with this code
5. Include information about how to reference files using their mappings

The instructions should be clear, precise, and focused on helping an AI system effectively work with this codebase.`,
            },
          ],
        });

        return response.data.content[0].text;
      },
      'Error generating project instructions',
      null
    );
  }
}

module.exports = new ClaudeAdapter();
