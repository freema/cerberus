/**
 * Claude Configuration Controller
 */
const inquirer = require('inquirer');
const logger = require('../utils/logger');

class ClaudeConfigController {
  /**
   * Handle Claude configuration
   * @deprecated Use AIConfigController instead
   */
  async handleConfig() {
    // Use the new AIConfigController instead
    const AIConfigController = require('./AIConfigController');
    const aiConfigController = new AIConfigController();
    await aiConfigController.handleAdapterConfig('claude');
  }
}

module.exports = ClaudeConfigController;
