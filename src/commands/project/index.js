const { mainMenu } = require('../../cli');
const createProject = require('./createProject');
const openProject = require('./openProject');
const collectFiles = require('./collectFiles');
const analyzeProject = require('./analyzeProject');
const logger = require('../../utils/logger');

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
    const choice = await projectPrompts.projectChoice();
    
    // We only check requirements at point of feature use, not pre-emptively
    // This allows users to use features that don't need certain credentials
    
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
      case 'back':
        // Return to main menu
        return;
    }
  }
}

module.exports = registerCommands;