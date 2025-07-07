#!/usr/bin/env node

const { program } = require('commander');
const { displayBanner } = require('../src/cli/index');
const projectCommands = require('../src/commands/project');
const menuController = require('../src/controllers/menuController');
const logger = require('../src/utils/logger');
const config = require('../src/utils/config');
const { clearTerminal } = require('../src/utils/terminal');

// Global options
program
  .name('cerberus')
  .description('CLI tool for preparing files and projects for Claude AI')
  .version('1.0.0')
  .option('-d, --debug', 'Enable debug mode')
  .option('-c, --config', 'Show current configuration')
  .option('-n, --no-clear', 'Do not clear terminal on startup')
  .hook('preAction', (thisCommand, actionCommand) => {
    // Set debug mode if flag is provided
    if (thisCommand.opts().debug) {
      logger.setDebugMode(true);
      config.setDebugMode(true);
      logger.debug('Debug mode enabled');
    }
  });

// Process options
program.parse(process.argv);
const options = program.opts();

// Clear the terminal screen (unless --no-clear is provided)
if (options.clear !== false) {
  clearTerminal();
}

// Display banner
displayBanner();

// Register commands
projectCommands(program);

// Configuration command
program
  .command('configure')
  .description('Configure Cerberus settings')
  .action(menuController.configureSettings);

// If --config flag is set, show configuration
if (options.config) {
  menuController.showConfiguration();
}

// Always start the interactive menu FIRST, regardless of arguments
// Only parse arguments if the user specifically requests to bypass the menu system
const shouldParseArgs = process.argv.includes('--no-interactive');

if (shouldParseArgs) {
  program.parse(process.argv);
} else {
  const fs = require('fs');
  const path = require('path');
  const configPath = path.join(__dirname, '../config/default.json');

  async function runInitialSetup() {
    console.log("Welcome to Cerberus! Let's set up your configuration.");

    // First ask if the user wants to configure or skip
    const inquirer = require('inquirer');
    const { setupChoice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'setupChoice',
        message: 'Do you want to configure API keys now or skip?',
        choices: [
          { name: 'Configure now', value: 'configure' },
          { name: 'Skip configuration (some features may not work)', value: 'skip' },
        ],
      },
    ]);

    if (setupChoice === 'skip') {
      console.log(
        '\nConfiguration skipped. You can configure later using the Configure option in the main menu.'
      );
      return false;
    }

    // Setup Claude API
    console.log('\n=== Claude AI Configuration ===');
    const { claudeApiKey } = await inquirer.prompt([
      {
        type: 'password',
        name: 'claudeApiKey',
        message: 'Enter your Claude API key (or leave empty to skip):',
      },
    ]);

    const { claudeModel } = await inquirer.prompt([
      {
        type: 'list',
        name: 'claudeModel',
        message: 'Select Claude model:',
        choices: [
          { name: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
          { name: 'Claude 3 Sonnet', value: 'claude-3-sonnet-20240229' },
          { name: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307' },
        ],
        default: 'claude-3-sonnet-20240229',
      },
    ]);

    // Update configuration
    const aiServiceProvider = require('../src/services/AIServiceFactory');
    const claudeAdapter = aiServiceProvider.getAdapter('claude');

    if (claudeApiKey.trim() !== '') {
      claudeAdapter.updateApiKey(claudeApiKey);
    }

    claudeAdapter.updateConfig({ model: claudeModel });

    console.log('\nConfiguration saved successfully!');

    return true;
  }

  // Start the interactive CLI
  (async () => {
    try {
      // Check if this is first run by looking for a config file
      const configFileExists = fs.existsSync(configPath);

      if (!configFileExists) {
        // First time running the app, offer setup
        await runInitialSetup();
      } else {
        // Check if we have API keys, but don't force setup
        try {
          const claudeApiKey = config.getClaudeApiKey();

          if (!claudeApiKey) {
            console.log(
              'Claude API key is missing. You can configure it later from the main menu.'
            );
          }
        } catch (err) {
          // Config exists but might be corrupted - don't interrupt the flow
          console.log('Note: Some configuration may be missing or invalid.');
        }
      }

      // Always start the interactive menu, even with missing configuration
      await menuController.startInteractiveMenu();
    } catch (error) {
      console.error('Failed to start Cerberus:', error);
      process.exit(1);
    }
  })();
}
