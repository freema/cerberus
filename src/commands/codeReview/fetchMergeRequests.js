const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const MergeRequest = require('../../models/MergeRequest');
const gitlabService = require('../../services/GitlabService');
const config = require('../../utils/config');
const logger = require('../../utils/logger');

/**
 * Fetch merge requests from GitLab
 */
async function fetchMergeRequests() {
  logger.info('=== Fetch GitLab Merge Requests ===');

  try {
    // Check if GitLab token is configured
    if (!gitlabService.isConfigured()) {
      logger.error('GitLab token not configured.');

      const { addToken } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'addToken',
          message: 'Would you like to configure a GitLab token now?',
          default: true,
        },
      ]);

      if (addToken) {
        const { token } = await inquirer.prompt([
          {
            type: 'input',
            name: 'token',
            message: 'Enter your GitLab token:',
            validate: input => input.trim() !== '' || 'Token cannot be empty',
          },
        ]);

        gitlabService.updateToken(token);
        logger.success('GitLab token configured.');

        // Test the connection
        logger.info('Testing GitLab API connection...');
        const isConnected = await gitlabService.testConnection();

        if (!isConnected) {
          logger.error(
            'Could not connect to GitLab with the provided token. Please check your configuration.'
          );

          const { configGitlab } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'configGitlab',
              message: 'Would you like to configure GitLab URL?',
              default: true,
            },
          ]);

          if (configGitlab) {
            const { baseUrl } = await inquirer.prompt([
              {
                type: 'input',
                name: 'baseUrl',
                message: 'Enter your GitLab URL (e.g., https://gitlab.com):',
                validate: input => input.trim() !== '' || 'URL cannot be empty',
              },
            ]);

            gitlabService.updateBaseUrl(baseUrl);
            logger.success('GitLab URL configured.');
          } else {
            logger.warn('Operation canceled. Please configure GitLab correctly before continuing.');
            return;
          }
        }
      } else {
        logger.warn('Operation canceled. Please configure GitLab correctly before continuing.');
        return;
      }
    }

    // Ask for merge request URL
    const { mergeRequestUrl } = await inquirer.prompt([
      {
        type: 'input',
        name: 'mergeRequestUrl',
        message: 'Enter GitLab merge request URL:',
        validate: input => {
          if (input.trim() === '') return 'URL cannot be empty';
          if (!input.includes('merge_requests')) {
            return 'Invalid GitLab merge request URL. Format: https://gitlab.com/path/to/project/-/merge_requests/ID';
          }
          return true;
        },
      },
    ]);

    // Parse the URL
    const parsedUrl = gitlabService.parseMergeRequestUrl(mergeRequestUrl);
    if (!parsedUrl) {
      logger.error('Failed to parse merge request URL.');
      return;
    }

    logger.info(`Fetching project info for ${parsedUrl.projectPath}...`);

    // Get project ID
    const projectId = await gitlabService.getProjectId(parsedUrl.projectPath);
    if (!projectId) {
      logger.error(`Failed to get project ID for ${parsedUrl.projectPath}.`);
      return;
    }

    logger.success(`Found project ID: ${projectId}`);

    // Get merge request details
    const detailsSpinner = ora(
      `Fetching merge request details for MR #${parsedUrl.mergeRequestIid}...`
    ).start();

    const mergeRequestDetails = await gitlabService.getMergeRequest(
      projectId,
      parsedUrl.mergeRequestIid
    );
    if (!mergeRequestDetails) {
      detailsSpinner.fail(
        `Failed to get merge request details for MR #${parsedUrl.mergeRequestIid}`
      );
      return;
    }

    detailsSpinner.succeed(`Found merge request: ${mergeRequestDetails.title}`);

    const sourceBranch = mergeRequestDetails.source_branch;
    logger.info(`Source branch: ${sourceBranch}`);

    // Get merge request changes
    const changesSpinner = ora(
      parsedUrl.commitId 
        ? `Fetching changes for commit ${parsedUrl.commitId.substring(0, 8)}...`
        : `Fetching changes for MR #${parsedUrl.mergeRequestIid}...`
    ).start();

    const changes = await gitlabService.getMergeRequestChanges(
      projectId,
      parsedUrl.mergeRequestIid,
      parsedUrl.commitId
    );

    if (!changes || changes.length === 0) {
      changesSpinner.fail('No changes found in this merge request.');
      return;
    }

    // Get supported extensions from config
    const supportedExtensions = config.get('supportedExtensions', [
      '.php',
      '.js',
      '.jsx',
      '.ts',
      '.tsx',
      '.py',
    ]);

    // Filter changes to only include supported file types
    const supportedChanges = filterSupportedChanges(changes, supportedExtensions);
    if (supportedChanges.length === 0) {
      changesSpinner.fail(
        `No supported file types found. Supported extensions: ${supportedExtensions.join(', ')}`
      );

      // Ask if user wants to customize supported extensions
      const { customizeExtensions } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'customizeExtensions',
          message: 'Would you like to customize the supported file extensions?',
          default: true,
        },
      ]);

      if (customizeExtensions) {
        await customizeFileExtensions(supportedExtensions);
        // Re-filter with new extensions
        const reFilteredChanges = filterSupportedChanges(changes, supportedExtensions);
        if (reFilteredChanges.length === 0) {
          logger.error(
            `Still no supported files found with extensions: ${supportedExtensions.join(', ')}`
          );
          return;
        }
        changesSpinner.text = `Found ${reFilteredChanges.length} files with changes after filtering.`;
        changesSpinner.succeed();
      } else {
        return;
      }
    } else {
      changesSpinner.succeed(
        `Found ${supportedChanges.length} files with changes (from total ${changes.length} changed files).`
      );
    }

    // Process changes to extract the information we need and fetch complete file content
    const processSpinner = ora(`Processing changes and fetching complete file content...`).start();

    const processedChanges = await processChanges(
      supportedChanges, 
      projectId, 
      parsedUrl.commitId || sourceBranch
    );

    processSpinner.succeed(`Processed ${processedChanges.length} files.`);

    // Create the merge request object
    // Include commit ID in the filename if specific commit is selected
    const mergeRequestId = parsedUrl.commitId 
      ? `mr_${parsedUrl.projectPath.replace(/\//g, '_')}_${parsedUrl.mergeRequestIid}_${parsedUrl.commitId.substring(0, 8)}`
      : `mr_${parsedUrl.projectPath.replace(/\//g, '_')}_${parsedUrl.mergeRequestIid}`;

    const mergeRequestData = {
      id: mergeRequestId,
      url: mergeRequestUrl,
      projectId: projectId,
      projectPath: parsedUrl.projectPath,
      mergeRequestIid: parsedUrl.mergeRequestIid,
      commitId: parsedUrl.commitId,
      sourceBranch: sourceBranch,
      targetBranch: mergeRequestDetails.target_branch,
      title: mergeRequestDetails.title,
      description: mergeRequestDetails.description,
      author: mergeRequestDetails.author
        ? {
            name: mergeRequestDetails.author.name,
            username: mergeRequestDetails.author.username,
          }
        : null,
      webUrl: mergeRequestDetails.web_url,
      changes: processedChanges,
      supportedExtensions: supportedExtensions,
      totalChangedFiles: changes.length,
      supportedChangedFiles: processedChanges.length,
    };

    const mergeRequest = new MergeRequest(mergeRequestData);
    await mergeRequest.save();

    logger.success(`\nMerge request data processed and saved successfully!`);
    if (parsedUrl.commitId) {
      logger.info(`Specific commit: ${parsedUrl.commitId.substring(0, 8)}`);
    }
    logger.info(`Total files changed: ${changes.length}`);
    logger.info(`Supported files processed: ${processedChanges.length}`);

    // Ask if user wants to generate a review now
    const { reviewNow } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'reviewNow',
        message: 'Would you like to generate a code review for this merge request now?',
        default: true,
      },
    ]);

    if (reviewNow) {
      const generateReview = require('./generateReview');
      await generateReview(mergeRequestId);
    }

    return mergeRequest;
  } catch (error) {
    logger.error('Error fetching merge request:', error);
  }
}

/**
 * Filter changes to only include supported file types
 * @param {Array} changes - Array of changes from GitLab API
 * @param {Array} supportedExtensions - Array of supported file extensions
 * @returns {Array} - Filtered changes
 */
function filterSupportedChanges(changes, supportedExtensions) {
  return changes.filter(change => {
    const fileExt = path.extname(change.new_path || change.old_path);
    return supportedExtensions.includes(fileExt.toLowerCase());
  });
}

/**
 * Process changes to create a structured object for each change
 * @param {Array} changes - Array of filtered changes
 * @param {number} projectId - Project ID for fetching complete file content
 * @param {string} sourceBranch - Source branch of the merge request
 * @returns {Promise<Array>} - Processed changes with structured information
 */
async function processChanges(changes, projectId, sourceBranch) {
  const processedChanges = [];

  for (const change of changes) {
    const changeType = change.new_file ? 'added' : change.deleted_file ? 'deleted' : 'modified';

    // Safely extract content from diff
    let oldContent = null;
    let newContent = null;
    let fullFileContent = null;

    if (change.diff) {
      // If it's an addition, there's only new content
      if (changeType === 'added') {
        newContent = change.diff;
        // For new files, get the complete content from the source branch
        if (change.new_path) {
          fullFileContent = await gitlabService.getFileContent(
            projectId,
            change.new_path,
            sourceBranch
          );
        }
      }
      // If it's a deletion, there's only old content
      else if (changeType === 'deleted') {
        oldContent = change.diff;
      }
      // If it's a modification, we need the complete file content for context
      else {
        try {
          oldContent = change.old_path ? change.diff : null;
          newContent = change.new_path ? change.diff : null;

          // Get the complete file content from the source branch
          if (change.new_path) {
            fullFileContent = await gitlabService.getFileContent(
              projectId,
              change.new_path,
              sourceBranch
            );
          }
        } catch (error) {
          logger.warn(
            `Could not process diff for ${change.new_path || change.old_path}: ${error.message}`
          );
        }
      }
    }

    processedChanges.push({
      path: change.new_path || change.old_path,
      type: changeType,
      oldContent: oldContent,
      newContent: newContent,
      diff: change.diff,
      fullFileContent: fullFileContent,
    });
  }

  return processedChanges;
}

/**
 * Let the user customize the supported file extensions
 * @param {Array} supportedExtensions - Current supported extensions
 */
async function customizeFileExtensions(supportedExtensions) {
  const { newExtensions } = await inquirer.prompt([
    {
      type: 'input',
      name: 'newExtensions',
      message: 'Enter comma-separated list of file extensions to include (e.g., .php,.js,.ts):',
      default: supportedExtensions.join(','),
      validate: input => {
        if (input.trim() === '') return 'Please enter at least one extension';
        if (!input.split(',').every(ext => ext.trim().startsWith('.'))) {
          return 'Each extension must start with a dot (.)';
        }
        return true;
      },
    },
  ]);

  // Update supported extensions
  supportedExtensions.length = 0;
  supportedExtensions.push(...newExtensions.split(',').map(ext => ext.trim().toLowerCase()));

  // Save to config
  config.set('supportedExtensions', supportedExtensions);

  logger.info(`Updated supported extensions: ${supportedExtensions.join(', ')}`);
}

module.exports = fetchMergeRequests;
