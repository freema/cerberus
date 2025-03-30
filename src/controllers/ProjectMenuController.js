/**
 * Project Menu Controller - handles project-related menus
 */
const { projectPrompts } = require('../cli/prompts');

class ProjectMenuController {
  /**
   * Handle project sub-menu
   */
  async handleMenu() {
    while (true) {
      const choice = await projectPrompts.projectChoice();

      switch (choice) {
        case 'new':
          const createProject = require('../commands/project/createProject');
          await createProject();
          break;
        case 'existing':
          const openProject = require('../commands/project/openProject');
          await openProject();
          break;
        case 'collect':
          const collectFiles = require('../commands/project/collectFiles');
          await collectFiles();
          break;
        case 'analyze':
          const analyzeProject = require('../commands/project/analyzeProject');
          await analyzeProject();
          break;
        case 'back':
          // Return to main menu
          return;
      }
    }
  }
}

module.exports = ProjectMenuController;
