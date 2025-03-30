/**
 * Code Review Menu Controller - handles code review menus
 */
const { codeReviewPrompts } = require('../cli/prompts');

class CodeReviewMenuController {
  /**
   * Handle code review sub-menu
   */
  async handleMenu() {
    while (true) {
      const choice = await codeReviewPrompts.codeReviewChoice();

      switch (choice) {
        case 'fetch':
          const fetchMergeRequests = require('../commands/codeReview/fetchMergeRequests');
          await fetchMergeRequests();
          break;
        case 'review':
          const analyzeMergeRequest = require('../commands/codeReview/analyzeMergeRequest');
          await analyzeMergeRequest();
          break;
        case 'generate':
          const generateReview = require('../commands/codeReview/generateReview');
          await generateReview();
          break;
        case 'back':
          // Return to main menu
          return;
      }
    }
  }
}

module.exports = CodeReviewMenuController;
