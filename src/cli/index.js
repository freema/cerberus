const chalk = require('chalk');
const figlet = require('figlet');
const inquirer = require('inquirer');

/**
 * Displays the application banner
 */
function displayBanner() {
  console.log(chalk.red(`
   ██████╗███████╗██████╗ ██████╗ ███████╗██████╗ ██╗   ██╗███████╗
  ██╔════╝██╔════╝██╔══██╗██╔══██╗██╔════╝██╔══██╗██║   ██║██╔════╝
  ██║     █████╗  ██████╔╝██████╔╝█████╗  ██████╔╝██║   ██║███████╗
  ██║     ██╔══╝  ██╔══██╗██╔══██╗██╔══╝  ██╔══██╗██║   ██║╚════██║
  ╚██████╗███████╗██║  ██║██████╔╝███████╗██║  ██║╚██████╔╝███████║
   ╚═════╝╚══════╝╚═╝  ╚═╝╚═════╝ ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝
  `));
}

/**
 * Creates a main menu prompt
 * @returns {Promise<string>} User's choice
 */
async function mainMenu() {
  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: 'What would you like to do?',
      choices: [
        { name: 'Collect and prepare project files for Claude AI', value: 'project' },
        { name: 'Work with GitLab code reviews', value: 'codeReview' },
        { name: 'Configure settings', value: 'configure' },
        { name: 'Exit', value: 'exit' }
      ]
    }
  ]);
  
  // We'll handle 'configure' in the main app flow instead
  // of executing it directly here
  
  return choice;
}

/**
 * Creates a back option for menus
 * @param {Array} choices - List of menu choices
 * @returns {Array} Choices with back option
 */
function withBackOption(choices) {
  return [...choices, { name: 'Go back', value: 'back' }];
}

module.exports = {
  displayBanner,
  mainMenu,
  withBackOption
};