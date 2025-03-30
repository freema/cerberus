/**
 * Project Menu Controller - handles project-related menus
 */
const { projectPrompts } = require('../cli/prompts');
const i18n = require('../utils/i18n');

class ProjectMenuController {
  /**
   * Get extended project menu choices including the update option
   * @returns {Array} Extended choices array
   */
  getExtendedProjectChoices() {
    return [
      { name: i18n.t('menu.project.new'), value: 'new' },
      { name: i18n.t('menu.project.existing'), value: 'existing' },
      { name: i18n.t('menu.project.collect'), value: 'collect' },
      { name: i18n.t('menu.project.analyze'), value: 'analyze' },
      { name: i18n.t('menu.project.update') || 'Update project files', value: 'update' }
    ];
  }

  /**
   * Handle project sub-menu
   */
  async handleMenu() {
    while (true) {
      // Get extended choices with update option
      const extendedChoices = this.getExtendedProjectChoices();
      const choice = await projectPrompts.projectChoice(extendedChoices);

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
        case 'update':
          const updateFiles = require('../commands/project/updateFiles');
          await updateFiles();
          break;
        case 'back':
          // Return to main menu
          return;
      }
    }
  }
}

module.exports = ProjectMenuController;
