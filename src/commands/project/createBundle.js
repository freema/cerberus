/**
 * Create Bundle Command - Creates file bundles for Claude Projects
 */
const inquirer = require('inquirer');
const chalk = require('chalk');
const path = require('path');
const CommandBase = require('../CommandBase');
const Project = require('../../models/Project');
const bundleCreator = require('../../utils/bundleCreator');
const clipboard = require('../../utils/clipboard');
const logger = require('../../utils/logger');
const UIHelper = require('../../utils/UIHelper');

class CreateBundleCommand extends CommandBase {
  constructor() {
    super('createBundle', 'Create file bundles for Claude Projects');
  }

  /**
   * Execute the create bundle command
   * @param {string|null} projectName - Optional project name
   */
  async execute(projectName = null) {
    try {
      logger.info('\n🔗 Creating file bundles for Claude Projects...\n');

      // Select project
      const project = projectName ? 
        await Project.load(projectName) : 
        await this.selectProject();

      if (!project) {
        logger.warn('No project selected.');
        return;
      }

      // Check if project has files
      const projectFiles = await bundleCreator.getProjectFiles(project.getProjectPath());
      if (projectFiles.length === 0) {
        logger.warn(`Project "${project.name}" contains no files to bundle.`);
        
        const { collectFiles } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'collectFiles',
            message: 'Would you like to collect files for this project first?',
            default: true,
          },
        ]);

        if (collectFiles) {
          const collectFilesCommand = require('./collectFiles');
          await collectFilesCommand(project.name);
          // Reload project files after collection
          const updatedFiles = await bundleCreator.getProjectFiles(project.getProjectPath());
          if (updatedFiles.length === 0) {
            logger.warn('No files were collected. Bundle creation cancelled.');
            return;
          }
        } else {
          return;
        }
      }

      // Show project summary
      await this.showProjectSummary(project, projectFiles);

      // Select bundle type
      const bundleType = await this.selectBundleType();

      // Create bundles based on type
      let bundleResult;
      switch (bundleType) {
        case 'single':
          bundleResult = await this.createSingleBundle(project);
          break;
        case 'multiple':
          bundleResult = await this.createMultipleBundles(project);
          break;
        case 'custom':
          bundleResult = await this.createCustomBundle(project, projectFiles);
          break;
        default:
          logger.error('Invalid bundle type selected');
          return;
      }

      // Save bundles
      const savedFiles = await bundleCreator.saveBundles(project, bundleResult);

      // Show success message and instructions
      await this.showSuccessMessage(project, bundleResult, savedFiles);

    } catch (error) {
      logger.error('Error creating bundles:', error);
      throw error;
    }
  }

  /**
   * Show project summary with file information
   * @param {Object} project - Project instance
   * @param {Array} projectFiles - Array of project files
   */
  async showProjectSummary(project, projectFiles) {
    logger.info(`📁 Project: ${chalk.cyan(project.name)}`);
    logger.info(`📄 Files found: ${chalk.green(projectFiles.length)}`);
    
    const totalSize = projectFiles.reduce((sum, file) => sum + file.size, 0);
    logger.info(`📊 Total size: ${chalk.yellow(this.formatFileSize(totalSize))}`);

    // Show file type breakdown
    const fileTypes = {};
    projectFiles.forEach(file => {
      const ext = path.extname(file.originalPath).toLowerCase() || '.txt';
      fileTypes[ext] = (fileTypes[ext] || 0) + 1;
    });

    logger.info('\n📋 File types:');
    Object.entries(fileTypes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10) // Show top 10 file types
      .forEach(([ext, count]) => {
        logger.info(`  ${ext}: ${count} files`);
      });

    if (Object.keys(fileTypes).length > 10) {
      logger.info(`  ... and ${Object.keys(fileTypes).length - 10} more types`);
    }

    logger.info('');
  }

  /**
   * Select bundle creation type
   * @returns {Promise<string>} - Selected bundle type
   */
  async selectBundleType() {
    const { bundleType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'bundleType',
        message: 'How would you like to create the bundles?',
        choices: [
          {
            name: '📦 Single bundle - All files in one bundle (recommended for small projects)',
            value: 'single'
          },
          {
            name: '📚 Multiple bundles - Split into multiple bundles (recommended for large projects)',
            value: 'multiple'
          },
          {
            name: '🎯 Custom bundle - Select specific files to include',
            value: 'custom'
          },
          {
            name: '🔙 Back to project menu',
            value: 'back'
          }
        ]
      }
    ]);

    if (bundleType === 'back') {
      throw new Error('Bundle creation cancelled by user');
    }

    return bundleType;
  }

  /**
   * Create single bundle
   * @param {Object} project - Project instance
   * @returns {Promise<Object>} - Bundle result
   */
  async createSingleBundle(project) {
    logger.info('Creating single bundle...');
    
    const result = await bundleCreator.createSingleBundle(project);
    
    const bundleSize = result.totalSize;
    const sizeMB = bundleSize / (1024 * 1024);
    
    if (sizeMB > 5) {
      logger.warn(`⚠️  Bundle size is ${sizeMB.toFixed(1)}MB - this may be large for Claude Projects`);
      
      const { proceed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'proceed',
          message: 'Do you want to proceed with this large bundle?',
          default: false,
        },
      ]);

      if (!proceed) {
        logger.info('Consider using multiple bundles instead.');
        throw new Error('Bundle creation cancelled due to size');
      }
    }

    return result;
  }

  /**
   * Create multiple bundles
   * @param {Object} project - Project instance
   * @returns {Promise<Object>} - Bundle result
   */
  async createMultipleBundles(project) {
    // Get user preference for max files per bundle
    const { maxFiles } = await inquirer.prompt([
      {
        type: 'number',
        name: 'maxFiles',
        message: 'Maximum files per bundle:',
        default: 50,
        validate: (input) => {
          if (input < 1) return 'Must be at least 1';
          if (input > 200) return 'Maximum 200 files per bundle recommended';
          return true;
        }
      }
    ]);

    logger.info(`Creating multiple bundles with max ${maxFiles} files each...`);
    
    const result = await bundleCreator.createMultipleBundles(project, maxFiles);
    
    logger.info(`✅ Created ${result.bundles.length} bundles`);
    
    return result;
  }

  /**
   * Create custom bundle with selected files
   * @param {Object} project - Project instance
   * @param {Array} projectFiles - Available project files
   * @returns {Promise<Object>} - Bundle result
   */
  async createCustomBundle(project, projectFiles) {
    logger.info('\n📋 Select files to include in the bundle:\n');

    // Create choices for file selection
    const fileChoices = projectFiles.map(file => ({
      name: `${file.originalPath} (${this.formatFileSize(file.size)})`,
      value: file.originalPath,
      checked: false
    }));

    const { selectedFiles } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedFiles',
        message: 'Select files to include:',
        choices: fileChoices,
        pageSize: 15,
        validate: (input) => {
          if (input.length === 0) return 'Please select at least one file';
          return true;
        }
      }
    ]);

    logger.info(`Creating custom bundle with ${selectedFiles.length} selected files...`);
    
    return await bundleCreator.createCustomBundle(project, selectedFiles);
  }

  /**
   * Show success message and usage instructions
   * @param {Object} project - Project instance
   * @param {Object} bundleResult - Bundle creation result
   * @param {Array} savedFiles - Array of saved file paths
   */
  async showSuccessMessage(project, bundleResult, savedFiles) {
    logger.success('\n🎉 Bundles created successfully!\n');

    // Show bundle information
    logger.info('📦 Created bundles:');
    bundleResult.bundles.forEach((bundle, index) => {
      logger.info(`  ${index + 1}. ${bundle.filename} - ${this.formatFileSize(bundle.size)} (${bundle.fileCount} files)`);
    });

    logger.info(`\n📍 Bundle location: ${chalk.cyan(path.dirname(savedFiles[0]))}`);
    logger.info(`📋 System message: ${chalk.cyan(path.basename(savedFiles[savedFiles.length - 1]))}`);

    // Show usage instructions
    logger.info('\n📚 How to use these bundles in Claude Projects:\n');
    logger.info('1. Open Claude.ai and create a new Project');
    logger.info('2. Upload ALL bundle files (.md files) to your project');
    logger.info('3. Copy the system message to your project instructions');
    logger.info('4. Start chatting about your code!');

    // Offer to copy system message
    const systemMessagePath = savedFiles[savedFiles.length - 1];
    const { copyToClipboard } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'copyToClipboard',
        message: 'Copy the system message to clipboard?',
        default: true,
      },
    ]);

    if (copyToClipboard) {
      try {
        const fs = require('fs-extra');
        const systemMessage = await fs.readFile(systemMessagePath, 'utf8');
        await clipboard.writeText(systemMessage);
        logger.success('✅ System message copied to clipboard!');
      } catch (error) {
        logger.warn('Failed to copy to clipboard:', error.message);
        logger.info(`📄 System message file: ${systemMessagePath}`);
      }
    }

    // Show tips
    logger.info('\n💡 Tips:');
    logger.info('• Each bundle contains complete file contents with syntax highlighting');
    logger.info('• Files are marked with their original paths for easy reference');
    logger.info('• Claude will understand the project structure automatically');
    if (bundleResult.bundles.length > 1) {
      logger.info(`• Upload ALL ${bundleResult.bundles.length} bundles for complete project context`);
    }

    logger.info(`\n🔗 Ready to use ${bundleResult.totalFiles} files in Claude Projects!`);
  }

  /**
   * Format file size for display
   * @param {number} bytes - Size in bytes
   * @returns {string} - Formatted size string
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

/**
 * Export the command as a function for backward compatibility
 */
module.exports = async function createBundle(projectName = null) {
  const command = new CreateBundleCommand();
  return await command.execute(projectName);
};