const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const MergeRequest = require('../../models/MergeRequest');
const claudeService = require('../../services/ClaudeService');
const logger = require('../../utils/logger');

/**
 * Generate an AI review for a merge request
 * @param {string} [mergeRequestId] - Optional merge request ID
 */
async function generateReview(mergeRequestId) {
  logger.info('=== Generate Code Review ===');

  try {
    // Check if Claude API is configured
    if (!claudeService.isConfigured()) {
      logger.error('Claude API key not configured.');

      const { addApiKey } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'addApiKey',
          message: 'Would you like to configure a Claude API key now?',
          default: true,
        },
      ]);

      if (addApiKey) {
        const { apiKey } = await inquirer.prompt([
          {
            type: 'input',
            name: 'apiKey',
            message: 'Enter your Claude API key:',
            validate: input => input.trim() !== '' || 'API key cannot be empty',
          },
        ]);

        claudeService.updateApiKey(apiKey);
        logger.success('Claude API key configured.');

        // Test the connection
        logger.info('Testing Claude API connection...');
        const isConnected = await claudeService.testConnection();

        if (!isConnected) {
          logger.error(
            'Could not connect to Claude API with the provided key. Please check your configuration.'
          );
          return;
        }
      } else {
        logger.warn('Operation canceled. Please configure Claude API correctly before continuing.');
        return;
      }
    }

    // If no ID provided, let user select one
    if (!mergeRequestId) {
      const mergeRequests = await MergeRequest.listAll();

      if (mergeRequests.length === 0) {
        logger.warn('No merge requests found. Please fetch a merge request first.');

        const { fetchNow } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'fetchNow',
            message: 'Would you like to fetch a merge request now?',
            default: true,
          },
        ]);

        if (fetchNow) {
          const fetchMergeRequests = require('./fetchMergeRequests');
          await fetchMergeRequests();
          return;
        } else {
          return;
        }
      }

      const { selectedMergeRequest } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedMergeRequest',
          message: 'Select a merge request to review:',
          choices: mergeRequests,
        },
      ]);

      mergeRequestId = selectedMergeRequest;
    }

    // Load the merge request
    const mergeRequest = await MergeRequest.load(mergeRequestId);

    // Check if we already have a review
    if (mergeRequest.review) {
      const { regenerateReview } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'regenerateReview',
          message: 'This merge request already has a review. Would you like to regenerate it?',
          default: false,
        },
      ]);

      if (!regenerateReview) {
        displayReview(mergeRequest);
        return mergeRequest;
      }
    }

    // Get Claude configuration options
    const claudeConfig = claudeService.claudeConfig;

    // Ask if user wants to adjust model or token settings for this review
    const { adjustSettings } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'adjustSettings',
        message: 'Would you like to adjust Claude API settings for this review?',
        default: false,
      },
    ]);

    if (adjustSettings) {
      const { model } = await inquirer.prompt([
        {
          type: 'list',
          name: 'model',
          message: 'Select Claude model to use:',
          choices: [
            { name: 'Claude 3 Opus (best quality, slower)', value: 'claude-3-opus-20240229' },
            { name: 'Claude 3 Sonnet (balanced)', value: 'claude-3-sonnet-20240229' },
            { name: 'Claude 3 Haiku (fastest)', value: 'claude-3-haiku-20240307' },
          ],
          default: claudeConfig.model,
        },
      ]);

      const { maxTokens } = await inquirer.prompt([
        {
          type: 'number',
          name: 'maxTokens',
          message: 'Enter maximum output tokens:',
          default: claudeConfig.maxTokens,
          validate: input => input > 0 || 'Max tokens must be a positive number',
        },
      ]);

      // Update config for this session only
      claudeService.updateConfig({ model, maxTokens });
    }

    // Generate the review
    const spinner = ora('Generating code review with Claude AI...').start();

    const review = await claudeService.generateCodeReview(mergeRequest);

    if (!review) {
      spinner.fail('Failed to generate review.');
      return;
    }

    // Save the review
    mergeRequest.setReview(review);
    await mergeRequest.save();

    spinner.succeed('Code review generated successfully.');

    // Display the review
    displayReview(mergeRequest);

    return mergeRequest;
  } catch (error) {
    logger.error('Error generating review:', error);
  }
}

/**
 * Display a merge request review
 * @param {MergeRequest} mergeRequest - Merge request with review
 */
function displayReview(mergeRequest) {
  console.log(chalk.cyan('\n=== AI Code Review ==='));
  console.log(
    chalk.yellow(`For merge request: ${mergeRequest.title} (MR #${mergeRequest.mergeRequestIid})`)
  );
  console.log(chalk.yellow(`Project: ${mergeRequest.projectPath}`));
  console.log('');
  console.log(mergeRequest.review);

  // Ask if user wants to copy the review to clipboard
  inquirer
    .prompt([
      {
        type: 'confirm',
        name: 'copyToClipboard',
        message: 'Would you like to copy this review to your clipboard?',
        default: true,
      },
    ])
    .then(({ copyToClipboard }) => {
      if (copyToClipboard) {
        try {
          // Use the clipboard utility module
          const clipboard = require('../../utils/clipboard');
          clipboard.copyWithFeedback(mergeRequest.review, 'Review copied to clipboard.');
        } catch (error) {
          logger.error('Failed to copy to clipboard:', error);
        }
      }
    });
}

module.exports = generateReview;
