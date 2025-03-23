const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../utils/config');

/**
 * Service for interacting with Claude AI API
 */
class ClaudeService {
  constructor() {
    this.initializeClient();
  }

  /**
   * Initialize the Claude API client
   */
  initializeClient() {
    this.apiKey = config.getClaudeApiKey();
    this.claudeConfig = config.getClaudeConfig();
    this.baseUrl = 'https://api.anthropic.com/v1';
    
    // Create Claude API client if API key is available
    if (this.apiKey) {
      this.client = axios.create({
        baseURL: this.baseUrl,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        }
      });
    }
  }

  /**
   * Test the Claude API connection
   * @returns {Promise<boolean>} - Whether the connection is working
   */
  async testConnection() {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      // A simple models request to test the API
      const response = await this.client.get('/models');
      logger.debug(`Claude API models: ${JSON.stringify(response.data)}`);
      return true;
    } catch (error) {
      logger.error('Failed to connect to Claude API:', error);
      return false;
    }
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
      ...claudeConfig
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
   * @param {Object} projectData - Project data including directory structure
   * @returns {Promise<string|null>} - Generated instructions or null if error
   */
  async generateProjectInstructions(projectData) {
    if (!this.isConfigured()) {
      logger.warn('Claude API key not configured. Please configure it in the settings.');
      return null;
    }

    try {
      const response = await this.client.post('/messages', {
        model: this.claudeConfig.model,
        max_tokens: this.claudeConfig.maxTokens,
        messages: [
          {
            role: 'user',
            content: `I need to generate clear and comprehensive instructions for an AI system about the following project structure. The goal is to create instructions that would help an AI understand the project's organization and purpose.

Here's the directory structure:
${projectData.directoryStructure}

Please generate instructions that:
1. Explain the overall purpose and structure of this codebase
2. Highlight the key directories and their functions
3. Note any important relationships between different parts of the code
4. Provide guidance on how the AI should approach understanding and working with this code

The instructions should be clear, precise, and focused on helping an AI system effectively work with this codebase.`
          }
        ]
      });

      return response.data.content[0].text;
    } catch (error) {
      logger.error('Error generating project instructions:', error);
      return null;
    }
  }

  /**
   * Generate code review for merge request
   * @param {Object} mergeRequestData - Merge request data including changes
   * @returns {Promise<string|null>} - Generated code review or null if error
   */
  async generateCodeReview(mergeRequestData) {
    if (!this.isConfigured()) {
      logger.warn('Claude API key not configured. Please configure it in the settings.');
      return null;
    }

    try {
      // Prepare the merge request data for Claude
      let changesText = '';
      mergeRequestData.changes.forEach(change => {
        changesText += `\nFile: ${change.path}\nChange Type: ${change.type}\n`;
        if (change.diff) {
          changesText += `Diff:\n${change.diff}\n`;
        }
        if (change.fullFileContent) {
          changesText += `\nFull File Content:\n${change.fullFileContent.substring(0, 2000)}${change.fullFileContent.length > 2000 ? '...(truncated)' : ''}\n`;
        }
        changesText += '\n---\n';
      });

      const response = await this.client.post('/messages', {
        model: this.claudeConfig.model,
        max_tokens: this.claudeConfig.maxTokens,
        messages: [
          {
            role: 'user',
            content: `Please review the following code changes for a merge request in GitLab.

Merge Request Information:
Title: ${mergeRequestData.title}
Description: ${mergeRequestData.description || 'No description provided'}
Author: ${mergeRequestData.author?.name || 'Unknown'}
Source Branch: ${mergeRequestData.sourceBranch}
Target Branch: ${mergeRequestData.targetBranch}

Changes:
${changesText}

Please provide a comprehensive code review that includes:
1. Overall assessment of the changes
2. Code quality review
3. Potential bugs or issues
4. Security considerations
5. Performance implications
6. Suggestions for improvement

Format your review in a clear, professional manner with specific examples from the code.`
          }
        ]
      });

      return response.data.content[0].text;
    } catch (error) {
      logger.error('Error generating code review:', error);
      return null;
    }
  }
}

module.exports = new ClaudeService();