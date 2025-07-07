const { mainMenu } = require('../../cli');
const createProject = require('./createProject');
const openProject = require('./openProject');
const collectFiles = require('./collectFiles');
const analyzeProject = require('./analyzeProject');
const updateFiles = require('./updateFiles');
const createBundle = require('./createBundle');

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

  projectCommand
    .command('bundle')
    .description('Create file bundles for Claude Projects')
    .action(createBundle);

  return program;
}

/**
 * Handle project sub-menu - delegates to ProjectMenuController
 */
async function handleProjectMenu() {
  // Delegate to the controller implementation for consistency
  const menuController = require('../../controllers/menuController');
  const projectMenuController = new (require('../../controllers/ProjectMenuController'))();
  await projectMenuController.handleMenu();
}

module.exports = registerCommands;
module.exports.handleProjectMenu = handleProjectMenu;