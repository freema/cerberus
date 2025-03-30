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
 * Handle code review sub-menu - delegates to CodeReviewMenuController
 */
async function handleCodeReviewMenu() {
  // Delegate to the controller implementation for consistency
  const menuController = require('../../controllers/menuController');
  const codeReviewMenuController = new (require('../../controllers/CodeReviewMenuController'))();
  await codeReviewMenuController.handleMenu();
}

module.exports = registerCommands;
module.exports.handleCodeReviewMenu = handleCodeReviewMenu;
