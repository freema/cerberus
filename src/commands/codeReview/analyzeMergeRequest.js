const inquirer = require('inquirer');
const chalk = require('chalk');
const MergeRequest = require('../../models/MergeRequest');
const logger = require('../../utils/logger');

/**
 * Analyze a fetched merge request
 * @param {string} [mergeRequestId] - Optional merge request ID
 */
async function analyzeMergeRequest(mergeRequestId) {
  logger.info('=== Analyze Merge Request ===');

  try {
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
          message: 'Select a merge request to analyze:',
          choices: mergeRequests,
        },
      ]);

      mergeRequestId = selectedMergeRequest;
    }

    // Load the merge request
    const mergeRequest = await MergeRequest.load(mergeRequestId);

    // Display merge request details
    displayMergeRequestDetails(mergeRequest);

    // Ask what action to take
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do with this merge request?',
        choices: [
          { name: 'List changed files', value: 'listFiles' },
          { name: 'Show file details', value: 'showFile' },
          { name: 'Generate code review', value: 'review' },
          { name: 'Go back', value: 'back' },
        ],
      },
    ]);

    switch (action) {
      case 'listFiles':
        listChangedFiles(mergeRequest);
        break;
      case 'showFile':
        await showFileDetails(mergeRequest);
        break;
      case 'review':
        const generateReview = require('./generateReview');
        await generateReview(mergeRequestId);
        break;
      case 'back':
        return;
    }

    return mergeRequest;
  } catch (error) {
    logger.error('Error analyzing merge request:', error);
  }
}

/**
 * Display merge request details
 * @param {MergeRequest} mergeRequest - Merge request to display
 */
function displayMergeRequestDetails(mergeRequest) {
  console.log(chalk.cyan('\n=== Merge Request Details ==='));
  console.log(chalk.white(`Title: ${chalk.yellow(mergeRequest.title)}`));
  console.log(chalk.white(`Project: ${chalk.yellow(mergeRequest.projectPath)}`));
  console.log(chalk.white(`MR #: ${chalk.yellow(mergeRequest.mergeRequestIid)}`));
  console.log(chalk.white(`Author: ${chalk.yellow(mergeRequest.author?.name || 'Unknown')}`));
  console.log(chalk.white(`Source Branch: ${chalk.yellow(mergeRequest.sourceBranch)}`));
  console.log(chalk.white(`Target Branch: ${chalk.yellow(mergeRequest.targetBranch)}`));
  console.log(chalk.white(`Total Files Changed: ${chalk.yellow(mergeRequest.totalChangedFiles)}`));
  console.log(
    chalk.white(`Supported Files Processed: ${chalk.yellow(mergeRequest.supportedChangedFiles)}`)
  );

  if (mergeRequest.description) {
    console.log(chalk.cyan('\nDescription:'));
    console.log(
      chalk.gray(
        mergeRequest.description.substring(0, 500) +
          (mergeRequest.description.length > 500 ? '...' : '')
      )
    );
  }

  if (mergeRequest.review) {
    console.log(chalk.cyan('\nAI Review Available: ') + chalk.green('✓'));
  }

  console.log(''); // Add a blank line for better readability
}

/**
 * List all changed files in the merge request
 * @param {MergeRequest} mergeRequest - Merge request to list files from
 */
function listChangedFiles(mergeRequest) {
  console.log(chalk.cyan('\n=== Changed Files ==='));

  // Group by change type
  const addedFiles = mergeRequest.changes.filter(change => change.type === 'added');
  const modifiedFiles = mergeRequest.changes.filter(change => change.type === 'modified');
  const deletedFiles = mergeRequest.changes.filter(change => change.type === 'deleted');

  if (addedFiles.length > 0) {
    console.log(chalk.green('\nAdded Files:'));
    addedFiles.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file.path}`);
    });
  }

  if (modifiedFiles.length > 0) {
    console.log(chalk.blue('\nModified Files:'));
    modifiedFiles.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file.path}`);
    });
  }

  if (deletedFiles.length > 0) {
    console.log(chalk.red('\nDeleted Files:'));
    deletedFiles.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file.path}`);
    });
  }

  console.log(''); // Add a blank line for better readability
}

/**
 * Show details of a specific file
 * @param {MergeRequest} mergeRequest - Merge request containing the file
 */
async function showFileDetails(mergeRequest) {
  if (mergeRequest.changes.length === 0) {
    logger.warn('No files to display.');
    return;
  }

  // Prepare choices for file selection
  const fileChoices = mergeRequest.changes.map((change, index) => ({
    name: `${change.type} - ${change.path}`,
    value: index,
  }));

  const { fileIndex } = await inquirer.prompt([
    {
      type: 'list',
      name: 'fileIndex',
      message: 'Select a file to view:',
      choices: [...fileChoices, { name: 'Go back', value: -1 }],
    },
  ]);

  if (fileIndex === -1) {
    return;
  }

  const selectedFile = mergeRequest.changes[fileIndex];

  console.log(chalk.cyan(`\n=== File: ${selectedFile.path} (${selectedFile.type}) ===`));

  if (selectedFile.diff) {
    console.log(chalk.yellow('\nDiff:'));
    console.log(selectedFile.diff);
  }

  if (selectedFile.fullFileContent) {
    const { showFullContent } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'showFullContent',
        message: 'Would you like to see the full file content?',
        default: false,
      },
    ]);

    if (showFullContent) {
      console.log(chalk.yellow('\nFull File Content:'));
      console.log(selectedFile.fullFileContent);
    }
  }

  console.log(''); // Add a blank line for better readability
}

module.exports = analyzeMergeRequest;
