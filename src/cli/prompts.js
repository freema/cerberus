const inquirer = require('inquirer');
const { withBackOption } = require('./index');

/**
 * Project related prompts
 */
const projectPrompts = {
  /**
   * Prompt for project choice (new/existing)
   * @param {Array} [customChoices] - Optional custom choices array
   * @returns {Promise<Object>} User's choice
   */
  async projectChoice(customChoices) {
    const i18n = require('../utils/i18n');

    // Use custom choices if provided, otherwise use default choices
    const choices = customChoices || [
      { name: i18n.t('menu.project.new'), value: 'new' },
      { name: i18n.t('menu.project.existing'), value: 'existing' },
      { name: i18n.t('menu.project.collect'), value: 'collect' },
      { name: i18n.t('menu.project.analyze'), value: 'analyze' },
    ];

    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: i18n.t('menu.project.title'),
        choices: withBackOption(choices),
      },
    ]);

    return choice;
  },

  /**
   * Prompt for project name
   * @returns {Promise<Object>} Project name
   */
  async projectName() {
    const { name } = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Enter project name:',
        validate: input => (input.length > 0 ? true : 'Project name cannot be empty'),
      },
    ]);

    return name;
  },

  /**
   * Prompt for project path
   * @returns {Promise<Object|null>} Project path or null if canceled
   */
  async projectPath() {
    const { path } = await inquirer.prompt([
      {
        type: 'input',
        name: 'path',
        message: 'Enter path to project files (leave empty to cancel):',
      },
    ]);

    if (!path || path.trim() === '') {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Do you want to cancel this action?',
          default: true,
        },
      ]);

      if (confirm) {
        return null;
      } else {
        return this.projectPath(); // Ask again if user doesn't want to cancel
      }
    }

    return path;
  },
};

/**
 * Code review related prompts
 */
const codeReviewPrompts = {
  /**
   * Prompt for code review choice
   * @returns {Promise<Object>} User's choice
   */
  async codeReviewChoice() {
    const i18n = require('../utils/i18n');

    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: i18n.t('menu.codeReview.title'),
        choices: withBackOption([
          { name: i18n.t('menu.codeReview.fetch'), value: 'fetch' },
          { name: i18n.t('menu.codeReview.review'), value: 'review' },
          { name: i18n.t('menu.codeReview.generate'), value: 'generate' },
        ]),
      },
    ]);

    return choice;
  },
};

/**
 * Jira related prompts
 */
const jiraPrompts = {
  /**
   * Prompt for Jira choice
   * @returns {Promise<Object>} User's choice
   */
  async jiraChoice() {
    const i18n = require('../utils/i18n');

    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: i18n.t('menu.jira.title'),
        choices: withBackOption([
          { name: i18n.t('menu.jira.fetch'), value: 'fetch' },
          { name: i18n.t('menu.jira.analyze'), value: 'analyze' },
          { name: i18n.t('menu.jira.create'), value: 'create' },
        ]),
      },
    ]);

    return choice;
  },
};

module.exports = {
  projectPrompts,
  codeReviewPrompts,
  jiraPrompts,
};
