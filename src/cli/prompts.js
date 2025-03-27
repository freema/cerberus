const inquirer = require('inquirer');
const { withBackOption } = require('./index');

/**
 * Project related prompts
 */
const projectPrompts = {
  /**
   * Prompt for project choice (new/existing)
   * @returns {Promise<Object>} User's choice
   */
  async projectChoice() {
    const i18n = require('../utils/i18n');
    
    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: i18n.t('menu.project.title'),
        choices: withBackOption([
          { name: i18n.t('menu.project.new'), value: 'new' },
          { name: i18n.t('menu.project.existing'), value: 'existing' },
          { name: i18n.t('menu.project.collect'), value: 'collect' },
          { name: i18n.t('menu.project.analyze'), value: 'analyze' }
        ])
      }
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
        validate: input => input.length > 0 ? true : 'Project name cannot be empty'
      }
    ]);
    
    return name;
  },
  
  /**
   * Prompt for project path
   * @returns {Promise<Object>} Project path
   */
  async projectPath() {
    const { path } = await inquirer.prompt([
      {
        type: 'input',
        name: 'path',
        message: 'Enter path to project files:',
        validate: input => input.length > 0 ? true : 'Path cannot be empty'
      }
    ]);
    
    return path;
  }
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
          { name: i18n.t('menu.codeReview.generate'), value: 'generate' }
        ])
      }
    ]);
    
    return choice;
  }
};

module.exports = {
  projectPrompts,
  codeReviewPrompts
};