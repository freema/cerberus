const { mainMenu } = require('../../cli');
const fetchMergeRequests = require('./fetchMergeRequests');
const analyzeMergeRequest = require('./analyzeMergeRequest');
const generateReview = require('./generateReview');
const logger = require('../../utils/logger');

/**
 * Register code review commands
 * @param {Object} program - Commander program instance
 */
function registerCommands(program) {
  const codeReviewCommand = program
    .command('codeReview')
    .description('Code review commands for GitLab merge requests')
    .action(async () => {
      const choice = await mainMenu();
      
      switch (choice) {
        case 'project':
          program.commands.find(cmd => cmd.name() === 'project').action();
          break;
        case 'codeReview':
          await handleCodeReviewMenu();
          break;
        case 'exit':
          process.exit(0);
          break;
      }
    });

  codeReviewCommand
    .command('fetch')
    .description('Fetch GitLab merge requests')
    .action(fetchMergeRequests);

  codeReviewCommand
    .command('analyze')
    .description('Analyze fetched merge request')
    .action(analyzeMergeRequest);

  codeReviewCommand
    .command('review')
    .description('Generate AI review for a merge request')
    .action(generateReview);

  return program;
}

/**
 * Handle code review sub-menu
 */
async function handleCodeReviewMenu() {
  const inquirer = require('inquirer');
  const { codeReviewPrompts } = require('../../cli/prompts');
  const config = require('../../utils/config');

  while (true) {
    const choice = await codeReviewPrompts.codeReviewChoice();
    
    // Feature-specific requirements will be checked inside each function
    // This allows the menu to be displayed without blocking access
    
    // Now proceed with the actual commands
    switch (choice) {
      case 'fetch':
        await fetchMergeRequests();
        break;
      case 'review':
        await analyzeMergeRequest();
        break;
      case 'generate':
        await generateReview();
        break;
      case 'back':
        // Return to main menu
        return;
    }
  }
}

module.exports = registerCommands;
module.exports.handleCodeReviewMenu = handleCodeReviewMenu;