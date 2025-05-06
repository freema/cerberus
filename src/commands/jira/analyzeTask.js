/**
 * Analyze and process a Jira task
 */
const logger = require('../../utils/logger');
const JiraService = require('../../services/JiraService');
const path = require('path');
const fs = require('fs-extra');

/**
 * Process a Jira task URL and create a JSON summary with optional AI analysis
 * @param {string} taskUrl - URL to the Jira task
 * @param {boolean} generateAIAnalysis - Whether to generate AI analysis
 * @returns {Promise<Object|null>} - Result of the operation or null if failed
 */
async function analyzeTask(taskUrl, generateAIAnalysis = true) {
  try {
    logger.info(`Analyzing Jira task from URL: ${taskUrl}`);
    
    // Parse the URL to get the task key
    const parsed = JiraService.parseJiraUrl(taskUrl);
    if (!parsed) {
      logger.error('Failed to parse Jira task URL. Please provide a valid URL like https://your-domain.atlassian.net/browse/PROJECT-123');
      return null;
    }
    
    const { issueKey } = parsed;
    logger.info(`Fetching data for issue ${issueKey}...`);
    
    // Nejprve zkusíme ověřit spojení
    const isConnected = await JiraService.testConnection();
    if (!isConnected) {
      logger.error(`Cannot connect to Jira API. Please check your configuration in settings.`);
      logger.info(`Tip: Check if your URL is correct and your authentication token is in the right format.`);
      logger.info(`For Jira Cloud: Use 'email@company.com:api_token' format.`);
      logger.info(`For Jira Server: Use a Personal Access Token (PAT).`);
      return null;
    }
    
    // Create a summary of the issue including subtasks and linked issues
    try {
      const summary = await JiraService.createIssueSummary(issueKey);
      if (!summary) {
        logger.error(`Failed to fetch data for issue ${issueKey}. The issue might not exist or you might not have permission to access it.`);
        return null;
      }
      
      // Volitelné generování AI analýzy
      let aiAnalysis = null;
      if (generateAIAnalysis) {
        // Kontrola dostupnosti Claude API
        const ClaudeAdapter = require('../../services/adapters/ClaudeAdapter');
        if (ClaudeAdapter.isConfigured()) {
          logger.info(`Generating AI analysis for issue ${issueKey}...`);
          aiAnalysis = await ClaudeAdapter.generateJiraIssueSummary(summary);
          if (!aiAnalysis) {
            logger.warn(`Failed to generate AI analysis. Continuing without it.`);
          }
        } else {
          logger.warn(`Claude AI API key is not configured. Skipping AI analysis generation.`);
        }
      }

      // Save the summary to a file
      const savedPaths = await JiraService.saveSummaryToFile(issueKey, summary, aiAnalysis);
      if (!savedPaths) {
        logger.error('Failed to save summary to file.');
        return null;
      }

      // Return the result
      return {
        success: true,
        issueKey,
        filePath: savedPaths.jsonPath,
        analysisPath: savedPaths.analysisPath,
        summary,
        aiAnalysis
      };
    } catch (error) {
      if (error.response?.status === 403) {
        logger.error(`Permission denied: You don't have access to issue ${issueKey}.`);
        logger.info(`Check that your account has permission to view this issue.`);
      } else if (error.response?.status === 404) {
        logger.error(`Issue ${issueKey} not found. Check that the issue key is correct.`);
      } else if (error.response?.status === 401) {
        logger.error(`Authentication failed. Your API token might be incorrect or expired.`);
        logger.info(`Tip: Go to Configure -> Jira Settings to update your token.`);
      } else {
        logger.error(`Error fetching issue ${issueKey}:`, error.message);
        if (require('../../utils/config').isDebugMode()) {
          logger.debug(`Status: ${error.response?.status || 'unknown'}`);
          logger.debug(`Full error: ${JSON.stringify(error.response?.data || {}, null, 2)}`);
        }
      }
      return null;
    }
  } catch (error) {
    logger.error('Error analyzing Jira task:', error.message);
    if (require('../../utils/config').isDebugMode()) {
      logger.debug(`Full error: ${error.stack}`);
    }
    return null;
  }
}

module.exports = analyzeTask;