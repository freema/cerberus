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
    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: 'Project options:',
        choices: withBackOption([
          { name: 'Create a new project', value: 'new' },
          { name: 'Work with existing project', value: 'existing' },
          { name: 'Collect project files', value: 'collect' },
          { name: 'Analyze project', value: 'analyze' }
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
    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: 'Code review options:',
        choices: withBackOption([
          { name: 'Fetch merge requests', value: 'fetch' },
          { name: 'Analyze merge request', value: 'review' },
          { name: 'Generate AI review', value: 'generate' }
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