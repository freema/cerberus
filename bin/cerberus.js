#!/usr/bin/env node

const { program } = require('commander');
const { displayBanner } = require('../src/cli/index');
const projectCommands = require('../src/commands/project');
const codeReviewCommands = require('../src/commands/codeReview');
const logger = require('../src/utils/logger');
const config = require('../src/utils/config');

// Global options
program
  .name('cerberus')
  .description('CLI tool for GitLab code review and Claude AI project preparation')
  .version('1.0.0')
  .option('-d, --debug', 'Enable debug mode')
  .option('-c, --config', 'Show current configuration')
  .hook('preAction', (thisCommand, actionCommand) => {
    // Set debug mode if flag is provided
    if (thisCommand.opts().debug) {
      logger.setDebugMode(true);
      config.setDebugMode(true);
      logger.debug('Debug mode enabled');
    }
  });

// Display banner
displayBanner();

// Register commands
projectCommands(program);
codeReviewCommands(program);

// Configuration command
program
  .command('configure')
  .description('Configure Cerberus settings')
  .action(async () => {
    const inquirer = require('inquirer');
    
    const { configType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'configType',
        message: 'What would you like to configure?',
        choices: [
          { name: 'GitLab Settings', value: 'gitlab' },
          { name: 'Claude AI Settings', value: 'claude' },
          { name: 'Debug Mode', value: 'debug' },
          { name: 'Show Current Configuration', value: 'show' },
          { name: 'Back', value: 'back' }
        ]
      }
    ]);
    
    switch (configType) {
      case 'gitlab':
        await configureGitlab();
        break;
      case 'claude':
        await configureClaude();
        break;
      case 'debug':
        await configureDebug();
        break;
      case 'show':
        showConfiguration();
        break;
      case 'back':
        return;
    }
  });

/**
 * Configure GitLab settings
 */
async function configureGitlab() {
  const inquirer = require('inquirer');
  const gitlabService = require('../src/services/gitlabService');
  
  const gitlabConfig = config.getGitlabConfig();
  const currentToken = config.getGitlabToken();
  
  console.log('\n=== GitLab Configuration ===');
  
  // Check if GitLab token is missing and show warning
  if (!currentToken) {
    console.log('⚠️  WARNING: GitLab API token is not configured. Some features may not work properly.\n');
  }
  
  while (true) {
    const { configOption } = await inquirer.prompt([
      {
        type: 'list',
        name: 'configOption',
        message: 'What would you like to configure?',
        choices: [
          { name: 'GitLab API URL', value: 'url' },
          { name: 'GitLab API Token', value: 'token' },
          { name: 'Test Connection', value: 'test' },
          { name: 'Back', value: 'back' }
        ]
      }
    ]);
    
    switch (configOption) {
      case 'url':
        const { baseUrl } = await inquirer.prompt([
          {
            type: 'input',
            name: 'baseUrl',
            message: 'Enter GitLab API URL:',
            default: gitlabConfig.baseUrl,
            validate: input => input.trim() !== '' || 'URL cannot be empty'
          }
        ]);
        
        gitlabService.updateBaseUrl(baseUrl);
        console.log('GitLab API URL updated.');
        break;
      
      case 'token':
        const { token } = await inquirer.prompt([
          {
            type: 'password',
            name: 'token',
            message: 'Enter GitLab API token:',
            default: currentToken || '',
            validate: input => input.trim() !== '' || 'Token cannot be empty'
          }
        ]);
        
        gitlabService.updateToken(token);
        console.log('GitLab API token updated.');
        break;
      
      case 'test':
        console.log('Testing GitLab API connection...');
        const isConnected = await gitlabService.testConnection();
        
        if (isConnected) {
          console.log('Successfully connected to GitLab API!');
        } else {
          console.log('Failed to connect to GitLab API. Please check your configuration.');
        }
        break;
      
      case 'back':
        return;
    }
  }
}

/**
 * Configure Claude AI settings
 */
async function configureClaude() {
  const inquirer = require('inquirer');
  const claudeService = require('../src/services/claudeService');
  
  const claudeConfig = config.getClaudeConfig();
  const currentApiKey = config.getClaudeApiKey();
  
  console.log('\n=== Claude AI Configuration ===');
  
  // Check if Claude API key is missing and show warning
  if (!currentApiKey) {
    console.log('⚠️  WARNING: Claude API key is not configured. AI features will not work properly.\n');
  }
  
  while (true) {
    const { configOption } = await inquirer.prompt([
      {
        type: 'list',
        name: 'configOption',
        message: 'What would you like to configure?',
        choices: [
          { name: 'Claude API Key', value: 'apiKey' },
          { name: 'Claude Model', value: 'model' },
          { name: 'Max Tokens', value: 'maxTokens' },
          { name: 'Test Connection', value: 'test' },
          { name: 'Back', value: 'back' }
        ]
      }
    ]);
    
    switch (configOption) {
      case 'apiKey':
        const { apiKey } = await inquirer.prompt([
          {
            type: 'password',
            name: 'apiKey',
            message: 'Enter Claude API key:',
            default: currentApiKey || '',
            validate: input => input.trim() !== '' || 'API key cannot be empty'
          }
        ]);
        
        claudeService.updateApiKey(apiKey);
        console.log('Claude API key updated.');
        break;
      
      case 'model':
        const { model } = await inquirer.prompt([
          {
            type: 'list',
            name: 'model',
            message: 'Select Claude model:',
            choices: [
              { name: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
              { name: 'Claude 3 Sonnet', value: 'claude-3-sonnet-20240229' },
              { name: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307' }
            ],
            default: claudeConfig.model
          }
        ]);
        
        claudeService.updateConfig({ model });
        console.log(`Claude model updated to ${model}.`);
        break;
      
      case 'maxTokens':
        const { maxTokens } = await inquirer.prompt([
          {
            type: 'number',
            name: 'maxTokens',
            message: 'Enter maximum output tokens:',
            default: claudeConfig.maxTokens,
            validate: input => input > 0 || 'Max tokens must be a positive number'
          }
        ]);
        
        claudeService.updateConfig({ maxTokens });
        console.log(`Max tokens updated to ${maxTokens}.`);
        break;
      
      case 'test':
        console.log('Testing Claude API connection...');
        const isConnected = await claudeService.testConnection();
        
        if (isConnected) {
          console.log('Successfully connected to Claude API!');
        } else {
          console.log('Failed to connect to Claude API. Please check your configuration.');
        }
        break;
      
      case 'back':
        return;
    }
  }
}

/**
 * Configure debug mode
 */
async function configureDebug() {
  const inquirer = require('inquirer');
  
  const debugEnabled = config.isDebugMode();
  
  console.log('\n=== Debug Configuration ===');
  
  const { enableDebug } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'enableDebug',
      message: 'Enable debug mode?',
      default: debugEnabled
    }
  ]);
  
  config.setDebugMode(enableDebug);
  logger.setDebugMode(enableDebug);
  
  console.log(`Debug mode ${enableDebug ? 'enabled' : 'disabled'}.`);
}

/**
 * Show current configuration
 */
function showConfiguration() {
  const gitlabConfig = config.getGitlabConfig();
  const claudeConfig = config.getClaudeConfig();
  const debugEnabled = config.isDebugMode();
  const gitlabToken = config.getGitlabToken();
  const claudeApiKey = config.getClaudeApiKey();
  
  console.log('\n=== Current Configuration ===');
  console.log('');
  console.log('Debug Mode: ' + (debugEnabled ? 'Enabled' : 'Disabled'));
  console.log('');
  console.log('GitLab Configuration:');
  console.log('  API URL: ' + gitlabConfig.baseUrl);
  console.log('  API Token: ' + (gitlabToken ? '********' : 'Not configured ⚠️'));
  console.log('');
  console.log('Claude Configuration:');
  console.log('  Model: ' + claudeConfig.model);
  console.log('  Max Tokens: ' + claudeConfig.maxTokens);
  console.log('  API Key: ' + (claudeApiKey ? '********' : 'Not configured ⚠️'));
  console.log('');

  // Show warning if keys are missing
  if (!gitlabToken || !claudeApiKey) {
    console.log('⚠️  WARNING: Some API keys are not configured:');
    if (!gitlabToken) console.log('  - GitLab API token is missing');
    if (!claudeApiKey) console.log('  - Claude API key is missing');
    console.log('\nYou can configure these using the appropriate options in the configure menu.');
    console.log('');
  }
}

// If --config flag is set, show configuration
if (program.opts().config) {
  showConfiguration();
}

// Always start the interactive menu FIRST, regardless of arguments
// Only parse arguments if the user specifically requests to bypass the menu system
const shouldParseArgs = process.argv.includes('--no-interactive');

if (shouldParseArgs) {
  program.parse(process.argv);
} else {
  const { mainMenu, displayBanner } = require('../src/cli/index');
  const inquirer = require('inquirer');
  const fs = require('fs');
  const path = require('path');
  const configPath = path.join(__dirname, '../config/default.json');
  
  async function runInitialSetup() {
    console.log('Welcome to Cerberus! Let\'s set up your configuration.');
    
    // First ask if the user wants to configure or skip
    const { setupChoice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'setupChoice',
        message: 'Do you want to configure API keys now or skip?',
        choices: [
          { name: 'Configure now', value: 'configure' },
          { name: 'Skip configuration (some features may not work)', value: 'skip' }
        ]
      }
    ]);
    
    if (setupChoice === 'skip') {
      console.log('\nConfiguration skipped. You can configure later using the Configure option in the main menu.');
      return false;
    }
    
    // Setup GitLab
    console.log('\n=== GitLab Configuration ===');
    const { gitlabUrl } = await inquirer.prompt([
      {
        type: 'input',
        name: 'gitlabUrl',
        message: 'Enter your GitLab API URL (or leave empty to skip):',
        default: 'https://gitlab.com/api/v4'
      }
    ]);
    
    const { gitlabToken } = await inquirer.prompt([
      {
        type: 'password',
        name: 'gitlabToken',
        message: 'Enter your GitLab API token (or leave empty to skip):',
      }
    ]);
    
    // Setup Claude API
    console.log('\n=== Claude AI Configuration ===');
    const { claudeApiKey } = await inquirer.prompt([
      {
        type: 'password',
        name: 'claudeApiKey',
        message: 'Enter your Claude API key (or leave empty to skip):',
      }
    ]);
    
    const { claudeModel } = await inquirer.prompt([
      {
        type: 'list',
        name: 'claudeModel',
        message: 'Select Claude model:',
        choices: [
          { name: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
          { name: 'Claude 3 Sonnet', value: 'claude-3-sonnet-20240229' },
          { name: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307' }
        ],
        default: 'claude-3-sonnet-20240229'
      }
    ]);
    
    // Update configuration
    const gitlabService = require('../src/services/gitlabService');
    const claudeService = require('../src/services/claudeService');
    
    if (gitlabUrl.trim() !== '') {
      gitlabService.updateBaseUrl(gitlabUrl);
    }
    
    if (gitlabToken.trim() !== '') {
      gitlabService.updateToken(gitlabToken);
    }
    
    if (claudeApiKey.trim() !== '') {
      claudeService.updateApiKey(claudeApiKey);
    }
    
    claudeService.updateConfig({ model: claudeModel });
    
    console.log('\nConfiguration saved successfully!');
    
    return true;
  }
  
  // This function is no longer needed, we check directly in the main function
  
  async function startInteractiveMenu() {
    try {
      while (true) {
        const choice = await mainMenu();
        
        // Check required configurations for each feature
        if (choice === 'project') {
          const claudeApiKey = config.getClaudeApiKey();
          
          if (!claudeApiKey) {
            console.log('\n⚠️  WARNING: Claude AI API key is not configured!');
            console.log('This feature requires Claude AI for some functionality.');
            
            const { action } = await inquirer.prompt([
              {
                type: 'list',
                name: 'action',
                message: 'What would you like to do?',
                choices: [
                  { name: 'Configure Claude AI', value: 'configure' },
                  { name: 'Continue to Project menu', value: 'continue' },
                  { name: 'Go back to main menu', value: 'back' }
                ]
              }
            ]);
            
            if (action === 'configure') {
              await configureClaude();
              continue;
            } else if (action === 'back') {
              continue;
            }
            // If 'continue', proceed to project menu
          }
          
          // Import and run the project command
          const program = require('commander').program;
          const projectCommand = program.commands.find(cmd => cmd.name() === 'project');
          if (projectCommand) {
            await projectCommand.action();
          } else {
            console.error('Project command not found');
          }
        } 
        else if (choice === 'codeReview') {
          const gitlabToken = config.getGitlabToken();
          const claudeApiKey = config.getClaudeApiKey();
          
          if (!gitlabToken || !claudeApiKey) {
            console.log('\n⚠️  WARNING: Required API keys are not configured!');
            if (!gitlabToken) console.log('- GitLab API token is missing');
            if (!claudeApiKey) console.log('- Claude AI API key is missing');
            console.log('The code review functionality requires these API keys.');
            
            const { action } = await inquirer.prompt([
              {
                type: 'list',
                name: 'action',
                message: 'What would you like to do?',
                choices: [
                  { name: 'Configure API keys', value: 'configure' },
                  { name: 'Continue to Code Review menu anyway', value: 'continue' },
                  { name: 'Go back to main menu', value: 'back' }
                ]
              }
            ]);
            
            if (action === 'configure') {
              await configureSettings();
              continue;
            } else if (action === 'back') {
              continue;
            }
            // If 'continue', proceed to code review menu
          }
          
          // Import and run the code review command
          const program = require('commander').program;
          const codeReviewCommand = program.commands.find(cmd => cmd.name() === 'codeReview');
          if (codeReviewCommand) {
            await codeReviewCommand.action();
          } else {
            console.error('Code Review command not found');
          }
        }
        else if (choice === 'configure') {
          await configureSettings();
        }
        else if (choice === 'exit') {
          console.log('Goodbye!');
          process.exit(0);
        }
      }
    } catch (error) {
      console.error('An error occurred:', error);
      process.exit(1);
    }
  }
  
  async function configureSettings() {
    // Check for missing configuration and show warning
    const gitlabToken = config.getGitlabToken();
    const claudeApiKey = config.getClaudeApiKey();
    
    if (!gitlabToken || !claudeApiKey) {
      console.log('\n⚠️  WARNING: Some API keys are not configured:');
      if (!gitlabToken) console.log('  - GitLab API token is missing');
      if (!claudeApiKey) console.log('  - Claude API key is missing');
      console.log('');
    }
    
    while (true) {
      const { configType } = await inquirer.prompt([
        {
          type: 'list',
          name: 'configType',
          message: 'What would you like to configure?',
          choices: [
            { name: 'GitLab Settings', value: 'gitlab' },
            { name: 'Claude AI Settings', value: 'claude' },
            { name: 'Debug Mode', value: 'debug' },
            { name: 'Show Current Configuration', value: 'show' },
            { name: 'Back to Main Menu', value: 'back' }
          ]
        }
      ]);
      
      switch (configType) {
        case 'gitlab':
          await configureGitlab();
          break;
        case 'claude':
          await configureClaude();
          break;
        case 'debug':
          await configureDebug();
          break;
        case 'show':
          showConfiguration();
          break;
        case 'back':
          return;
      }
    }
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
          const gitlabToken = config.getGitlabToken();
          const claudeApiKey = config.getClaudeApiKey();
          
          if (!gitlabToken || !claudeApiKey) {
            console.log('Some API keys are missing. You can configure them later from the main menu.');
          }
        } catch (err) {
          // Config exists but might be corrupted - don't interrupt the flow
          console.log('Note: Some configuration may be missing or invalid.');
        }
      }
      
      // Always start the interactive menu, even with missing configuration
      await startInteractiveMenu();
    } catch (error) {
      console.error('Failed to start Cerberus:', error);
      process.exit(1);
    }
  })();
}