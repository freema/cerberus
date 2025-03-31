const chalk = require('chalk');
const figlet = require('figlet');
const inquirer = require('inquirer');
const logger = require('../utils/logger');

/**
 * Displays the application banner
 */
function displayBanner() {
  logger.info(
    chalk.red(`
   ██████╗███████╗██████╗ ██████╗ ███████╗██████╗ ██╗   ██╗███████╗
  ██╔════╝██╔════╝██╔══██╗██╔══██╗██╔════╝██╔══██╗██║   ██║██╔════╝
  ██║     █████╗  ██████╔╝██████╔╝█████╗  ██████╔╝██║   ██║███████╗
  ██║     ██╔══╝  ██╔══██╗██╔══██╗██╔══╝  ██╔══██╗██║   ██║╚════██║
  ╚██████╗███████╗██║  ██║██████╔╝███████╗██║  ██║╚██████╔╝███████║
   ╚═════╝╚══════╝╚═╝  ╚═╝╚═════╝ ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝
  `)
  );
}

/**
 * Creates a main menu prompt
 * @returns {Promise<string>} User's choice
 */
async function mainMenu() {
  const i18n = require('../utils/i18n');

  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: i18n.t('menu.main.title'),
      choices: [
        { name: i18n.t('menu.main.project'), value: 'project' },
        { name: i18n.t('menu.main.codeReview'), value: 'codeReview' },
        { name: i18n.t('menu.main.configure'), value: 'configure' },
        { name: i18n.t('menu.main.exit'), value: 'exit' },
      ],
    },
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
  const i18n = require('../utils/i18n');
  return [...choices, { name: i18n.t('common.goBack'), value: 'back' }];
}

module.exports = {
  displayBanner,
  mainMenu,
  withBackOption,
};
