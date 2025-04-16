const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const MergeRequest = require('../../models/MergeRequest');
const aiServiceProvider = require('../../services/AIServiceFactory');
const logger = require('../../utils/logger');

/**
 * Generate an AI review for a merge request
 * @param {string} [mergeRequestId] - Optional merge request ID
 */
async function generateReview(mergeRequestId) {
  logger.info('=== Generate Code Review ===');

  try {
    // Get active AI service adapter
    const activeAdapter = aiServiceProvider.getActiveAdapter();
    
    // Check if active adapter is configured
    if (!activeAdapter || !activeAdapter.isConfigured()) {
      logger.error(`Active AI service (${activeAdapter ? activeAdapter.serviceName : 'None'}) is not properly configured.`);
      
      const { configureNow } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'configureNow',
          message: 'Would you like to configure the AI service now?',
          default: true,
        },
      ]);
      
      if (configureNow) {
        const AIConfigController = require('../../controllers/AIConfigController');
        const aiConfigController = new AIConfigController();
        await aiConfigController.handleConfig();
        
        // Re-get the active adapter after configuration
        const adapter = aiServiceProvider.getActiveAdapter();
        if (!adapter || !adapter.isConfigured()) {
          logger.error('AI service is still not properly configured. Cannot continue.');
          return;
        }
      } else {
        logger.warn('Operation canceled. Please configure AI service correctly before continuing.');
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

    // Get active adapter after possible configuration
    const adapter = aiServiceProvider.getActiveAdapter();
    
    // Ask if user wants to adjust model or token settings for this review
    const { adjustSettings } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'adjustSettings',
        message: `Would you like to adjust ${adapter.serviceName} settings for this review?`,
        default: false,
      },
    ]);

    if (adjustSettings) {
      // Get available models from adapter
      const adapterModels = adapter.getAvailableModels();
      
      const { model } = await inquirer.prompt([
        {
          type: 'list',
          name: 'model',
          message: `Select ${adapter.serviceName} model to use:`,
          choices: adapterModels.map(model => ({
            name: model.name,
            value: model.id
          })),
          default: adapter.claudeConfig?.model || adapterModels[0].id,
        },
      ]);

      const { maxTokens } = await inquirer.prompt([
        {
          type: 'number',
          name: 'maxTokens',
          message: 'Enter maximum output tokens:',
          default: adapter.claudeConfig?.maxTokens || 4000,
          validate: input => input > 0 || 'Max tokens must be a positive number',
        },
      ]);

      // Update config for this session only
      adapter.updateConfig({ model, maxTokens });
    }

    // Generate the review
    const spinner = ora(`Generating code review with ${adapter.serviceName}...`).start();

    const review = await adapter.generateCodeReview(mergeRequest);

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
  logger.info(chalk.cyan('\n=== AI Code Review ==='));
  logger.info(
    chalk.yellow(`For merge request: ${mergeRequest.title} (MR #${mergeRequest.mergeRequestIid})`)
  );
  logger.info(chalk.yellow(`Project: ${mergeRequest.projectPath}`));
  logger.info('');
  logger.info(mergeRequest.review);

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
