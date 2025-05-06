/**
 * Jira Menu Controller - handles Jira-related menu operations
 */
const inquirer = require('inquirer');
const logger = require('../utils/logger');
const UIHelper = require('../utils/UIHelper');
const { withBackOption } = require('../cli');
const jiraCommands = require('../commands/jira');

class JiraMenuController {
  constructor() {
    this.uiHelper = UIHelper;
  }

  /**
   * Handle Jira menu
   */
  async handleMenu() {
    const i18n = require('../utils/i18n');
    const JiraService = require('../services/JiraService');

    if (!JiraService.isConfigured()) {
      logger.warn('⚠️  Jira API token is not configured.');
      const configure = await this.uiHelper.confirm('Would you like to configure Jira API now?');
      
      if (configure) {
        const ApiConfigService = require('../utils/ApiConfigService');
        await ApiConfigService.configureJira();
        // If configuration was cancelled or failed, return to main menu
        if (!JiraService.isConfigured()) {
          return;
        }
      } else {
        return;
      }
    }

    // Tato metoda heuristically detekuje jazyk pro menu podle textu hlavního menu
    const detectLanguage = () => {
      // Zkusíme několik metod pro detekci jazyka
      
      // Metoda 1: Použití i18n.getCurrentLocale()
      const configLocale = i18n.getCurrentLocale();
      if (configLocale === 'en') {
        return 'en';
      }
      
      // Metoda 2: Zkontrolujeme config.get('locale')
      const configService = require('../utils/config');
      const configValue = configService.get('locale');
      if (configValue === 'en') {
        return 'en';
      }
      
      // Metoda 3: Pro jistotu - zkusit přeložit string a podívat se, jestli je v angličtině
      const mainMenuProject = i18n.t('menu.main.project');
      if (mainMenuProject && 
          (mainMenuProject.includes('Collect and prepare') || 
           mainMenuProject.includes('projects')) &&
           !mainMenuProject.includes('projekt')) {
        return 'en';
      }
      
      // Výchozí návratová hodnota - čeština
      return 'cs';
    };
    
    while (true) {
      // Detekujeme jazyk s využitím několika metod
      const language = detectLanguage();
      const useEnglish = (language === 'en');
      
      // Pro debug - ukážeme detekovaný jazyk
      if (require('../utils/config').isDebugMode()) {
        logger.debug(`Final detected language: ${language}, using ${useEnglish ? 'English' : 'Czech'} translations`);
      }
      
      // Definice textů podle zjištěného jazyka
      const title = useEnglish ? 'Choose a Jira action:' : 'Vyberte akci pro Jira:';
      const analyzeTaskText = useEnglish ? 'Analyze Jira task' : 'Analyzovat Jira úkol';
      const fetchTasksText = useEnglish ? 'Fetch multiple tasks' : 'Načíst více úkolů';
      
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: title,
          choices: withBackOption([
            { 
              name: analyzeTaskText, 
              value: 'analyzeTask' 
            },
            { 
              name: fetchTasksText, 
              value: 'fetchTasks' 
            }
          ])
        }
      ]);

      if (action === 'back') {
        return;
      }

      switch (action) {
        case 'analyzeTask':
          await this.handleAnalyzeTask();
          break;
        case 'fetchTasks':
          await this.handleFetchTasks();
          break;
      }
    }
  }

  /**
   * Handle analyzing a single Jira task
   */
  async handleAnalyzeTask() {
    const i18n = require('../utils/i18n');
    
    const { taskUrl } = await inquirer.prompt([
      {
        type: 'input',
        name: 'taskUrl',
        message: i18n.t('jira.taskUrlPrompt') || 'Enter Jira task URL (e.g. https://your-domain.atlassian.net/browse/PROJECT-123):',
        validate: input => input.trim() !== '' || 'Task URL cannot be empty'
      }
    ]);

    logger.info('Analyzing Jira task...');
    const result = await jiraCommands.analyzeTask(taskUrl);

    if (result && result.success) {
      logger.success(`Successfully analyzed Jira task ${result.issueKey}`);
      logger.info(`Summary saved to: ${result.filePath}`);
      
      // Show a summary of what was fetched
      const summaryData = result.summary;
      logger.info(`\nTask: ${summaryData.key} - ${summaryData.summary}`);
      logger.info(`Status: ${summaryData.status}`);
      logger.info(`Type: ${summaryData.type || 'Neznámý'}`);
      logger.info(`Priority: ${summaryData.priority || 'Neznámá'}`);
      logger.info(`Assignee: ${summaryData.assignee || 'Nepřiřazen'}`);
      
      // Zobrazení počtů
      logger.info(`\nCelkové počty:`);
      logger.info(`Podúkoly: ${summaryData.counts?.subtasks || summaryData.subtasks.length}`);
      logger.info(`Propojené úkoly: ${summaryData.counts?.linkedIssues || summaryData.linkedIssues.length}`);
      logger.info(`Komentáře: ${summaryData.counts?.comments || summaryData.comments.length}`);
      
      // Zobrazení struktury
      if (summaryData.subtasks.length > 0) {
        logger.info(`\nPodúkoly:`);
        summaryData.subtasks.forEach(subtask => {
          logger.info(`  - ${subtask.key}: ${subtask.summary} (${subtask.status})`);
          if (subtask.linkedIssues && subtask.linkedIssues.length > 0) {
            logger.info(`    Propojené úkoly s podúkolem: ${subtask.linkedIssues.length}`);
          }
        });
      }
      
      if (summaryData.linkedIssues.length > 0) {
        logger.info(`\nPropojené úkoly (1. úroveň):`);
        summaryData.linkedIssues.forEach(issue => {
          logger.info(`  - ${issue.key}: ${issue.summary} (${issue.status || ''})`);
          if (issue.linkType) {
            logger.info(`    Typ vazby: ${issue.linkType} (${issue.linkDescription || ''})`);
          }
          
          const nestedCount = issue.linkedIssues ? issue.linkedIssues.length : 0;
          if (nestedCount > 0) {
            logger.info(`    Obsahuje další propojené úkoly: ${nestedCount}`);
          }
        });
      }
      
      logger.info(`\nJSON soubor obsahuje kompletní data včetně popisu, komentářů a dalších propojených úkolů.`);
    } else {
      logger.error('Failed to analyze Jira task. Please check your URL and credentials.');
    }
  }

  /**
   * Handle fetching multiple Jira tasks
   */
  async handleFetchTasks() {
    const i18n = require('../utils/i18n');
    
    const { jql } = await inquirer.prompt([
      {
        type: 'input',
        name: 'jql',
        message: i18n.t('jira.jqlPrompt') || 'Enter JQL query (e.g. project = PROJECT AND status = "In Progress"):',
        validate: input => input.trim() !== '' || 'JQL query cannot be empty'
      }
    ]);

    logger.info('This feature will be expanded in future versions.');
    logger.info('Currently only analyzing individual tasks is supported.');
  }
}

module.exports = JiraMenuController;