/**
 * Project Menu Controller - handles project-related menus
 */
const { projectPrompts } = require('../cli/prompts');
const i18n = require('../utils/i18n');

class ProjectMenuController {
  /**
   * Get extended project menu choices with combined existing/update option
   * @returns {Array} Extended choices array
   */
  getExtendedProjectChoices() {
    return [
      { name: i18n.t('menu.project.new'), value: 'new' },
      { name: i18n.t('menu.project.existingOrUpdate'), value: 'existingOrUpdate' }, // Combined option
      { name: i18n.t('menu.project.collect'), value: 'collect' },
      { name: i18n.t('menu.project.analyze'), value: 'analyze' },
      { name: '📦 Create bundle for Claude', value: 'bundle' },
    ];
  }

  /**
   * Handle project sub-menu
   */
  async handleMenu() {
    while (true) {
      // Get extended choices with combined existing/update option
      const extendedChoices = this.getExtendedProjectChoices();
      const choice = await projectPrompts.projectChoice(extendedChoices);

      switch (choice) {
        case 'new':
          const createProject = require('../commands/project/createProject');
          await createProject();
          break;
        case 'existingOrUpdate':
          // Show submenu for working with existing projects
          await this.handleExistingProjectSubmenu();
          break;
        case 'collect':
          const collectFiles = require('../commands/project/collectFiles');
          await collectFiles();
          break;
        case 'analyze':
          const analyzeProject = require('../commands/project/analyzeProject');
          await analyzeProject();
          break;
        case 'bundle':
          const createBundle = require('../commands/project/createBundle');
          await createBundle();
          break;
        case 'back':
          // Return to main menu
          return;
      }
    }
  }

  /**
   * Handle submenu for existing project operations
   */
  async handleExistingProjectSubmenu() {
    const inquirer = require('inquirer');
    const logger = require('../utils/logger');
    const Project = require('../models/Project');

    try {
      const existingProjects = await Project.listAll();

      if (existingProjects.length === 0) {
        logger.warn('No projects found. Please create a new project first.');

        const { createNew } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'createNew',
            message: 'Would you like to create a new project?',
            default: true,
          },
        ]);

        if (createNew) {
          const createProject = require('../commands/project/createProject');
          await createProject();
        }

        return;
      }

      // Prompt user to select a project
      const { selectedProject } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedProject',
          message: 'Select a project:',
          choices: [...existingProjects, { name: '⬅️ Go back', value: 'back' }],
        },
      ]);

      if (selectedProject === 'back') {
        return;
      }

      // Show options for the selected project
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: `What would you like to do with project "${selectedProject}"?`,
          choices: [
            { name: '📂 Open project', value: 'open' },
            { name: '🔄 Update files from original sources', value: 'update' },
            { name: '📥 Collect more files', value: 'collect' },
            { name: '🔎 Analyze project (generate Claude instructions)', value: 'analyze' },
            { name: '📦 Create bundle for Claude Projects', value: 'bundle' },
            { name: '⬅️ Go back', value: 'back' },
          ],
        },
      ]);

      switch (action) {
        case 'open':
          const openProject = require('../commands/project/openProject');
          await openProject(selectedProject);
          break;
        case 'update':
          const updateFiles = require('../commands/project/updateFiles');
          await updateFiles(selectedProject);
          break;
        case 'collect':
          const collectFiles = require('../commands/project/collectFiles');
          await collectFiles(selectedProject);
          break;
        case 'analyze':
          const analyzeProject = require('../commands/project/analyzeProject');
          await analyzeProject(selectedProject);
          break;
        case 'bundle':
          const createBundle = require('../commands/project/createBundle');
          await createBundle(selectedProject);
          break;
        case 'back':
          // Just return to the previous menu
          return;
      }
    } catch (error) {
      logger.error('Error handling existing project submenu:', error);
    }
  }
}

module.exports = ProjectMenuController;
