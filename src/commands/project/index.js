const { mainMenu } = require('../../cli');
const createProject = require('./createProject');
const openProject = require('./openProject');
const collectFiles = require('./collectFiles');
const analyzeProject = require('./analyzeProject');
const updateFiles = require('./updateFiles');

/**
 * Register project commands
 * @param {Object} program - Commander program instance
 */
function registerCommands(program) {
  const projectCommand = program
    .command('project')
    .description('Project management commands for Claude AI preparation')
    .action(async () => {
      const choice = await mainMenu();
      
      switch (choice) {
        case 'project':
          await handleProjectMenu();
          break;
        case 'codeReview':
          program.commands.find(cmd => cmd.name() === 'codeReview').action();
          break;
        case 'exit':
          process.exit(0);
          break;
      }
    });

  projectCommand
    .command('create')
    .description('Create a new project')
    .action(createProject);

  projectCommand
    .command('open')
    .description('Open an existing project')
    .action(openProject);

  projectCommand
    .command('collect')
    .description('Collect files for a project')
    .action(collectFiles);

  projectCommand
    .command('analyze')
    .description('Analyze a project to improve Claude instructions')
    .action(analyzeProject);
    
  projectCommand
    .command('update')
    .description('Update project files from original sources')
    .action(updateFiles);

  return program;
}

/**
 * Handle project sub-menu
 */
async function handleProjectMenu() {
  const inquirer = require('inquirer');
  const { projectPrompts } = require('../../cli/prompts');
  const config = require('../../utils/config');

  while (true) {
    // Get new extended choices with update option
    const extendedChoices = await getExtendedProjectChoices();
    const choice = await projectPrompts.projectChoice(extendedChoices);
    
    switch (choice) {
      case 'new':
        await createProject();
        break;
      case 'existing':
        await openProject();
        break;
      case 'collect':
        await collectFiles();
        break;
      case 'analyze':
        await analyzeProject();
        break;
      case 'update':
        await updateFiles();
        break;
      case 'back':
        // Return to main menu
        return;
    }
  }
}

/**
 * Get extended project menu choices including the update option
 * @returns {Promise<Array>} Extended choices array
 */
async function getExtendedProjectChoices() {
  const i18n = require('../../utils/i18n');
  
  return [
    { name: i18n.t('menu.project.new'), value: 'new' },
    { name: i18n.t('menu.project.existing'), value: 'existing' },
    { name: i18n.t('menu.project.collect'), value: 'collect' },
    { name: i18n.t('menu.project.analyze'), value: 'analyze' },
    { name: i18n.t('menu.project.update') || 'Update project files', value: 'update' }
  ];
}

module.exports = registerCommands;
module.exports.handleProjectMenu = handleProjectMenu;